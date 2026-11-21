<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthAndErrorTest extends TestCase
{
    public function test_api_health_endpoint_returns_healthy_status(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'healthy',
                'service' => 'Ordarat API',
            ])
            ->assertJsonStructure([
                'status',
                'service',
                'environment',
                'timestamp',
            ]);
    }

    public function test_not_found_api_route_returns_unified_error_format(): void
    {
        $response = $this->getJson('/api/non-existent-endpoint');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'NOT_FOUND',
                ],
            ]);
    }

    public function test_web_up_endpoint_returns_ok(): void
    {
        $response = $this->get('/up');
        $response->assertStatus(200);
    }
}
