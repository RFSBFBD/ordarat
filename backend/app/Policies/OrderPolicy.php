<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function view(User $user, Order $order): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isCustomer()) {
            return $order->customer_id === $user->id;
        }

        if ($user->isMerchant()) {
            return $order->store->users()->where('users.id', $user->id)->exists();
        }

        return false;
    }

    public function updateStatus(User $user, Order $order): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isMerchant()) {
            return $order->store->users()->where('users.id', $user->id)->exists();
        }

        return false;
    }

    public function cancel(User $user, Order $order): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isCustomer()) {
            return $order->customer_id === $user->id && $order->status === 'new';
        }

        return false;
    }
}
