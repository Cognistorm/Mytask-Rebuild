<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        $schedule->command('sitemap:generate')->everyMinute();
        $schedule->command('sellers:unavailable')->daily();
        $schedule->command('expired:bids')->daily();
        $schedule->command('app:upgrade-user-level')->twiceDaily(1, 13);
        $schedule->command('subscriptions:process-payments')->everyMinute();
        $schedule->command('refunds:auto-reject')->hourly();
        $schedule->command('backup:run --only-db')->monthly();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
