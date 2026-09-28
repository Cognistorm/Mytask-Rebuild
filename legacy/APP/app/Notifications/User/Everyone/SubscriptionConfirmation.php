<?php

namespace App\Notifications\User\Everyone;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class SubscriptionConfirmation extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Subscription
     *
     * @var object
     */
    public $subscription;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct($subscription)
    {
        $this->subscription = $subscription;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        $subject = __('messages.t_subject_subscription_confirmation');

        return (new MailMessage)
            ->subject($subject)
            ->greeting(__('messages.t_congratulations'))
            ->line(new HtmlString(__('messages.t_subscription_active_until', ['date' => $this->subscription->ends_at->format('d.m.Y')])))
            ->line(__('messages.t_thank_you_mytask'));
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            //
        ];
    }
}
