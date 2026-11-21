<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuDraftItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'menu_draft_id',
        'category_name',
        'name',
        'price',
        'description',
        'needs_review',
        'is_ambiguous',
        'ambiguity_reason',
        'status',
    ];

    protected $casts = [
        'price' => 'float',
        'needs_review' => 'boolean',
        'is_ambiguous' => 'boolean',
    ];

    public function draft(): BelongsTo
    {
        return $this->belongsTo(MenuDraft::class, 'menu_draft_id');
    }
}
