<?php

namespace App\Filament\Resources\SubscriptionResource\Pages;

use App\Filament\Resources\SubscriptionResource;
use App\Models\Plan;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateSubscription extends CreateRecord
{
    protected static string $resource = SubscriptionResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $plan = null;

        if (! empty($data['plan_id'])) {
            $plan = Plan::find($data['plan_id']);
        }

        if (! $plan) {
            $plan = Plan::where('slug', 'premium')->first();
            if ($plan) {
                $data['plan_id'] = $plan->id;
            }
        }

        if ($plan) {
            $data['name'] = [
                'en' => $plan->getTranslations('name')['en'] ?? $plan->name,
                'ka' => $plan->getTranslations('name')['ka'] ?? $plan->name,
            ];
            $data['slug'] = $plan->slug;
        }

        return $data;
    }
}
