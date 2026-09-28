<?php

namespace App\Livewire\Main\Checkout;

use App\Models\AutomaticPaymentGateway;
use App\Models\Project;
use App\Models\OfflinePaymentGateway;
use App\Models\ProjectMilestone;
use App\Models\CustomOffer;
use App\Notifications\User\Freelancer\EmployerFundedMilestone;
use App\Notifications\User\Freelancer\OfferFunded;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use DB;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use WireUi\Traits\Actions;

class UnifiedCheckoutComponent extends Component
{
    use SEOToolsTrait, LivewireAlert, Actions;

    public $selectedMethod = null;
    public $subtotal = 0;
    public $tax = 0;
    public $fee_value = 0;
    public $fee_text = '';
    public $payment_gateway_params = [];
    public $project;
    public $project_bid;
    public $customOffer;
    public $type;
    public $uid;
    public $total = 0;
    public $is_third_step = false;

    /**
     * Visa / Mastercard processing fee (2.5%).
     */
    protected float $cardFeeRate = 0.025;

    /**
     * Init component
     *
     * @return void
     */
    public function mount($uid = null, $type = null)
    {
        $this->uid = $uid;
        $this->type = $type;

        if ($type === 'project') {
            $this->handleProjectCheckout($uid);
        } elseif ($type === 'offer') {
            $this->handleOfferCheckout($uid);
        } else {
            abort(404);
        }

        // Calculate tax
        $this->tax = $this->taxes();

        // Calculate total
        $this->total = $this->total();

        // Set SEO
        $this->seo()->setTitle(__('messages.t_checkout'));
    }

    /**
     * Handle project checkout logic
     *
     * @param string $uid
     * @return void
     */
    protected function handleProjectCheckout($uid)
    {
        // Get project by UID
        $this->project = Project::where('uid', $uid)->firstOrFail();

        // Get the project's awarded bid (the bid that needs to be paid)
        $this->project_bid = $this->project->awarded_bid;

        if (!$this->project_bid) {
            return redirect('projects');
        }

        // Calculate subtotal (bid amount)
        $this->subtotal = $this->project_bid->amount;
    }

    /**
     * Handle offer checkout logic
     *
     * @param string $uid
     * @return void
     */
    protected function handleOfferCheckout($uid)
    {
        // Get custom offer by UID
        $this->customOffer = CustomOffer::where('uid', $uid)->firstOrFail();

        // Check if offer is available for payment
        if ($this->customOffer->payment_status !== 'pending' ||
            $this->customOffer->freelancer_status !== 'approved' ||
            $this->customOffer->buyer_id !== auth()->id()) {
            return redirect('account/offers');
        }

        // Calculate subtotal (offer budget amount + buyer service fee if exists)
        $budgetAmount   = convertToNumber($this->customOffer->budget_amount);
        $buyerFee       = convertToNumber($this->customOffer->budget_buyer_fee ?? 0);
        $this->subtotal = $budgetAmount + $buyerFee;
    }

    /**
     * Calculate taxes
     *
     * @return float
     */
    public function taxes()
    {
        // Get commission settings (tax settings are stored here)
        $settings = settings('commission');

        // Check if taxes enabled
        if ($settings && $settings->enable_taxes) {

            // Check if type of taxes percentage
            if ($settings->tax_type === 'percentage') {

                // Get tax amount
                $tax = ($this->subtotal * $settings->tax_value) / 100;

                // Return tax amount
                return convertToNumber($tax);

            } else {

                // Fixed price
                $tax = $settings->tax_value;

                // Return tax
                return convertToNumber($tax);

            }

        } else {

            // Taxes not enabled
            return 0;

        }
    }

    /**
     * Calculate total amount
     *
     * @return float
     */
    public function total()
    {
        return $this->subtotal + $this->tax + $this->fee_value;
    }

    /**
     * Render component
     *
     * @return \Illuminate\View\View
     */
    #[Layout('components.layouts.main-app')]
    public function render()
    {
        return view('livewire.main.checkout.unified-checkout', [
            'payment_methods' => $this->getPaymentMethodsProperty()
        ]);
    }

    /**
     * Get available payment methods
     *
     * @return \Illuminate\Support\Collection
     */
    public function getPaymentMethodsProperty()
    {
        return AutomaticPaymentGateway::where('is_active', true)->get()
            ->merge(OfflinePaymentGateway::where('is_active', true)->get())
            ->sortBy('sort_id');
    }

