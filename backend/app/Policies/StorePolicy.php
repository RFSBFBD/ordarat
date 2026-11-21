<?php

namespace App\Policies;

use App\Models\Store;
use App\Models\User;

class StorePolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Store $store): bool
    {
        if ($store->is_active) {
            return true;
        }

        if (! $user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $store->users()->where('users.id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        // Admin only can open store accounts (Decision 3)
        return $user->isAdmin();
    }

    public function update(User $user, Store $store): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isMerchant()) {
            return $store->users()->where('users.id', $user->id)->exists();
        }

        return false;
    }

    public function delete(User $user, Store $store): bool
    {
        return $user->isAdmin();
    }
}
