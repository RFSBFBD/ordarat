<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiGeneratedImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'product_id',
        'normalized_name',
        'image_url',
        'is_illustrative',
        'status',
        'approved_by_user_id',
        'approved_at',
    ];

    protected $casts = [
        'is_illustrative' => 'boolean',
        'approved_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}
