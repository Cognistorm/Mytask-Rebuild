<?php

namespace App\Livewire\Admin\Users\Transactions;

use App\Http\Validators\Admin\Users\RejectDepositValidator;
use App\Models\DepositTransaction;
use App\Notifications\User\Everyone\DepositRejected;
use Artesaos\SEOTools\Traits\SEOTools as SEOToolsTrait;
use Jantinnerezo\LivewireAlert\LivewireAlert;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

class TransactionsComponent extends Component
{
    use LivewireAlert, SEOToolsTrait, WithPagination;

    public $rejection_reason;

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    #[Layout('components.layouts.admin-app')]

    public function render()
    {

        // Seo

        $this->seo()->setTitle(setSeoTitle(__('messages.t_transactions_history'), true));

        $this->seo()->setDescription(settings('seo')->description);

        return view('livewire.admin.users.transactions.transactions', [

            'transactions' => $this->transactions,

        ]);

    }

    /**
     * Get list of transactions

     *

     * @return object
     */
    public function getTransactionsProperty()
    {

        return DepositTransaction::whereHas('user')->latest()->paginate(42);

    }

    /**
     * Approve selected transaction

     *

     * @param  int  $id
     * @return mixed
     */
    public function approve($id)
    {

        try {

            // Get transaction

            $transaction = DepositTransaction::where('id', $id)->where('status', 'pending')->firstOrFail();

            // approve user deposit

            $transaction->user->update([

                'balance_available' => $transaction->user->balance_available + $transaction->amount_net,

            ]);

            // Update transaction status

            $transaction->status = 'paid';

            $transaction->save();

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

        } catch (\Throwable $th) {

            throw $th;
        }

    }

    /**
     * Reject payment

     *

     * @param  int  $id
     * @return mixed
     */
    public function reject($id)
    {

        try {

            // Get transaction

            $transaction = DepositTransaction::where('id', $id)->where('status', 'pending')->firstOrFail();

            // Validate form

            RejectDepositValidator::validate($this);

            // Update transaction status

            $transaction->status = 'rejected';

            $transaction->reject_reason = $this->rejection_reason;

            $transaction->save();

            // Send notification to this user

            $transaction->user->notify(new DepositRejected($transaction, $this->rejection_reason));

            // Close modal

            $this->dispatch('close-modal', 'modal-reject-payment-container-'.$id);

            // Reset form

            $this->reset('rejection_reason');

            // Success

            $this->alert(

                'success',

                __('messages.t_success'),

                livewire_alert_params(__('messages.t_toast_operation_success'))

            );

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

}
