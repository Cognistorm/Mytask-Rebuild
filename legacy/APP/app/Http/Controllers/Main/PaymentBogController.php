<?php

namespace App\Http\Controllers\Main;

use App\Enums\ProjectMilestoneStatus;
use App\Enums\ProjectStatus;
use App\Http\Controllers\Controller;
use App\Models\CustomOffer;
use App\Models\ProjectMilestone;
use App\Notifications\User\Freelancer\EmployerFundedMilestone;
use App\Models\DepositTransaction;
use App\Models\DepositWebhook;
use App\Notifications\User\Freelancer\OfferFunded;
use App\Notifications\User\Seller\PendingOrder;
use App\Notifications\User\Everyone\SubscriptionActivated;
use App\Notifications\User\Everyone\SubscriptionConfirmation;
use App\Services\Subscription\SubscriptionService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentBogController extends Controller
{
    protected $subscriptionService;

    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }

    public function success()
    {
        $key = request('key');
        $type = request('type', 'order');

        if ($type == 'offer') {
            return $this->successOffer($key);
        }
        if ($type === 'project_milestone') {
            return $this->successProjectMilestone($key);
        }

        if ($type == 'fill_balance') {
            return $this->successFillBalance($key);
        }

        if ($type == 'subscription') {
            return $this->successSubscription($key);
        }

        $model = \App\Models\CheckoutWebhook::wherePaymentId($key)->firstOrFail();
        $model->status = 'succeeded';
        $model->save();

        $order = \App\Models\Order::with([
            'items:id,order_id,owner_id,uid,profit_value' => [
                'owner:id,email',
                'gig:id,gig_id,orders_in_queue',
            ],
            'invoice:id,order_id',
        ])->whereUid($key)->firstOrFail();

        DB::transaction(function () use ($order) {
            foreach ($order->items as $item) {
                $owner = $item->owner()->lockForUpdate()->first();
                if ($owner) {
                    $owner->increment('balance_pending', convertToNumber($item->profit_value));
                }
            }
        });

        foreach ($order->items as $item) {
            notification([
                'text' => 't_notification_buyer_order_placed',

                'action' => url('seller/orders/details/' . $item->uid),

                'user_id' => $item->owner_id,

                'params' => [],

            ]);

            $item->gig()->increment('orders_in_queue');
            try {
                $item->owner->notify((new PendingOrder($item))->locale(config('app.locale')));
            } catch (Exception $exception) {
            }
        }
        $order->invoice()->update(['status' => 'paid']);

        session()->forget('cart');

        return redirect('account/orders')->with('message', __('messages.t_payment_received_details'));
    }

    private function successOffer($key)
    {
        $offer = CustomOffer::where('uid', $key)->firstOrFail();
        $offer->payment_status = 'funded';

        $settings = settings('publish');

        $offer->expires_at = now()->addDays($settings->custom_offers_expiry_days);

        $offer->save();

        // Send a notification via email to the freelancer

        $offer->freelancer->notify(new OfferFunded($offer));

        // Send the freelancer a notification via webapp

        notification([

            'text' => 't_a_custom_order_has_been_funded',

            'action' => url('seller/offers'),

            'user_id' => $offer->freelancer_id,

        ]);

        return redirect('account/offers');

    }

    private function successProjectMilestone($key)
    {
        $model = ProjectMilestone::where('uid', $key)->firstOrFail();

        $model->is_draft = false;
        $model->status = ProjectMilestoneStatus::FUNDED->value;
        $model->save();

        DB::transaction(function () use ($model) {
            $employer = $model->employer()->lockForUpdate()->first();
            if ($employer) {
                $lockedAmount = convertToNumber($model->amount) + convertToNumber($model->employer_commission);
                $employer->increment('balance_pending', $lockedAmount);
            }

            $freelancer = $model->freelancer()->lockForUpdate()->first();
            if ($freelancer) {
                $net = convertToNumber($model->amount) - convertToNumber($model->freelancer_commission);
                if ($net > 0) {
                    $freelancer->increment('balance_pending', $net);
                }
            }
        });

        if ($model->project->status === ProjectStatus::UNDER_DEVELOPMENT->value) {
            $model->project->status = ProjectStatus::PENDING_FINAL_REVIEW->value;
            $model->project->save();
        }

        $model->freelancer->notify((new EmployerFundedMilestone($model))->locale(config('app.locale')));
        notification([

            'text' => 't_username_has_deposited_amount_in_project',

            'action' => url('seller/projects/milestones', $model->project->uid),

            'user_id' => $model->project->awarded_freelancer_id,

            'params' => [

                'username' => $model->project->client->username,

                'amount' => money(convertToNumber($model->amount), settings('currency')->code, true)->format(),

            ],

        ]);

        return redirect('account/projects/payments/' . $model->project->uid);

    }

    private function successFillBalance($key)
    {
        $deposit = DepositWebhook::wherePaymentId($key)->firstOrFail();
        $deposit->status = 'succeeded';

        $deposit->user->update([
            'balance_available' => $deposit->user->balance_available + $deposit->amount,
        ]);

        $deposit->save();

        DepositTransaction::create([
            'transaction_id' => $key,
            'payment_method' => 'bog',
            'amount_total' => $deposit->amount,
            'currency' => 'GEL',
            'exchange_rate' => 1,
            'status' => 'paid',
            'ip_address' => request()->ip(),
        ]);

        //TODO
        return redirect('/')->with('message', __('messages.t_balance'));
    }

    /**
     * Process successful subscription payment
     *
     * @param string $key Order ID
     * @return \Illuminate\Http\RedirectResponse
     */
    private function processSubscriptionSuccess(string $key)
    {
        try {
            [$paymentDetails, $order] = $this->subscriptionService->getPaymentDetailsFromBog($key);
            $subscription = $this->subscriptionService->processSubscription($paymentDetails, $order);

            if ($subscription) {
                $user = $subscription->subscriber;
                if ($user) {
                    notification([
                        'text' => 't_subscription_activated_message',
                        'action' => route('account.my-subscription'),
                        'user_id' => $user->id,
                        'params' => [
                            'expires_at' => $subscription->ends_at->format('d-m-Y'),
                        ],
                    ]);

                    $user->notify((new SubscriptionConfirmation($subscription))->locale(config('app.locale')));

                }

                return redirect()
                    ->route('main.subscription')
                    ->with('success', 'Subscription activated successfully!');
            }

            return redirect('/')
                ->with('error', 'Failed to process subscription. Please contact support.');

        } catch (\Exception $e) {
            Log::error('Error in subscription processing', [
                'orderId' => $key,
                'error' => $e->getMessage(),
            ]);

            return redirect()
                ->route('main.subscription')
                ->with('error', 'An error occurred while processing your subscription. Please contact support.');
        }
    }

    /**
     * Process successful subscription payment
     *
     * @param string $key Order ID
     * @return \Illuminate\Http\RedirectResponse
     */
    private function successSubscription(string $key)
    {
        return $this->processSubscriptionSuccess($key);
    }

    public function fail()
    {
        $key = request('key');
        $type = request('type', 'order');

        if ($type === 'subscription') {
            DepositWebhook::where('payment_id', $key)->update(['status' => 'failed']);
            return redirect()->route('main.subscription')->with('message', __('messages.t_error_xendit_payment_failed'));
        }

        if ($type === 'project_milestone') {
            $milestone = ProjectMilestone::where('uid', $key)->first();
            if ($milestone && $milestone->project) {
                return redirect('checkout/' . $milestone->project->uid . '/project')->with('message', __('messages.t_error_xendit_payment_failed'));
            }
        }

        if ($type === 'fill_balance') {
            DepositWebhook::where('payment_id', $key)->update(['status' => 'failed']);
            return redirect('account/deposit')->with('message', __('messages.t_error_xendit_payment_failed'));
        }

        return redirect('checkout')->with('message', __('messages.t_error_xendit_payment_failed'));
    }
}
