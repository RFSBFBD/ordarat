<?php

namespace App\Services;

use Exception;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class FirebaseAuthService
{
    protected string $projectId;

    protected ?array $mockPublicKeys = null;

    public function __construct()
    {
        $this->projectId = config('services.firebase.project_id', env('FIREBASE_PROJECT_ID', 'ordarat-qena'));
    }

    /**
     * For unit and feature testing only.
     */
    public function setMockPublicKeys(array $keys): void
    {
        $this->mockPublicKeys = $keys;
    }

    public function getProjectId(): string
    {
        return $this->projectId;
    }

    /**
     * Verify and decode a Firebase ID token.
     *
     * @throws Exception
     */
    public function verifyIdToken(string $token): array
    {
        // 1. Decode header to extract 'kid'
        $tks = explode('.', $token);
        if (count($tks) !== 3) {
            throw new Exception('Invalid JWT structure');
        }

        $header = json_decode(base64_decode(strtr($tks[0], '-_', '+/')), true);
        if (! isset($header['kid']) || ! isset($header['alg'])) {
            throw new Exception('Missing kid or alg in JWT header');
        }

        $kid = $header['kid'];
        $alg = $header['alg'];

        if ($alg !== 'RS256') {
            throw new Exception('Invalid algorithm. Expected RS256, got: '.$alg);
        }

        // 2. Fetch Google Public Certificates (with automatic rotation refresh if kid not found)
        $publicKeys = $this->getGooglePublicKeys();
        if (! isset($publicKeys[$kid])) {
            $publicKeys = $this->getGooglePublicKeys(true);
            if (! isset($publicKeys[$kid])) {
                throw new Exception('Unknown or expired public key ID');
            }
        }

        $publicKey = $publicKeys[$kid];

        // 3. Verify signature and claims using Firebase JWT
        $decoded = JWT::decode($token, new Key($publicKey, $alg));
        $claims = (array) $decoded;

        // 4. Validate standard Firebase claims
        $expectedIssuer = 'https://securetoken.google.com/'.$this->projectId;
        if (($claims['iss'] ?? '') !== $expectedIssuer) {
            throw new Exception("Invalid token issuer. Expected: {$expectedIssuer}, got: ".($claims['iss'] ?? ''));
        }

        if (($claims['aud'] ?? '') !== $this->projectId) {
            throw new Exception("Invalid token audience. Expected: {$this->projectId}, got: ".($claims['aud'] ?? ''));
        }

        if (empty($claims['sub'])) {
            throw new Exception('Token subject (sub) cannot be empty');
        }

        if (isset($claims['exp']) && $claims['exp'] < time()) {
            throw new Exception('Token has expired');
        }

        if (isset($claims['nbf']) && $claims['nbf'] > time()) {
            throw new Exception('Token is not yet valid (nbf)');
        }

        if (isset($claims['iat']) && $claims['iat'] > (time() + 300)) {
            throw new Exception('Token issued in the future (iat)');
        }

        // 5. Strict Google Sign-in provider check
        $firebaseClaims = (array) ($claims['firebase'] ?? []);
        $signInProvider = $firebaseClaims['sign_in_provider'] ?? '';
        if ($signInProvider !== 'google.com') {
            throw new Exception("Invalid sign_in_provider: {$signInProvider}. Only google.com is allowed");
        }

        // 6. Strict email verification check
        if (($claims['email_verified'] ?? false) !== true) {
            throw new Exception('Google email is not verified (email_verified must be true)');
        }

        return $claims;
    }

    /**
     * Retrieve Google public certificates.
     */
    public function getGooglePublicKeys(bool $forceRefresh = false): array
    {
        if ($this->mockPublicKeys !== null) {
            return $this->mockPublicKeys;
        }

        if ($forceRefresh) {
            Cache::forget('firebase_google_public_keys');
        }

        return Cache::remember('firebase_google_public_keys', 3600, function () {
            try {
                $response = Http::timeout(5)->get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
                if ($response->successful()) {
                    return $response->json();
                }
            } catch (Exception $e) {
                // Network unavailable in offline tests
            }

            return [];
        });
    }
}
