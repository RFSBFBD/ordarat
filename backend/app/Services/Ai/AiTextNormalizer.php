<?php

namespace App\Services\Ai;

class AiTextNormalizer
{
    /**
     * Normalize Arabic & English text to remove diacritics, normalize hamzas,
     * trim multiple whitespace, and lowercase for cache key deduplication.
     */
    public static function normalize(string $text): string
    {
        // 1. Remove Arabic Tashkeel / Diacritics
        $tashkeel = [
            'َ', 'ً', 'ُ', 'ٌ', 'ِ', 'ٍ', 'ّ', 'ْ', 'ـ',
        ];
        $text = str_replace($tashkeel, '', $text);

        // 2. Normalize Arabic Hamzas & Letters
        $replacements = [
            'أ' => 'ا',
            'إ' => 'ا',
            'آ' => 'ا',
            'ة' => 'ه',
            'ى' => 'ي',
            'ؤ' => 'و',
            'ئ' => 'ي',
        ];
        $text = strtr($text, $replacements);

        // 3. Lowercase English characters
        $text = mb_strtolower($text, 'UTF-8');

        // 4. Strip punctuation and collapse multiple spaces into single space
        $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text);
        $text = preg_replace('/\s+/u', ' ', $text);

        return trim($text);
    }
}
