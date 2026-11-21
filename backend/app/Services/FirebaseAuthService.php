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

        // 2. Fetch Google Public Certificates (cached for 1 hour)
        $publicKeys = $this->getGooglePublicKeys();
        if (! isset($publicKeys[$kid])) {
            throw new Exception('Unknown or expired public key ID');
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

        return $claims;
    }

    /**
     * Retrieve Google public certificates.
     */
    protected function getGooglePublicKeys(): array
    {
        if ($this->mockPublicKeys !== null) {
            return $this->mockPublicKeys;
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
