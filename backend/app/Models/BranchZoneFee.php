<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchZoneFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'zone_id',
        'delivery_fee',
        'is_served',
    ];

    protected $casts = [
        'delivery_fee' => 'decimal:2',
        'is_served' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
