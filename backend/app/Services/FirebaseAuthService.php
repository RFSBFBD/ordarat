<?php

namespace App\Services;

use App\Models\User;
use Exception;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class FirebaseAuthService
{
    public const ALLOWED_PROVIDERS = ['google.com', 'password'];

    protected string $projectId;

    protected ?array $mockPublicKeys = null;

    public function __construct()
    {
        $this->projectId = config('services.firebase.project_id', env('FIREBASE_PROJECT_ID', 'planning-with-ai-d25ac'));
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
     * Map verified token claims to exactly one application user.
     *
     * Never merges two identities silently: an existing row is linked only when it has no
     * Firebase identity yet (pre-seeded staff/merchant), and an email that already belongs to
     * another Firebase identity is refused instead of creating a duplicate or taking it over.
     *
     * @throws AuthFailure
     */
    public function resolveUser(array $claims): User
    {
        $uid = $claims['sub'];
        $email = mb_strtolower((string) ($claims['email'] ?? ''));
        $name = $claims['name'] ?? ($email !== '' ? explode('@', $email)[0] : 'عميل قنا');

        $user = User::where('firebase_uid', $uid)->first();

        if (! $user && $email !== '') {
            $existing = User::whereRaw('lower(email) = ?', [$email])->first();
            if ($existing) {
                if ($existing->firebase_uid !== null) {
                    throw new AuthFailure(
                        'ACCOUNT_LINK_REQUIRED',
                        'البريد ده مسجل عندنا بطريقة دخول تانية. ادخل بالطريقة اللي سجلت بيها أول مرة',
                        409
                    );
                }
                $existing->update(['firebase_uid' => $uid]);
                $user = $existing;
            }
        }

        if (! $user) {
            $user = User::create([
                'firebase_uid' => $uid,
                'name' => $name,
                'email' => $email,
                'role' => $this->initialRole($email),
                'status' => 'active',
            ])->refresh();
        }

        if (! $user->isActive()) {
            throw new AuthFailure('ACCOUNT_SUSPENDED', 'حسابك متوقف. اتواصل معنا', 403);
        }

        return $user;
    }

    /**
     * Everyone starts as a customer; only ADMIN_EMAILS bootstrap as admin
     * (the email is always verified by the time this runs).
     */
    protected function initialRole(string $email): string
    {
        $adminEmails = array_map(
            fn ($e) => mb_strtolower(trim($e)),
            config('ordarat.admin_emails', [])
        );

        return in_array($email, $adminEmails, true) ? 'admin' : 'customer';
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

        // 5. Only the two supported sign-in methods: Google, or email + password
        $firebaseClaims = (array) ($claims['firebase'] ?? []);
        $signInProvider = $firebaseClaims['sign_in_provider'] ?? '';
        if (! in_array($signInProvider, self::ALLOWED_PROVIDERS, true)) {
            throw new Exception("Invalid sign_in_provider: {$signInProvider}. Only google.com and password are allowed");
        }

        // 6. The email must be verified for BOTH methods (Google verifies it itself,
        //    password accounts verify it through the Firebase email link).
        if (($claims['email_verified'] ?? false) !== true || empty($claims['email'])) {
            throw new AuthFailure('EMAIL_NOT_VERIFIED', 'وثّق بريدك الإلكتروني من الرسالة اللي وصلتلك، وبعدها سجّل دخولك', 401);
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
