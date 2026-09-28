<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PlanResource\Pages;
use App\Models\Plan;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PlanResource extends Resource
{
    protected static ?string $model = Plan::class;

    protected static ?string $navigationIcon = 'heroicon-o-currency-dollar';

    protected static ?string $navigationLabel = 'Subscription Plans';

    protected static ?string $modelLabel = 'Plan';

    protected static ?string $pluralModelLabel = 'Subscription Plans';

    public static function canCreate(): bool
    {
        return false;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Placeholder::make('plan_name')
                    ->label('Plan')
                    ->content(fn (?Plan $record): string => $record?->getTranslation('name', 'en') ?? '-'),
                Forms\Components\Toggle::make('is_active')
                    ->label('Active')
                    ->helperText('Inactive plans are hidden from the pricing page.'),
                Forms\Components\TextInput::make('price')
                    ->label('Monthly Price')
                    ->numeric()
                    ->minValue(0)
                    ->step(0.01)
                    ->prefix('₾')
                    ->required(),
                Forms\Components\TextInput::make('yearly_price')
                    ->label('Yearly Price (12 months)')
                    ->numeric()
                    ->minValue(0)
                    ->step(0.01)
                    ->prefix('₾')
                    ->helperText('Leave empty to disable yearly billing for this plan.'),
            ])
            ->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Plan')
                    ->getStateUsing(fn (Plan $record): string => $record->getTranslation('name', 'en')),
                Tables\Columns\TextColumn::make('slug'),
                Tables\Columns\TextColumn::make('price')
                    ->label('Monthly Price')
                    ->formatStateUsing(fn ($state): string => '₾ ' . number_format((float) $state, 2))
                    ->sortable(),
                Tables\Columns\TextColumn::make('yearly_price')
                    ->label('Yearly Price')
                    ->formatStateUsing(fn ($state): string => '₾ ' . number_format((float) $state, 2))
                    ->placeholder('Not available')
                    ->sortable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->defaultSort('sort_order');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManagePlans::route('/'),
        ];
    }
}