    /**
     * Updated selected payment method
     *
     * @param string $slug
     * @return void
     */
    public function updatedSelectedMethod($slug)
    {
        try {
            // Reset
            $this->is_third_step = false;
            $this->fee_value = 0;
            $this->fee_text = 0;
            $this->payment_gateway_params = [];

            // Check selected method
            if ($slug) {

                // Check if user chose to pay using his wallet
                if ($slug === 'wallet') {

                    // No fee for wallet payment
                    $this->fee_value = 0;

                    // Update total
                    $this->total = $this->total();

                    // Get user available credit
                    $available_balance = convertToNumber(auth()->user()->balance_available);

                    // Check if user has amount in his wallet
                    if ($this->total > $available_balance) {

                        // Error
                        $this->notification([
                            'title'       => __('messages.t_error'),
                            'description' => __('messages.t_insufficient_funds_in_your_account'),
                            'icon'        => 'error'
                        ]);

                    }

                    // Return
                    return;

                }

                // Check if offline method
                if ($slug === "offline") {

                    // Get payment gateway
                    $gateway = payment_gateway($slug, false, true);

                } else {

                    // Get payment gateway
                    $gateway = payment_gateway($slug);

                }

                // Check if enabled
                if ($gateway?->is_active) {

                    // Calculate fee
                    $fee = $this->fee($gateway);

                    // Add 2.5% fee for BOG/Visa/Mastercard payments
                    if ($slug === 'bog') {
                        $bog_fee = $this->subtotal * 0.025; // 2.5% of subtotal
                        $fee['value'] = convertToNumber($fee['value']) + $bog_fee;
                        $fee['text'] = $fee['text'] ? $fee['text'] . ' + 2.5%' : '2.5%';
                    }

                    // Set fee value
                    $this->fee_value = convertToNumber($fee['value']);

                    // Set fee visible text
                    $this->fee_text = $fee['text'];

                    // Update total
                    $this->total = $this->total();

                }

            }

        } catch (\Throwable $th) {

            // Error
            $this->notification([
                'title'       => __('messages.t_error'),
                'description' => __('messages.t_toast_something_went_wrong'),
                'icon'        => 'error'
            ]);

        }
    }

    /**
     * Calculate fee
     *
     * @param object $gateway
     * @return array
     */
    public function fee($gateway)
    {
        try {

            // Set default value
            $fee         = 0;
            $fee_text    = '';

            // Get currency exchange rate
            $exchange_rate = $this->currency(settings('currency')->code, $gateway->currency);

            // Set total in gateway currency
            $total = $this->calculateExchangeRate($this->subtotal, $exchange_rate['value']);

            // Check gateway fee type
            switch ($gateway->fee_type) {

                case 'percentage':

                    $fee      = ($this->subtotal * $gateway->fee_value) / 100;
                    $fee_text = $gateway->fee_value . '%';

                    break;

                case 'fixed':

                    $fee      = $this->calculateExchangeRate($gateway->fee_value, $exchange_rate['value'], false, settings('currency')->code, false);
                    $fee_text = money($fee, settings('currency')->code, true);

                    break;

                case 'both':

                    $percentage = ($this->subtotal * $gateway->fee_percentage_value) / 100;
                    $fixed      = $this->calculateExchangeRate($gateway->fee_fixed_value, $exchange_rate['value'], false, settings('currency')->code, false);
                    $fee        = $percentage + $fixed;
                    $fee_text   = $gateway->fee_percentage_value . '% + ' . money($fixed, settings('currency')->code, true);

                    break;

            }

            // Return fee value
            return [
                'value' => convertToNumber($fee),
                'text'  => $fee_text,
            ];

        } catch (\Throwable $th) {

            // Return default value
            return [
                'value' => 0,
                'text'  => '',
            ];

        }
    }

    /**
     * Calculate exchange rate
     *
     * @param float $amount
     * @param float $exchange_rate
     * @param bool $formatted
     * @param string $currency
     * @param bool $symbol
     * @return mixed
     */
    public function calculateExchangeRate($amount, $exchange_rate, $formatted = true, $currency = null, $symbol = true)
    {
        // Calculate new amount
        $amount = $amount * $exchange_rate;

        // Check if need to return formatted value
        if ($formatted) {
            return money($amount, $currency, $symbol);
        }

        // Return amount
        return $amount;
    }

    /**
     * Get currency
     *
     * @param string $from
     * @param string $to
     * @return array
     */
    public function currency($from, $to)
    {
        try {

            // Check if same currency
            if ($from === $to) {
                return [
                    'value' => 1,
                    'formatted' => money(1, $to, true)
                ];
            }

            // For now, return 1:1 exchange rate
            // This should be replaced with actual currency conversion logic
            return [
                'value' => 1,
                'formatted' => money(1, $to, true)
            ];

        } catch (\Throwable $th) {

            // Default exchange rate
            return [
                'value' => 1,
                'formatted' => money(1, $to, true)
            ];

        }
    }

