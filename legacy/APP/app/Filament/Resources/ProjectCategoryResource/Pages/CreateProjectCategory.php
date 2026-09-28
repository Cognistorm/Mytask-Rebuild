<?php

namespace App\Filament\Resources\ProjectCategoryResource\Pages;

use App\Filament\Resources\ProjectCategoryResource;
use CactusGalaxy\FilamentAstrotomic\Resources\Pages\Record\CreateTranslatable;
use Filament\Resources\Pages\CreateRecord;

class CreateProjectCategory extends CreateRecord
{
    use CreateTranslatable;

    protected static string $resource = ProjectCategoryResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['uid'] = uid();

        return $data;
    }
}
