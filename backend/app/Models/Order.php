<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'idempotency_key',
        'customer_id',
        'store_id',
        'branch_id',
        'zone_id',
        'customer_name',
        'customer_phone',
        'delivery_latitude',
        'delivery_longitude',
        'customer_notes',
        'items_total',
        'delivery_fee',
        'grand_total',
        'status',
        'rejection_reason',
        'payment_method',
    ];

    protected $casts = [
        'items_total' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'delivery_latitude' => 'float',
        'delivery_longitude' => 'float',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class);
    }
}
