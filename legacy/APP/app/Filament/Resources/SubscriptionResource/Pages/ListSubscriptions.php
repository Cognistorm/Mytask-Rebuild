<?php

namespace App\Filament\Resources\SubscriptionResource\Pages;

use App\Filament\Resources\SubscriptionResource;
use Filament\Actions;
use Filament\Resources\Components\Tab;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Database\Eloquent\Builder;
use App\Models\Subscription;

class ListSubscriptions extends ListRecords
{
    protected static string $resource = SubscriptionResource::class;

    public function getTabs(): array
    {
        return [
            'All' => Tab::make(),
            'Active' => Tab::make()
                ->modifyQueryUsing(fn (Builder $query) =>
                $query->where('starts_at', '<=', now())
                    ->where('ends_at', '>', now())
                    ->whereNull('canceled_at')
                ),
            'Cancels' => Tab::make()
                ->modifyQueryUsing(fn (Builder $query) =>
                $query->whereNotNull('cancels_at')
                ),
            'Expired' => Tab::make()
                ->modifyQueryUsing(fn (Builder $query) =>
                    $query->where('ends_at', '<=', now())
                        ->whereNull('canceled_at')
                ),
            'This Month' => Tab::make()
                ->modifyQueryUsing(fn (Builder $query) =>
                    $query->where('created_at', '>=', now()->startOfMonth())
                ),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
