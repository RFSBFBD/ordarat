<?php

namespace App\Support;

/**
 * Validation and decoding for the small logo images sent as data URLs.
 */
class BusinessLogo
{
    public const MAX_BYTES = 150 * 1024;

    private const TYPES = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
    ];

    /**
     * @return array{mime:string,bytes:string}|null null when the value is not a safe image
     */
    public static function decode(?string $dataUrl): ?array
    {
        if (! is_string($dataUrl) || strlen($dataUrl) > (int) (self::MAX_BYTES * 1.4) + 100) {
            return null;
        }
        if (! preg_match('#^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$#', $dataUrl, $m)) {
            return null;
        }
        $bytes = base64_decode($m[2], true);
        if ($bytes === false || $bytes === '' || strlen($bytes) > self::MAX_BYTES) {
            return null;
        }
        $info = @getimagesizefromstring($bytes);
        if ($info === false || ($info['mime'] ?? '') !== $m[1]) {
            return null;
        }
        if ($info[0] < 32 || $info[1] < 32 || $info[0] > 1024 || $info[1] > 1024) {
            return null;
        }

        return ['mime' => $m[1], 'bytes' => $bytes];
    }
}
