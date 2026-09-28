<?php

namespace App\Filament\Resources\ReferralCodeBenefitResource\Pages;

use App\Filament\Resources\ReferralCodeBenefitResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditReferralCodeBenefit extends EditRecord
{
    protected static string $resource = ReferralCodeBenefitResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
