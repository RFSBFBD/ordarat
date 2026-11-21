<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiImageSecurityService
{
    /**
     * Allowed image MIME types.
     */
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    /**
     * Strip EXIF and GPS metadata from image before sending to any provider or storing.
     */
    public function sanitizeAndStripExif(string $sourcePath, string $destinationPath): bool
    {
        if (! file_exists($sourcePath)) {
            throw new RuntimeException('ملف الصورة المصدر غير موجود');
        }

        $imageInfo = @getimagesize($sourcePath);
        if (! $imageInfo || ! in_array($imageInfo['mime'], self::ALLOWED_MIMES, true)) {
            throw new RuntimeException('نوع الصورة غير مدعوم أو غير صالح');
        }

        $mime = $imageInfo['mime'];
        $imageResource = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($sourcePath),
            'image/png' => @imagecreatefrompng($sourcePath),
            'image/webp' => @imagecreatefromwebp($sourcePath),
            default => null,
        };

        if (! $imageResource) {
            throw new RuntimeException('فشلت معالجة الصورة وتنظيفها');
        }

        // Saving image freshly recreates clean pixel data without EXIF/GPS tags
        $saved = match ($mime) {
            'image/jpeg' => imagejpeg($imageResource, $destinationPath, 90),
            'image/png' => imagepng($imageResource, $destinationPath, 8),
            'image/webp' => imagewebp($imageResource, $destinationPath, 90),
            default => false,
        };

        imagedestroy($imageResource);

        return (bool) $saved;
    }

    /**
     * Safely download image from URL with strict SSRF protection.
     */
    public function safeDownloadImage(string $url, string $destinationPath, int $maxBytes = 4194304): string
    {
        $parts = parse_url($url);
        if (! $parts || ! isset($parts['host'])) {
            throw new RuntimeException('رابط الصورة غير صالح');
        }

        $host = strtolower($parts['host']);

        // Prevent loopback, localhost, and metadata endpoints
        if (in_array($host, ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'], true)) {
            throw new RuntimeException('الرابط محظور لأسباب أمنية (SSRF protection)');
        }

        $ip = gethostbyname($host);
        if ($this->isPrivateOrReservedIp($ip)) {
            throw new RuntimeException('الرابط يوجه إلى شبكة داخلية محظورة');
        }

        $response = Http::timeout(10)->withoutRedirecting()->get($url);

        if (! $response->successful()) {
            throw new RuntimeException('فشل تحميل الصورة من الرابط');
        }

        $body = $response->body();
        if (strlen($body) > $maxBytes) {
            throw new RuntimeException('حجم الصورة يتجاوز الحد المسموح به');
        }

        file_put_contents($destinationPath, $body);

        // Verify MIME type of downloaded content
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $destinationPath);
        finfo_close($finfo);

        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            @unlink($destinationPath);
            throw new RuntimeException('المحتوى الذي تم تنزيله ليس صورة صالحة');
        }

        return $destinationPath;
    }

    private function isPrivateOrReservedIp(string $ip): bool
    {
        return ! filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }
}
