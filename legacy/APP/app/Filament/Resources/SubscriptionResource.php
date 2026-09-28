<?php

namespace App\Filament\Resources;

use App\Enums\BillingPeriodEnum;
use App\Filament\Resources\SubscriptionResource\Pages;
use App\Models\User;
use App\Models\Plan;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use App\Models\Subscription;
use Carbon\Carbon;

class SubscriptionResource extends Resource
{
    protected static ?string $model = Subscription::class;

    protected static ?string $navigationIcon = 'heroicon-o-credit-card';

    protected static ?string $navigationLabel = 'Subscriptions';

    protected static ?string $modelLabel = 'Subscription';

    protected static ?string $pluralModelLabel = 'Subscriptions';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('ID')
                    ->sortable(),
                Tables\Columns\TextColumn::make('subscriber.username')
                    ->label('User')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('subscriber.email')
                    ->label('Email')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('name')
                    ->label('Plan')
                    ->searchable(),
                Tables\Columns\TextColumn::make('billing_period')
                    ->label('Billing')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => ($state instanceof BillingPeriodEnum ? $state : BillingPeriodEnum::tryFrom((string) $state) ?? BillingPeriodEnum::Monthly)->label()),
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->colors([
                        'success' => 'Active',
                        'danger' => 'Cancels',
                        'secondary' => 'Expired',
                    ])
                    ->getStateUsing(fn(Subscription $record): string => match (true) {
                        $record->cancels() => 'Cancels',
                        $record->ended() => 'Expired',
                        $record->active() => 'Active',
                        default => 'Inactive',
                    }),
                Tables\Columns\TextColumn::make('starts_at')
                    ->label('Start Date')
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('ends_at')
                    ->label('End Date')
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('canceled_at')
                    ->label('Canceled At')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('Created From'),
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Created Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn(Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn(Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\Action::make('cancel')
                    ->label('Cancel')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn(Subscription $record) => $record->active() && !$record->canceled())
                    ->action(function (Subscription $record) {
                        $now = now();
                        $record->cancels_at = $now;
                        $record->canceled_at = $now;
                        $record->save();
                    }),
            ])
            ->bulkActions([
                //
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('subscriber_id')
                    ->label('User')
                    ->searchable()
                    ->getSearchResultsUsing(fn(string $search): array => User::where('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->limit(50)
                        ->pluck('username', 'id')
                        ->toArray()
                    )
                    ->getOptionLabelUsing(fn($value): ?string => User::find($value)?->username
                    )
                    ->required()
                    ->preload()
                    ->disabled(fn (?string $operation) => $operation === 'edit')
                    ->afterStateUpdated(function ($state, callable $set) {
                        if ($state) {
                            $set('subscriber_type', User::class);
                        }
                    })
                    ->rules(function (?string $operation) {
                        if ($operation !== 'create') {
                            return [];
                        }

                        return [
                            function () {
                                return function (string $attribute, $value, callable $fail) {
                                    if ($value) {
                                        $activeSubscription = Subscription::where('subscriber_id', $value)
                                            ->where('subscriber_type', User::class)
                                            ->whereNull('canceled_at')
                                            ->where(function ($q) {
                                                $q->whereNull('ends_at')
                                                  ->orWhere('ends_at', '>', now());
                                            })
                                            ->exists();

                                        if ($activeSubscription) {
                                            $fail('Cannot create subscription for this user. The user already has an active subscription that has not been cancelled.');
                                        }
                                    }
                                };
                            },
                        ];
                    }),
                Forms\Components\Hidden::make('subscriber_type')
                    ->default(User::class),
                Forms\Components\Select::make('plan_id')
                    ->label('Plan')
                    ->relationship(
                        name: 'plan',
                        titleAttribute: 'name->en',
                        modifyQueryUsing: fn (Builder $query) => $query->where('slug', 'premium'),
                    )
                    ->default(fn () => Plan::where('slug', 'premium')->value('id'))
                    ->required()
                    ->disabled()
                    ->dehydrated()
                    ->afterStateUpdated(function ($state, callable $set) {
                        if ($state) {
                            $plan = Plan::find($state);
                            if ($plan) {
                                $set('slug', $plan->slug);
                            }
                        }
                    }),
                Forms\Components\Select::make('billing_period')
                    ->label('Billing Period')
                    ->options(BillingPeriodEnum::options())
                    ->default(BillingPeriodEnum::Monthly->value)
                    ->required()
                    ->live()
                    ->afterStateUpdated(function ($state, callable $set, callable $get) {
                        if ($state && $get('starts_at')) {
                            $set('ends_at', BillingPeriodEnum::from($state)->addTo(Carbon::parse($get('starts_at')))->format('Y-m-d H:i:s'));
                        }
                    }),
                Forms\Components\DateTimePicker::make('starts_at')
                    ->label('Start Date')
                    ->required()
                    ->live()
                    ->native(false)
                    ->displayFormat('Y-m-d H:i')
                    ->default(now()->addMinute()->startOfMinute())
                    ->disabled(fn (?string $operation) => $operation === 'edit')
                    ->afterStateUpdated(function ($state, callable $set, callable $get) {
                        if ($state) {
                            $billingPeriod = BillingPeriodEnum::tryFrom((string) $get('billing_period')) ?? BillingPeriodEnum::Monthly;
                            $set('ends_at', $billingPeriod->addTo(Carbon::parse($state))->format('Y-m-d H:i:s'));
                        }
                    })
                    ->rules(function (?string $operation) {
                        if ($operation !== 'create') {
                            return [];
                        }
                        return [
                            function () {
                                return function (string $attribute, $value, callable $fail) {
                                    if ($value && Carbon::parse($value)->lessThanOrEqualTo(now())) {
                                        $fail('Start date must be after current time.');
                                    }
                                };
                            },
                        ];
                    }),
                Forms\Components\DateTimePicker::make('ends_at')
                    ->label('End Date')
                    ->required()
                    ->live()
                    ->native(false)
                    ->displayFormat('Y-m-d H:i')
                    ->disabled(fn (callable $get) => !$get('starts_at'))
                    ->minDate(fn (callable $get) => $get('starts_at') ? Carbon::parse($get('starts_at'))->copy()->startOfMinute()->addMinute() : null)
                    ->rules([
                        function (callable $get) {
                            return function (string $attribute, $value, callable $fail) use ($get) {
                                $startsAt = $get('starts_at');

                                if ($startsAt && $value && Carbon::parse($value)->lessThanOrEqualTo(Carbon::parse($startsAt))) {
                                    $fail('End date must be after start date.');
                                }
                            };
                        },
                    ]),
                Forms\Components\DateTimePicker::make('canceled_at')
                    ->label('Canceled At (optional)')
                    ->native(false)
                    ->displayFormat('Y-m-d H:i'),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSubscriptions::route('/'),
            'create' => Pages\CreateSubscription::route('/create'),
            'view' => Pages\ViewSubscription::route('/{record}'),
            'edit' => Pages\EditSubscription::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->with(['subscriber', 'plan']);
    }
}
