<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ReferralCodeBenefitResource\Pages;
use App\Models\ReferralCodeBenefit;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ReferralCodeBenefitResource extends Resource
{
    protected static ?string $model = ReferralCodeBenefit::class;

    protected static ?string $navigationIcon = 'heroicon-o-gift';

    protected static ?string $navigationGroup = 'Referrals';

    protected static ?string $navigationLabel = 'Referral Code Benefits';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Basic Information')
                    ->schema([
                        Forms\Components\TextInput::make('code')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(50)
                            ->helperText('The referral code that users will use.'),

                        Forms\Components\TextInput::make('name')
                            ->maxLength(255)
                            ->placeholder('Friendly name for this benefit'),

                        Forms\Components\Toggle::make('is_active')
                            ->default(true)
                            ->helperText('Only active benefits will be applied'),
                    ])->columns(2),

                Forms\Components\Section::make('Premium Duration')
                    ->schema([
                        Forms\Components\Select::make('premium_duration_months')
                            ->label('Premium Duration (Months)')
                            ->options([
                                1 => '1 Month',
                                2 => '2 Months',
                                3 => '3 Months',
                                6 => '6 Months',
                                12 => '12 Months',
                            ])
                            ->default(1)
                            ->required()
                            ->helperText('Number of months of free premium to grant'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->sortable()
                    ->limit(30),

                Tables\Columns\IconColumn::make('is_active')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\TextColumn::make('premium_duration_months')
                    ->label('Duration')
                    ->formatStateUsing(fn (int $state): string => $state . ' ' . ($state === 1 ? 'month' : 'months'))
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReferralCodeBenefits::route('/'),
            'create' => Pages\CreateReferralCodeBenefit::route('/create'),
            'edit' => Pages\EditReferralCodeBenefit::route('/{record}/edit'),
        ];
    }
}
