<?php

use App\Models\ProjectRefund;
use App\Models\Refund;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Gig refund channel authorization
Broadcast::channel('refund.{uid}', function ($user, $uid) {
    $refund = Refund::where('uid', $uid)->first();
    if (!$refund) {
        return false;
    }

    return $user->id === $refund->seller_id || $user->id === $refund->buyer_id;
});

Broadcast::channel('project-refund.{uid}', function ($user, $uid) {
    $projectRefund = ProjectRefund::where('uid', $uid)->first();
    if (!$projectRefund) {
        return false;
    }
    return $user->id === $projectRefund->freelancer_id || $user->id === $projectRefund->client_id;
});


