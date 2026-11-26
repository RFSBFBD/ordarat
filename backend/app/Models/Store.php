<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'image_url',
        'is_active',
        'is_accepting_orders',
        'working_hours',
        'logo_data',
        'subscription_starts_at',
        'subscription_ends_at',
        'commercial_register',
    ];

    protected $hidden = ['logo_data', 'commercial_register', 'subscription_starts_at', 'subscription_ends_at'];

    protected $appends = ['logo_url', 'subscription_active'];

    protected $casts = [
        'is_active' => 'boolean',
        'is_accepting_orders' => 'boolean',
        'working_hours' => 'array',
        'subscription_starts_at' => 'date:Y-m-d',
        'subscription_ends_at' => 'date:Y-m-d',
    ];

    /** Running subscription: started, and not past its end date (no end date = open ended). */
    public function hasActiveSubscription(): bool
    {
        $today = now()->startOfDay();
        $start = $this->subscription_starts_at;
        $end = $this->subscription_ends_at;

        return $start !== null
            && $start->startOfDay()->lte($today)
            && ($end === null || $end->copy()->endOfDay()->gte($today));
    }

    public function getSubscriptionActiveAttribute(): bool
    {
        return $this->hasActiveSubscription();
    }

    /** Public URL of the business logo: uploaded logo first, then any legacy image URL. */
    public function getLogoUrlAttribute(): ?string
    {
        if (! empty($this->attributes['logo_data'])) {
            return '/api/stores/'.$this->id.'/logo?v='.($this->updated_at?->timestamp ?? 0);
        }

        return $this->image_url;
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'store_user')->withTimestamps();
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function aiQuota(): HasOne
    {
        return $this->hasOne(AiStoreQuota::class);
    }
}
