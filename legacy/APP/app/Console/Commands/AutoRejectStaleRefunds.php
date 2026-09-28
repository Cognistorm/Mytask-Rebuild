<?php

namespace App\Console\Commands;

use App\Enums\ProjectRefundStatus;
use App\Models\Refund;
use App\Models\ProjectRefund;
use Illuminate\Console\Command;

class AutoRejectStaleRefunds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'refunds:auto-reject';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark pending refunds with no seller response for 2+ days as rejected_by_seller';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $threshold = now()->subDays(2);

        $affected = Refund::query()
            ->where('status', 'pending')
            ->where('created_at', '<=', $threshold)
            ->update(['status' => 'rejected_by_seller']);

        $projectAffected = ProjectRefund::query()
            ->where('status', ProjectRefundStatus::PENDING)
            ->where('created_at', '<=', $threshold)
            ->update(['status' => ProjectRefundStatus::REJECTED_BY_SELLER]);

        $this->info("Auto-rejected {$affected} gig refund(s) and {$projectAffected} project refund(s).");

        return self::SUCCESS;
    }
}
