<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Zone extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'is_active',
        'center_lat',
        'center_lng',
        'radius_km',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'center_lat' => 'float',
        'center_lng' => 'float',
        'radius_km' => 'float',
    ];

    public function branchFees(): HasMany
    {
        return $this->hasMany(BranchZoneFee::class);
    }
}