    /**
     * Process checkout
     *
     * @return mixed
     */
    public function confirm()
    {
        try {

            // Validate
            if (!$this->selectedMethod) {
                $this->notification([
                    'title' => __('messages.t_error'),
                    'description' => __('messages.t_pls_choose_payment_method'),
                    'icon' => 'error'
                ]);
                return;
            }
            // Check if user chose to pay using wallet
            if ($this->selectedMethod === 'wallet') {
                return $this->wallet();
            }

            // For Visa/Mastercard and other payment gateways, handle BOG payment directly
            if ($this->selectedMethod === 'bog') {
                return $this->deposit();
            }

        } catch (\Throwable $th) {

            // Error
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => $th->getMessage(),
                'icon' => 'error'
            ]);

        }
    }

    /**
     * Handle payment from wallet
     *
     * @return mixed
     */
    public function wallet()
    {
        try {

            // Get user available credit
            $available_balance = convertToNumber(auth()->user()->balance_available);

            if ($this->type === 'project') {
                return $this->walletProject($available_balance);
            } elseif ($this->type === 'offer') {
                return $this->walletOffer($available_balance);
            }

        } catch (\Throwable $th) {

            // Something went wrong
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_toast_something_went_wrong'),
                'icon' => 'error'
            ]);

        }
    }

    /**
     * Handle project wallet payment
     *
     * @param float $available_balance
     * @return mixed
     */
    protected function walletProject($available_balance)
    {
        try {

            // Get user available credit
            $available_balance = convertToNumber(auth()->user()->balance_available);

            $budget = convertToNumber($this->project_bid->amount);

            $settings = settings('projects');

            if ($settings->commission_type === 'fixed') {
                $employer_commission = convertToNumber($settings->commission_from_publisher);
            } else {
                $employer_commission = (convertToNumber($settings->commission_from_publisher) / 100) * $budget;
            }

            $total_amount = $budget + $employer_commission;

            // Check if user has amount in his wallet
            if ($total_amount > $available_balance) {
                // Error
                $this->notification([
                    'title'       => __('messages.t_error'),
                    'description' => __('messages.t_insufficient_funds_in_your_account'),
                    'icon'        => 'error'
                ]);

                return;
            }

            // Create or update milestone for this project
            $milestone = \App\Models\ProjectMilestone::where('project_id', $this->project->id)->first();

            if (!$milestone) {
                // Create new milestone
                $milestone = new \App\Models\ProjectMilestone();
                $milestone->uid = uid();
                $milestone->project_id = $this->project->id;
                $milestone->created_by = 'employer';
                $milestone->employer_id = auth()->id();
                $milestone->freelancer_id = $this->project_bid->freelancer_id;
                $milestone->amount = $budget;
                $milestone->employer_commission = $employer_commission;
                $milestone->freelancer_commission = ($settings->commission_type === 'fixed')
                    ? convertToNumber($settings->commission_from_freelancer)
                    : (convertToNumber($settings->commission_from_freelancer) / 100) * $budget;
                $milestone->description = 'Project payment via wallet';
                $milestone->status = 'funded';
                $milestone->is_draft = true;
                $milestone->save();
            } else {
                // Update existing milestone
                $milestone->status = 'funded';
                $milestone->is_draft = true;
                $milestone->save();
            }

            DB::transaction(function () use ($total_amount, $milestone) {
                auth()->user()->decrement('balance_available', $total_amount);

                $freelancer = $milestone->freelancer()->lockForUpdate()->first();
                if ($freelancer) {
                    $net = convertToNumber($milestone->amount) - convertToNumber($milestone->freelancer_commission);
                    if ($net > 0) {
                        $freelancer->increment('balance_pending', $net);
                    }
                }
            });

            // Update milestone status directly for wallet payments
            $milestone->is_draft = false;
            $milestone->status = \App\Enums\ProjectMilestoneStatus::FUNDED->value;
            $milestone->save();

            // Update project status if needed
            if ($this->project->status === \App\Enums\ProjectStatus::UNDER_DEVELOPMENT->value) {
                $this->project->status = \App\Enums\ProjectStatus::PENDING_FINAL_REVIEW->value;
                $this->project->save();
            }

            // Send notification to freelancer
            $milestone->freelancer->notify((new EmployerFundedMilestone($milestone))->locale(config('app.locale')));

            notification([
                'text' => 't_username_has_deposited_amount_in_project',
                'action' => url('seller/projects/milestones', $milestone->project->uid),
                'user_id' => $this->project->awarded_freelancer_id,
                'params' => [
                    'username' => $this->project->client->username,
                    'amount' => money(convertToNumber($milestone->amount), settings('currency')->code, true)->format(),
                ],
            ]);

            // Redirect to project payments page
            return redirect('account/projects/payments/' . $this->project->uid);

        } catch (\Throwable $th) {

            // Something went wrong
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_toast_something_went_wrong'),
                'icon' => 'error'
            ]);

        }
    }

    /**
     * Handle offer wallet payment
     *
     * @param float $available_balance
     * @return mixed
     */
    protected function walletOffer($available_balance)
    {
        $budget = convertToNumber($this->customOffer->budget_amount);
        $buyer_fee = convertToNumber($this->customOffer->budget_buyer_fee ?? 0);
        $total_amount = $budget + $buyer_fee;

        if ($total_amount > $available_balance) {
            $this->notification([
                'title'       => __('messages.t_error'),
                'description' => __('messages.t_insufficient_funds_in_your_account'),
                'icon'        => 'error'
            ]);
            return;
        };

        auth()->user()->update([
            'balance_available' => $available_balance - $total_amount
        ]);

        $offer = CustomOffer::where('uid', $this->uid)->firstOrFail();
        $offer->payment_status = 'funded';
        $settings = settings('publish');

        $offer->expires_at = now()->addDays($settings->custom_offers_expiry_days);

        $offer->save();

        $offer->freelancer->notify(new OfferFunded($offer));

        notification([

            'text' => 't_a_custom_order_has_been_funded',

            'action' => url('seller/offers'),

            'user_id' => $offer->freelancer_id,

        ]);

        return redirect('account/offers');
    }


    /**
     * Handle deposit for payments via BOG payment gateway
     *
     * @return mixed
     */
    public function deposit()
    {
        try {

            if ($this->type === 'project') {
                return $this->depositProject();
            }elseif($this->type === 'offer') {
                return $this->depositOffer();
            }

        } catch (\Illuminate\Validation\ValidationException $e) {

            // Validation error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params(__('messages.t_toast_form_validation_error'), 'error')
            );

            throw $e;
        } catch (\Throwable $th) {

            // Error
            $this->alert(
                'error',
                __('messages.t_error'),
                livewire_alert_params($th->getMessage(), 'error')
            );
        }
    }

    /**
     * Handle project deposit via BOG payment gateway
     *
     * @return mixed
     */
    protected function depositProject()
    {
        $budget = $this->project_bid->amount;

        // Project must be active
        if (!in_array($this->project->status, ['active', 'under_development', 'pending_final_review'])) {
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => __('messages.t_u_cannot_create_milestones_for_this_project'),
                'icon' => 'error',
            ]);
            return;
        }

        // Set amount to paid to freelancer
        $milestone_amount = convertToNumber($budget);

        // Get projects settings
        $settings = settings('projects');

        // Check commission type
        if ($settings->commission_type === 'fixed') {
            $employer_commission = convertToNumber($settings->commission_from_publisher);
            $freelancer_commission = convertToNumber($settings->commission_from_freelancer);
        } else {
            $employer_commission = (convertToNumber($settings->commission_from_publisher) / 100) * $milestone_amount;
            $freelancer_commission = (convertToNumber($settings->commission_from_freelancer) / 100) * $milestone_amount;
        }

        // Set total amount to be taken from the employer (includes 2.5% fee for BOG payments)
        $total_amount_from_employer = $this->total;

        // Create new milestone
        $milestone = ProjectMilestone::where('project_id', $this->project->id)->first();

        if (!$milestone) {
            $milestone = new ProjectMilestone;
            $milestone->uid = uid();
            $milestone->project_id = $this->project->id;
            $milestone->created_by = 'employer';
            $milestone->employer_id = auth()->id();
            $milestone->freelancer_id = $this->project_bid->freelancer_id;
            $milestone->amount = $budget;
            $milestone->employer_commission = $employer_commission;
            $milestone->freelancer_commission = $freelancer_commission;
            $milestone->description = 'Project milestone payment via Visa/Mastercard';
            $milestone->is_draft = true;
            $milestone->status = 'funded';
            $milestone->save();
        }

        // Success config for BOG payment
        $config = [
            'order_id' => $milestone->uid,
            'amount' => $total_amount_from_employer,
            'type' => 'project_milestone'
        ];

        $client = (new \App\Services\Bog\BogPayment())->payment($config);
        if (data_get($client, 'id')) {
            return redirect()->to($client['_links']['redirect']['href']);
        }
    }

    protected function depositOffer()
    {
        try {
            $offer = CustomOffer::where('uid', $this->uid)
                ->where('freelancer_status', 'approved')
                ->where('admin_status', 'approved')
                ->where('payment_status', 'pending')
                ->where('buyer_id', auth()->id())
                ->firstOrFail();

            $config = [
                'order_id' => $this->uid,
                'amount' => $this->total,
                'type' => 'offer'
            ];

            $client = (new \App\Services\Bog\BogPayment())->payment($config);
            if (data_get($client, 'id')) {
                return redirect()->to($client['_links']['redirect']['href']);
            }

        } catch (\Throwable $th) {
            // Error handling
            $this->notification([
                'title' => __('messages.t_error'),
                'description' => $th->getMessage(),
                'icon' => 'error'
            ]);
        }
    }
}
