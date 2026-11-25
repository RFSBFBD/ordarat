<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchantApplication extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const TYPES = ['restaurant', 'grocery'];

    protected $fillable = [
        'user_id',
        'business_name',
        'type',
        'phone',
        'address',
        'latitude',
        'longitude',
        'has_branches',
        'area_name',
        'logo_data',
        'status',
        'admin_note',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $hidden = ['logo_data'];

    protected $casts = [
        'has_branches' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(MerchantApplicationBranch::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
