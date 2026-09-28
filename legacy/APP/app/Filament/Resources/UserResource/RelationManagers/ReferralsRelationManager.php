<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Models\Referral;
use App\Enums\ReferralStatus;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class ReferralsRelationManager extends RelationManager
{
    protected static string $relationship = 'referrals';

    protected static ?string $recordTitleAttribute = 'referral_code';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('referred_user_id')
                    ->relationship('referredUser', 'email')
                    ->required()
                    ->searchable(),
                Forms\Components\TextInput::make('referral_code')
                    ->required()
                    ->maxLength(255),
                Forms\Components\Select::make('status')
                    ->options([
                        ReferralStatus::PENDING->value => 'Pending',
                        ReferralStatus::VERIFIED->value => 'Verified',
                        ReferralStatus::CANCELLED->value => 'Cancelled',
                    ])
                    ->required(),
                Forms\Components\DateTimePicker::make('referred_at'),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('referral_code')
            ->modifyQueryUsing(fn ($query) => $query->with(['referredUser.subscriptions' => fn ($q) => $q->active()]))
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),
                Tables\Columns\TextColumn::make('referredUser.email')
                    ->label('Referred User Email')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('referredUser.username')
                    ->label('Referred User Name')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('premium_type')
                    ->label('Premium')
                    ->getStateUsing(function (Referral $record): string {
                        if ($record->referredUser?->hasPaidPremium()) {
                            return 'Paid';
                        } elseif ($record->referredUser?->hasGiftedPremium()) {
                            return 'Bonus';
                        }
                        return '-';
                    })
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'Paid', 'Bonus' => 'success',
                        default => 'gray',
                    }),
                Tables\Columns\IconColumn::make('has_premium')
                    ->label('Premium Status')
                    ->getStateUsing(fn (Referral $record): bool => $record->referredUser?->hasPaidPremium() || $record->referredUser?->hasGiftedPremium())
                    ->boolean()
                    ->trueIcon('heroicon-o-check-badge')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('gray')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('referral_code')
                    ->label('Referral Code')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn ($state): string => match ($state) {
                        ReferralStatus::PENDING => 'warning',
                        ReferralStatus::VERIFIED => 'success',
                        ReferralStatus::CANCELLED => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('totalPoints')
                    ->label('Total Points Earned')
                    ->getStateUsing(function (Referral $record): string {
                        $totalPoints = \DB::table('referral_earnings')
                            ->where('referrer_id', $record->referrer_id)
                            ->where('referred_user_id', $record->referred_user_id)
                            ->sum('points');
                        return $totalPoints ?: '0';
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('referred_at')
                    ->label('Referred Date')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        ReferralStatus::PENDING->value => 'Pending',
                        ReferralStatus::VERIFIED->value => 'Verified',
                        ReferralStatus::CANCELLED->value => 'Cancelled',
                    ]),
                Tables\Filters\SelectFilter::make('premium_type')
                    ->label('Premium Type')
                    ->options([
                        'paid' => 'Paid',
                        'bonus' => 'Bonus',
                        'none' => 'No Premium',
                    ])
                    ->query(function ($query, $state) {
                        if ($state['value'] === 'paid') {
                            return $query->whereHas('referredUser', fn ($q) => $q->withPaidPremium());
                        } elseif ($state['value'] === 'bonus') {
                            return $query->whereHas('referredUser', fn ($q) => $q->withGiftedPremium());
                        } elseif ($state['value'] === 'none') {
                            return $query->whereHas('referredUser', fn ($q) => $q->withoutPremium());
                        }
                        return $query;
                    }),
            ])
            ->headerActions([
                Tables\Actions\Action::make('total_referrals')
                    ->label(fn () => "Total: " . $this->getOwnerRecord()->referrals()->count())
                    ->icon('heroicon-o-users')
                    ->color('primary')
                    ->badge()
                    ->disabled(),
                Tables\Actions\Action::make('premium_referrals')
                    ->label(function () {
                        $referrals = $this->getOwnerRecord()->referrals()
                            ->with(['referredUser.subscriptions' => fn ($q) => $q->active()])
                            ->get();
                        $paid = $referrals->filter(fn($r) => $r->referredUser?->hasPaidPremium())->count();
                        $bonus = $referrals->filter(fn($r) => $r->referredUser?->hasGiftedPremium())->count();
                        $total = $paid + $bonus;
                        return "Premium: {$total} ({$paid} Paid, {$bonus} Bonus)";
                    })
                    ->icon('heroicon-o-check-badge')
                    ->color('success')
                    ->badge()
                    ->disabled(),
            ])
            ->actions([
                //
            ])
            ->bulkActions([
                //
            ])
            ->defaultSort('created_at', 'desc');
    }
}
