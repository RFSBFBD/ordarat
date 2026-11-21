<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiStoreQuota extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'is_frozen',
        'freeze_reason',
        'custom_daily_quota',
        'custom_monthly_quota',
    ];

    protected $casts = [
        'is_frozen' => 'boolean',
        'custom_daily_quota' => 'integer',
        'custom_monthly_quota' => 'integer',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
