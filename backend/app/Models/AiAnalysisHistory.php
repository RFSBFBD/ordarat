<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiAnalysisHistory extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'ai_analysis_history';

    protected $fillable = [
        'admin_user_id',
        'period',
        'summary_snapshot',
        'ai_insights',
        'created_at',
    ];

    protected $casts = [
        'summary_snapshot' => 'array',
        'created_at' => 'datetime',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }
}
