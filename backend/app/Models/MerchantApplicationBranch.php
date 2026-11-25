<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantApplicationBranch extends Model
{
    protected $fillable = ['merchant_application_id', 'name', 'address', 'phone', 'latitude', 'longitude'];

    protected $casts = ['latitude' => 'float', 'longitude' => 'float'];

    public function application(): BelongsTo
    {
        return $this->belongsTo(MerchantApplication::class, 'merchant_application_id');
    }
}
