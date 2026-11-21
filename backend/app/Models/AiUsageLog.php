<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'function_type',
        'provider_name',
        'user_id',
        'store_id',
        'input_size',
        'output_size',
        'estimated_cost_usd',
        'status',
        'error_code',
        'latency_ms',
        'created_at',
    ];

    protected $casts = [
        'input_size' => 'integer',
        'output_size' => 'integer',
        'estimated_cost_usd' => 'float',
        'latency_ms' => 'integer',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
