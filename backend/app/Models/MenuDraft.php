<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuDraft extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'source_image_url',
        'status',
        'items_count',
    ];

    protected $casts = [
        'items_count' => 'integer',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(MenuDraftItem::class);
    }
}
