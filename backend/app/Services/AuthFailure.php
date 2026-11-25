<?php

namespace App\Services;

use Exception;

/**
 * A sign-in problem the API reports with a stable code and HTTP status.
 */
class AuthFailure extends Exception
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 401,
    ) {
        parent::__construct($message);
    }
}
