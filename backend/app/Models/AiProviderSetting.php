<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class AiProviderSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'function_type',
        'provider_name',
        'encrypted_api_key',
        'is_enabled',
        'cost_limit_daily_usd',
        'cost_limit_monthly_usd',
        'daily_request_limit',
        'max_input_size_kb',
        'max_output_tokens',
        'store_daily_quota',
        'store_monthly_quota',
        'kill_switch',
        'custom_settings',
    ];

    /**
     * CRITICAL SECURITY: The encrypted API key must NEVER be serialized or returned in JSON responses.
     */
    protected $hidden = [
        'encrypted_api_key',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'kill_switch' => 'boolean',
        'cost_limit_daily_usd' => 'float',
        'cost_limit_monthly_usd' => 'float',
        'daily_request_limit' => 'integer',
        'max_input_size_kb' => 'integer',
        'max_output_tokens' => 'integer',
        'store_daily_quota' => 'integer',
        'store_monthly_quota' => 'integer',
        'custom_settings' => 'array',
    ];

    protected $appends = [
        'is_configured',
        'masked_key',
    ];

    public function setApiKey(?string $plainKey): void
    {
        if (empty($plainKey)) {
            $this->encrypted_api_key = null;
        } else {
            $this->encrypted_api_key = Crypt::encryptString(trim($plainKey));
        }
    }

    public function getDecryptedApiKey(): ?string
    {
        if (empty($this->encrypted_api_key)) {
            return null;
        }

        try {
            return Crypt::decryptString($this->encrypted_api_key);
        } catch (\Throwable) {
            return null;
        }
    }

    public function getIsConfiguredAttribute(): bool
    {
        return ! empty($this->encrypted_api_key);
    }

    public function getMaskedKeyAttribute(): ?string
    {
        $raw = $this->getDecryptedApiKey();
        if (empty($raw)) {
            return null;
        }

        $len = strlen($raw);
        if ($len <= 4) {
            return '****';
        }

        return '••••••••'.substr($raw, -4);
    }
}
