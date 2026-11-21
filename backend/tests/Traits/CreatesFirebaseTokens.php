<?php

namespace Tests\Traits;

use App\Services\FirebaseAuthService;
use Firebase\JWT\JWT;

trait CreatesFirebaseTokens
{
    protected string $testKid = 'test-firebase-kid-1';

    protected string $testProjectId = 'ordarat-qena';

    protected const RSA_PRIVATE_KEY = <<<'KEY'
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCfFLeX9HGebFVx
du97RaqHVPiDfPKDmf1oOIAZ9B18ylNjBQ/hNwZNUv1GmhKbAwxrPFmxbyXQCUu9
cubh8kZC6EicbYHZwcLrdBk/C0Lpl8tLiv4n97keWSU5UR9ccvFUV7K/Q9kQoZ/1
rWYerQmKQe7b7iTNUhrIqPgJGZgRDoIRNDW91Lv7EmAQV2pIx0A/o/sEtldySeF1
AQo6jPKO0G+jPKZtuSHRHeYM4c+4a/9+z4FL+iyJPzwTBlJFZWCJk+i8Jp8Od2ls
6AFKlG1qyqd4Vyjz5NMWJSbKXnv/nsZEY+keJS1LnBHyzzbBK1k78kjvC7dTcvvM
Zw7iGgMFAgMBAAECggEAIxnCosQ8d6zGs5j/IW+PP3ontXeR2SjWqbLhzRg4k2rf
OFeLF/H4sYIQwY3IciybhmPUFJsGOF98t0oNmKhJCYVQVDezcZVXyXUeBvOYqYsl
P79k8fOuhHw+AuYb6d2w0x/goGQ7lnhbH63JfRZIJxoCNsPWmfk2ULU7uWJM0+JK
/pPMSsKqBjnxUD5Vuo/0B9TMrPhsQdOmO63/MLWxEiaKM4Msnia3BnDNXjW1Scil
zMMTQdObHacjqFhXDA7/HOPnHWpl1sVTwUp79sxUONya0Z15ii3kkumiH5CdNxf6
Gwh7epz24/eOzei1bTLzXzafjRI1S/b95Dj3cF3wZwKBgQDSLd+TnUTTdVXj9T7s
HBKi2kbWUneiTpNb34aXJJcwRuTBCPktPQgEsIwPjtwhftS5fayRxhAmo5Nc1UeO
qKlRYfxM9Rd1CWSZrR2BBsb6vCWzFpFsTQc9GXYT4bK/4Pppo+ducAxHf+63v84V
CDngXYz8Jh17g/EXSvvsIfXFNwKBgQDBwwsT98Y3n4WYPfpDymd4erVS5/2gN/DV
85XkYkXIO2lFx6O7u0Smmae2u28WLfF2QbP2J56SearScSEbwBrwAe2O9GW89H3G
ZlKZqgsXQit6w7hZtG10+UEt67YsxYdQ3OE85wF+YeZ3sZVfwbwzjFTpJ9M4eG2Z
I2zAtAaXowKBgBBQbT1JBNGhFvSl0aeEGlI3vS3fotefX8LO2+SZe37M0e7F4omH
Zjru9UAz55RWAu8O+TkrdY96PPMEvxQstU/S2kGi+JomC3/+Nv8P5pwJxKddBhaw
9/HfKxIp/7TzIpzWkx04Z0uZe48ZvUZWqB9pQ4tC7iDrQeh78ogGrswLAoGARGGq
UjS6nrzMsCsHXM9c7vcXcRfwuY+kjk12E/Dewci94WOQlFuF4eoOd330uXYjZmHP
ukrHOth3gedtENceap+zkCUOlr4OeWt5MUQCwAWZRK04LWhwzLx+1U7/rxNTKyWY
1B6Ot2SjqpBgsDe2TNb0zIhCkgZmX4pSAjxGq1MCgYAlujqoPvJUvEEkmKngOzGK
lDrJzEC9CaLKdoLFJzHm8ynsXMcFzv+kIGgXwAmiDBG+WOpssn0V7t/8ln7BEveY
SOJIVhbs0In3Lv9elTF6M/DPyXtf34g4mVm+aKK/RQ+JBQYTQI9VTmkQUdBpxK+V
3qEbzBmCnRMCPbb98+F3cQ==
-----END PRIVATE KEY-----
KEY;

    protected const RSA_PUBLIC_KEY = <<<'KEY'
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnxS3l/RxnmxVcXbve0Wq
h1T4g3zyg5n9aDiAGfQdfMpTYwUP4TcGTVL9RpoSmwMMazxZsW8l0AlLvXLm4fJG
QuhInG2B2cHC63QZPwtC6ZfLS4r+J/e5HlklOVEfXHLxVFeyv0PZEKGf9a1mHq0J
ikHu2+4kzVIayKj4CRmYEQ6CETQ1vdS7+xJgEFdqSMdAP6P7BLZXcknhdQEKOozy
jtBvozymbbkh0R3mDOHPuGv/fs+BS/osiT88EwZSRWVgiZPovCafDndpbOgBSpRt
asqneFco8+TTFiUmyl57/57GRGPpHiUtS5wR8s82wStZO/JI7wu3U3L7zGcO4hoD
BQIDAQAB
-----END PUBLIC KEY-----
KEY;

    protected function setupFirebaseMock(): void
    {
        $service = new FirebaseAuthService;
        $this->testProjectId = $service->getProjectId();
        $service->setMockPublicKeys([
            $this->testKid => self::RSA_PUBLIC_KEY,
        ]);
        $this->app->instance(FirebaseAuthService::class, $service);
    }

    protected function createValidFirebaseToken(
        string $uid,
        string $email = 'user@example.com',
        ?string $name = 'Test User',
        int $ttl = 3600
    ): string {
        $now = time();
        $payload = [
            'iss' => "https://securetoken.google.com/{$this->testProjectId}",
            'aud' => $this->testProjectId,
            'auth_time' => $now,
            'user_id' => $uid,
            'sub' => $uid,
            'iat' => $now - 10,
            'exp' => $now + $ttl,
            'email' => $email,
            'email_verified' => true,
            'name' => $name,
            'firebase' => [
                'identities' => [
                    'google.com' => [$uid],
                    'email' => [$email],
                ],
                'sign_in_provider' => 'google.com',
            ],
        ];

        return JWT::encode($payload, self::RSA_PRIVATE_KEY, 'RS256', $this->testKid);
    }
}
