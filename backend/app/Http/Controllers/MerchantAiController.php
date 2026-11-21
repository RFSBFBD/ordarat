<?php

namespace App\Http\Controllers;

use App\Models\AiGeneratedImage;
use App\Models\Category;
use App\Models\MenuDraft;
use App\Models\MenuDraftItem;
use App\Models\Product;
use App\Models\Store;
use App\Services\Ai\AiImageSecurityService;
use App\Services\Ai\AiManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MerchantAiController extends Controller
{
    public function __construct(
        protected AiManager $aiManager,
        protected AiImageSecurityService $imageSecurityService,
    ) {}

    /**
     * Upload & Extract Menu Draft from sanitized image.
     */
    public function extractMenu(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $tempPath = $request->file('image')->getRealPath();
        $fileName = 'menu_sanitized_'.time().'_'.uniqid().'.jpg';
        $destRelativePath = "menus/{$fileName}";
        $destFullPath = storage_path("app/public/{$destRelativePath}");

        if (! is_dir(dirname($destFullPath))) {
            mkdir(dirname($destFullPath), 0755, true);
        }

        // Clean & strip EXIF/GPS metadata
        $this->imageSecurityService->sanitizeAndStripExif($tempPath, $destFullPath);

        try {
            $ocrResult = $this->aiManager->extractMenuDraft($destFullPath, $store->id, $request->user()->id);

            // Create Menu Draft
            $draft = MenuDraft::create([
                'store_id' => $store->id,
                'source_image_url' => "/storage/{$destRelativePath}",
                'status' => 'draft',
                'items_count' => count($ocrResult['items'] ?? []),
            ]);

            foreach ($ocrResult['items'] as $itemData) {
                MenuDraftItem::create([
                    'menu_draft_id' => $draft->id,
                    'category_name' => $itemData['category_name'] ?? 'عام',
                    'name' => $itemData['name'] ?? 'صنف غير مسمى',
                    'price' => isset($itemData['price']) && is_numeric($itemData['price']) ? (float) $itemData['price'] : null,
                    'description' => $itemData['description'] ?? null,
                    'needs_review' => true,
                    'is_ambiguous' => (bool) ($itemData['is_ambiguous'] ?? false),
                    'ambiguity_reason' => $itemData['ambiguity_reason'] ?? null,
                    'status' => 'pending',
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'تم استخراج مسودة المنيو بنجاح. يرجى مراجعة كل صنف واعتماده قبل نشره.',
                'data' => $draft->load('items'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'AI_MENU_EXTRACTION_FAILED', 'message' => $e->getMessage()],
            ], 400);
        }
    }

    public function listMenuDrafts(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $drafts = MenuDraft::where('store_id', $store->id)
            ->with('items')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $drafts,
        ]);
    }

    public function updateDraftItem(Request $request, Store $store, MenuDraftItem $item): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($item->draft->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذا الصنف لا ينتمي لمتجرك'],
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'category_name' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'status' => 'sometimes|in:pending,accepted,rejected',
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'تم تعديل صنف المسودة',
            'data' => $item,
        ]);
    }

    /**
     * Import reviewed and accepted items from draft into store's actual catalog.
     */
    public function importDraft(Request $request, Store $store, MenuDraft $draft): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($draft->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه المسودة لا تتبع لمتجرك'],
            ], 403);
        }

        $acceptedItems = $draft->items()->where('status', 'accepted')->get();

        if ($acceptedItems->isEmpty()) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NO_ACCEPTED_ITEMS', 'message' => 'لا توجد أصناف مقبولة لاستيرادها. راجع المسودة واقبل الأصناف أولاً.'],
            ], 400);
        }

        $importedCount = 0;
        foreach ($acceptedItems as $draftItem) {
            // Find or create category
            $category = null;
            if (! empty($draftItem->category_name)) {
                $category = Category::firstOrCreate(
                    ['store_id' => $store->id, 'name' => $draftItem->category_name],
                    ['display_order' => 1]
                );
            }

            Product::create([
                'store_id' => $store->id,
                'category_id' => $category?->id,
                'name' => $draftItem->name,
                'price' => $draftItem->price ?? 0.00,
                'description' => $draftItem->description,
                'is_available' => true,
            ]);

            $importedCount++;
        }

        $draft->update(['status' => 'accepted']);

        return response()->json([
            'success' => true,
            'message' => "تم استيراد {$importedCount} صنفاً بنجاح إلى قائمة منتجات متجرك",
            'imported_count' => $importedCount,
        ]);
    }

    /**
     * Generate an illustrative product image for a store product.
     */
    public function generateProductImage(Request $request, Store $store): JsonResponse
    {
        Gate::authorize('update', $store);

        $validated = $request->validate([
            'product_name' => 'required|string|max:255',
            'category_name' => 'nullable|string|max:100',
            'product_id' => 'nullable|exists:products,id',
        ]);

        try {
            $result = $this->aiManager->generateProductImage(
                $validated['product_name'],
                $validated['category_name'] ?? null,
                $store->id,
                $request->user()->id
            );

            return response()->json([
                'success' => true,
                'message' => 'تم توليد الصورة التوضيحية بنجاح. يلزم تأكيدك لاعتمادها على المنتج.',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'AI_IMAGE_GENERATION_FAILED', 'message' => $e->getMessage()],
            ], 400);
        }
    }

    /**
     * Human confirmation / approval of generated image to attach to a product.
     */
    public function approveImage(Request $request, Store $store, AiGeneratedImage $image): JsonResponse
    {
        Gate::authorize('update', $store);

        if ($image->store_id !== $store->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'هذه الصورة لا تتبع لمتجرك'],
            ], 403);
        }

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $product = Product::where('store_id', $store->id)->findOrFail($validated['product_id']);

        $image->update([
            'product_id' => $product->id,
            'status' => 'approved',
            'approved_by_user_id' => $request->user()->id,
            'approved_at' => now('Africa/Cairo'),
        ]);

        $product->update([
            'image_url' => $image->image_url,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تمت الموافقة على الصورة وربطها بالمنتج بنجاح كصورة توضيحية',
            'data' => [
                'product_id' => $product->id,
                'image_url' => $image->image_url,
                'is_illustrative' => true,
            ],
        ]);
    }
}
