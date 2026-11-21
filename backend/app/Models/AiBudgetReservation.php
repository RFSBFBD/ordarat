<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiBudgetReservation extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'function_type',
        'store_id',
        'reserved_cost_usd',
        'status',
        'created_at',
        'settled_at',
    ];

    protected $casts = [
        'reserved_cost_usd' => 'float',
        'created_at' => 'datetime',
        'settled_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
