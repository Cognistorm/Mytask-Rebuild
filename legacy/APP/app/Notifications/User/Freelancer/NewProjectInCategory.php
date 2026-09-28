<?php

namespace App\Notifications\User\Freelancer;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewProjectInCategory extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Project $project, public $locale = 'en') {}

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $originalLocale = app()->getLocale();
        app()->setLocale($this->locale);

        $categoryName = $this->project->category?->translate($this->locale)?->name
            ?? $this->project->category?->name
            ?? '';

        $projectTitle = $this->project->translate($this->locale)?->title
            ?? $this->project->title
            ?? '';

        $mail = (new MailMessage)
            ->subject(__('messages.t_new_project_in_your_category'))
            ->greeting(__('messages.t_hello_username', ['username' => $notifiable->username]))
            ->line(__('messages.t_new_project_posted_in_category', ['category' => $categoryName]))
            ->line($projectTitle)
            ->action(__('messages.t_view_project'), url('project/' . $this->project->pid . '/' . $this->project->slug));

        app()->setLocale($originalLocale);

        return $mail;
    }

    public function toArray($notifiable)
    {
        return [];
    }
}
