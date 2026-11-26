<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'name',
        'address',
        'latitude',
        'longitude',
        'phone',
        'is_active',
        'is_accepting_orders',
        'working_hours',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'is_active' => 'boolean',
        'is_accepting_orders' => 'boolean',
        'working_hours' => 'array',
    ];

    /**
     * The business phone is for the admin only. Customers, visitors and other
     * businesses never get it in an API response. A merchant or branch manager
     * still sees the phone of their own store or branch.
     */
    public function attributesToArray(): array
    {
        $attributes = parent::attributesToArray();

        if (! $this->phoneVisibleToViewer()) {
            unset($attributes['phone']);
        }

        return $attributes;
    }

    protected function phoneVisibleToViewer(): bool
    {
        $user = request()?->user();
        if (! $user) {
            return false;
        }
        if ($user->isAdmin()) {
            return true;
        }
        if ($user->isMerchant()) {
            return $user->stores->contains('id', $this->store_id);
        }
        if ($user->isBranchManager()) {
            return $user->managedBranch()?->id === $this->id;
        }

        return false;
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function zoneFees(): HasMany
    {
        return $this->hasMany(BranchZoneFee::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function managers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'branch_user')->withTimestamps();
    }
}
