<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Zone;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutService
{
    // Approximate bounding box for Qena City
    protected const QENA_MIN_LAT = 26.05;

    protected const QENA_MAX_LAT = 26.30;

    protected const QENA_MIN_LON = 32.60;

    protected const QENA_MAX_LON = 32.85;

    /**
     * Preview calculation (Quote) for items total, zone delivery fee, and closest branch.
     * Does NOT create an order.
     */
    public function getQuote(
        int $storeId,
        array $items,
        float $latitude,
        float $longitude
    ): array {
        $this->validateQenaCoordinates($latitude, $longitude);

        $store = Store::where('id', $storeId)->where('is_active', true)->firstOrFail();
        if (! $store->is_accepting_orders) {
            throw new Exception('النشاط ده مقفول دلوقتي، جرّب بعدين');
        }

        $branch = $this->findClosestBranch($store, $latitude, $longitude);
        $zoneFee = $this->determineZoneFee($branch, $latitude, $longitude);

        $calculated = $this->calculateItemsTotal($store, $items);

        $itemsTotal = $calculated['items_total'];
        $grandTotal = bcadd($itemsTotal, $zoneFee['delivery_fee'], 2);

        return [
            'store_id' => $store->id,
            'store_name' => $store->name,
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'address' => $branch->address,
            ],
            'zone' => [
                'id' => $zoneFee['zone_id'],
                'name' => $zoneFee['zone_name'],
            ],
            'items_total' => $itemsTotal,
            'delivery_fee' => $zoneFee['delivery_fee'],
            'grand_total' => $grandTotal,
            'items' => $calculated['items'],
            'payment_method' => 'COD',
        ];
    }

    /**
     * Server-side checkout execution with transactional insertion and idempotency guard.
     */
    public function placeOrder(
        User $customer,
        int $storeId,
        array $items,
        float $latitude,
        float $longitude,
        string $phone,
        ?string $notes,
        string $idempotencyKey,
        ?string $customerName = null
    ): Order {
        // Idempotency check: if already processed for this user, return existing order
        $existing = Order::where('idempotency_key', $idempotencyKey)
            ->where('customer_id', $customer->id)
            ->with(['items', 'store', 'branch', 'statusHistory'])
            ->first();

        if ($existing) {
            return $existing;
        }

        $quote = $this->getQuote($storeId, $items, $latitude, $longitude);

        // A guest-turned-customer completes their data at order time:
        // whatever they confirmed in the checkout form lands in their profile.
        if (! $customer->hasCompleteProfile()) {
            $customer->update([
                'name' => $customerName ?: $customer->name,
                'phone' => $phone,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'profile_completed_at' => now(),
                'onboarding_state' => 'customer',
            ]);
        }

        return DB::transaction(function () use ($customer, $customerName, $storeId, $quote, $latitude, $longitude, $phone, $notes, $idempotencyKey) {
            $orderNumber = 'ORD-QNA-'.strtoupper(Str::random(6));

            $order = Order::create([
                'order_number' => $orderNumber,
                'idempotency_key' => $idempotencyKey,
                'customer_id' => $customer->id,
                'store_id' => $storeId,
                'branch_id' => $quote['branch']['id'],
                'zone_id' => $quote['zone']['id'],
                'customer_name' => $customerName ?: $customer->name,
                'customer_phone' => $phone,
                'delivery_latitude' => $latitude,
                'delivery_longitude' => $longitude,
                'customer_notes' => $notes,
                'items_total' => $quote['items_total'],
                'delivery_fee' => $quote['delivery_fee'],
                'grand_total' => $quote['grand_total'],
                'status' => 'new',
                'payment_method' => 'COD',
            ]);

            foreach ($quote['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'product_name' => $item['name'],
                    'unit_price' => $item['unit_price'],
                    'quantity' => $item['quantity'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            $order->statusHistory()->create([
                'changed_by_user_id' => $customer->id,
                'from_status' => null,
                'to_status' => 'new',
                'note' => 'تم إنشاء الطلب بنجاح عبر منصة أوردرات',
            ]);

            return $order->load(['items', 'store', 'branch', 'statusHistory']);
        });
    }

    public function validateQenaCoordinates(float $latitude, float $longitude): void
    {
        if (! self::isWithinQenaBounds($latitude, $longitude)) {
            throw new Exception('خدمة أوردرات متاحة فقط داخل نطاق مدينة قنا حالياً');
        }
    }

    /**
     * Shared Qena-city bounds check (checkout, customer onboarding and
     * merchant applications all enforce the same coverage area).
     */
    public static function isWithinQenaBounds(float $latitude, float $longitude): bool
    {
        return $latitude >= self::QENA_MIN_LAT && $latitude <= self::QENA_MAX_LAT
            && $longitude >= self::QENA_MIN_LON && $longitude <= self::QENA_MAX_LON;
    }

    /**
     * Finds the closest active branch currently accepting orders.
     * Distance: Approximate direct line distance (Haversine formula).
     * Tie-breaking rule: If two branches have equal distance (within 10m), the oldest branch (lowest ID) is selected.
     */
    protected function findClosestBranch(Store $store, float $lat, float $lon): Branch
    {
        $branches = $store->branches()
            ->where('is_active', true)
            ->where('is_accepting_orders', true)
            ->orderBy('id', 'asc') // Declared tie-breaking baseline: oldest branch first
            ->get();

        if ($branches->isEmpty()) {
            throw new Exception('النشاط ده مقفول دلوقتي، جرّب بعدين');
        }

        $closest = null;
        $minDist = PHP_FLOAT_MAX;

        foreach ($branches as $branch) {
            $branchLat = $branch->latitude ?? 26.1642;
            $branchLon = $branch->longitude ?? 32.7181;

            $dist = $this->haversineGreatCircleDistance($lat, $lon, $branchLat, $branchLon);

            // If strictly closer (by at least 10 meters / 0.01 km)
            if ($dist < ($minDist - 0.01)) {
                $minDist = $dist;
                $closest = $branch;
            } elseif (abs($dist - $minDist) <= 0.01 && $closest !== null) {
                // Tie-breaking: select the oldest branch by lowest ID
                if ($branch->id < $closest->id) {
                    $closest = $branch;
                }
            }
        }

        return $closest;
    }

    /**
     * Resolve which active zone a delivery location belongs to.
     *
     * Priority:
     *  1. A zone whose coverage circle (center + radius) contains the point;
     *     when several contain it, the nearest center wins.
     *  2. The nearest zone that has coordinates (customer just outside every radius).
     *  3. Legacy fallback: first active zone (zones created before coordinates existed).
     */
    protected function resolveZoneForLocation(float $lat, float $lon): ?Zone
    {
        $zones = Zone::where('is_active', true)->get();

        if ($zones->isEmpty()) {
            return null;
        }

        $geoZones = $zones->filter(
            fn (Zone $z) => $z->center_lat !== null && $z->center_lng !== null && $z->radius_km !== null
        );

        $distanceTo = fn (Zone $z) => $this->haversineGreatCircleDistance(
            $lat,
            $lon,
            (float) $z->center_lat,
            (float) $z->center_lng
        );

        $containing = $geoZones
            ->filter(fn (Zone $z) => $distanceTo($z) <= (float) $z->radius_km)
            ->sortBy($distanceTo)
            ->first();

        if ($containing) {
            return $containing;
        }

        if ($geoZones->isNotEmpty()) {
            return $geoZones->sortBy($distanceTo)->first();
        }

        return $zones->first();
    }

    protected function determineZoneFee(Branch $branch, float $lat, float $lon): array
    {
        // 1. Resolve the customer's zone from their actual coordinates
        $zone = $this->resolveZoneForLocation($lat, $lon);

        // 2. Lookup the store-owner-configured delivery fee for this branch & zone
        if ($zone) {
            $branchFee = $branch->zoneFees()->where('zone_id', $zone->id)->first();

            if ($branchFee) {
                if (! $branchFee->is_served) {
                    throw new Exception("هذا المتجر لا يوفر التوصيل حالياً إلى منطقة ({$zone->name})");
                }

                return [
                    'zone_id' => $zone->id,
                    'zone_name' => $zone->name,
                    'delivery_fee' => number_format((float) $branchFee->delivery_fee, 2, '.', ''),
                ];
            }
        }

        // 3. Fallback default fee if store owner hasn't configured custom zone pricing yet
        return [
            'zone_id' => $zone?->id,
            'zone_name' => $zone?->name ?? 'مدينة قنا (وسط البلد)',
            'delivery_fee' => '15.00',
        ];
    }

    protected function calculateItemsTotal(Store $store, array $items): array
    {
        if (empty($items)) {
            throw new Exception('السلة فارغة، يجب اختيار أصناف للطلب');
        }

        $calculatedItems = [];
        $itemsTotal = '0.00';

        foreach ($items as $itemData) {
            $productId = $itemData['product_id'] ?? null;
            $quantity = (int) ($itemData['quantity'] ?? 0);

            if ($quantity <= 0) {
                continue;
            }

            $product = Product::where('id', $productId)->where('store_id', $store->id)->first();
            if (! $product) {
                throw new Exception('أحد الأصناف المطلوبة غير تابع لهذا المتجر');
            }

            if (! $product->is_available) {
                throw new Exception("الصنف '{$product->name}' غير متاح للطلب حالياً (خلصان)");
            }

            $unitPrice = number_format((float) $product->price, 2, '.', '');
            $subtotal = bcmul($unitPrice, (string) $quantity, 2);
            $itemsTotal = bcadd($itemsTotal, $subtotal, 2);

            $calculatedItems[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'subtotal' => $subtotal,
            ];
        }

        if (empty($calculatedItems)) {
            throw new Exception('يجب أن تحتوي السلة على صنف واحد على الأقل بكمية صالحة');
        }

        return [
            'items_total' => $itemsTotal,
            'items' => $calculatedItems,
        ];
    }

    protected function haversineGreatCircleDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371; // Kilometers
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
