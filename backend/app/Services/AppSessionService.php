<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class AppSessionService
{
    public const TOKEN_PREFIX = 'ordarat_sess_';
    public const DEFAULT_TTL_SECONDS = 604800; // 7 days

    /**
     * Issue an application session token for a verified user.
     */
    public function createSession(User $user, ?string $firebaseUid = null, int $ttlSeconds = self::DEFAULT_TTL_SECONDS): string
    {
        $token = self::TOKEN_PREFIX . bin2hex(random_bytes(32));

        Cache::put("app_sess_{$token}", [
            'user_id' => $user->id,
            'firebase_uid' => $firebaseUid ?: $user->firebase_uid,
            'role' => $user->role,
            'created_at' => time(),
            'last_activity' => time(),
            'status' => 'active',
        ], $ttlSeconds);

        return $token;
    }

    /**
     * Validate an application session token and return the associated active User.
     */
    public function validateSession(string $token): ?User
    {
        if (! str_starts_with($token, self::TOKEN_PREFIX)) {
            return null;
        }

        $session = Cache::get("app_sess_{$token}");
        if (! $session || ! is_array($session) || ($session['status'] ?? '') !== 'active') {
            return null;
        }

        $user = User::find($session['user_id']);
        if (! $user || ! $user->isActive()) {
            return null;
        }

        // Update last activity sliding TTL
        $session['last_activity'] = time();
        Cache::put("app_sess_{$token}", $session, self::DEFAULT_TTL_SECONDS);

        return $user;
    }

    /**
     * Invalidate an application session token immediately.
     */
    public function revokeSession(string $token): void
    {
        Cache::forget("app_sess_{$token}");
        Cache::put("revoked_sess_{$token}", true, 86400);
    }

    /**
     * Blacklist a Firebase ID token upon explicit logout for its remaining lifetime.
     */
    public function revokeFirebaseToken(string $rawToken, int $exp): void
    {
        $hash = hash('sha256', $rawToken);
        $ttl = max(60, $exp - time());
        Cache::put("revoked_jwt_{$hash}", true, $ttl);
    }

    /**
     * Check if a Firebase ID token was explicitly revoked on logout.
     */
    public function isFirebaseTokenRevoked(string $rawToken): bool
    {
        $hash = hash('sha256', $rawToken);
        return Cache::has("revoked_jwt_{$hash}");
    }
}
