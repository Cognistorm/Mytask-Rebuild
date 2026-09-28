<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Filament\Resources\UserResource\RelationManagers;
use App\Mail\Admin\Users\SendEmail;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class UserResource extends Resource
{
//    protected static ?string $model = User::class;
    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function model(): string
    {
        return \App\Models\User::class; // Replace with your actual model class
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),
                Tables\Columns\TextColumn::make('username')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email_verified_at')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('fullname')
                    ->searchable(),
                Tables\Columns\TextColumn::make('status'),
                Tables\Columns\IconColumn::make('is_restricted')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->boolean(),
                Tables\Columns\TextColumn::make('balance_net')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_points')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_withdrawn')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_purchases')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_pending')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_available')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->sortable(),
                Tables\Columns\TextColumn::make('deleted_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

            ])
            ->filters([
                SelectFilter::make('status')
                    ->multiple()
                    ->options([
                        'active' => 'Active',
                        'pending' => 'Pending',
                        'verified' => 'Verified',
                        'banned' => 'Banned',
                    ]),
                Filter::make('is_restricted')
                    ->query(fn (Builder $query): Builder => $query->where('is_restricted', true)),
                Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('created_from'),
                        Forms\Components\DatePicker::make('created_until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date),
                            );
                    })
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\ViewAction::make(),
                Tables\Actions\Action::make('.')
                    ->action(function(array $data, $livewire, User $user): void {
                        Mail::to($user->email)->send(new SendEmail($data['subject'], $data['message']));
                        Notification::make()
                            ->title('Email sent successfully')
                            ->success()
                            ->send();
                    })
                    ->icon('heroicon-o-paper-airplane')
                    ->form([
                        TextInput::make('subject')->required(),
                        RichEditor::make('message')->required(),
                    ])
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('username')
                    ->required()
                    ->rules([Rule::exists('users', 'username')])
                    ->maxLength(60),
                Forms\Components\TextInput::make('email')
                    ->rules([Rule::exists('users', 'email')])
                    ->required()
                    ->email()
                    ->maxLength(60),
                Forms\Components\Select::make('account_type')
                    ->required()
                    ->options([
                        'seller' => 'seller',
                        'buyer' => 'buyer'
                    ]),
                Forms\Components\Select::make('avatar_id')
                    ->relationship('avatar', 'id'),
                Forms\Components\TextInput::make('level_id')
                    ->numeric(),
                Forms\Components\TextInput::make('provider_name')
                    ->maxLength(60),
                Forms\Components\TextInput::make('provider_id')
                    ->maxLength(60),
                Forms\Components\TextInput::make('country_id')
                    ->numeric(),
                Forms\Components\TextInput::make('city')
                    ->maxLength(60),
                Forms\Components\TextInput::make('timezone')
                    ->maxLength(60),
                Forms\Components\TextInput::make('fullname')
                    ->maxLength(60),
                Forms\Components\TextInput::make('headline')
                    ->maxLength(100),
                Forms\Components\Textarea::make('description')
                    ->columnSpanFull(),
                Forms\Components\TextInput::make('status')
                    ,
                Forms\Components\Toggle::make('is_restricted')
                    ,
                Forms\Components\TextInput::make('balance_net')

                    ->maxLength(20)
                    ->default(0),
                Forms\Components\TextInput::make('balance_withdrawn')

                    ->maxLength(20)
                    ->default(0),
                Forms\Components\TextInput::make('balance_purchases')

                    ->maxLength(20)
                    ->default(0),
                Forms\Components\TextInput::make('balance_pending')

                    ->maxLength(20)
                    ->default(0),
                Forms\Components\TextInput::make('balance_available')

                    ->maxLength(20)
                    ->default(0),
                Forms\Components\DateTimePicker::make('last_activity'),
                Forms\Components\Toggle::make('active_status')
                    ,
                Forms\Components\Toggle::make('dark_mode')
                    ,
                Forms\Components\TextInput::make('restriction_id')
                    ->numeric(),

                Forms\Components\Section::make('Referral Settings')
                    ->schema([
                        Forms\Components\TextInput::make('referral_code')
                            ->label('Referral Code')
                            ->maxLength(20)
                            ->unique(ignoreRecord: true)
                            ->helperText('Unique code for this user. Leave empty to auto-generate.'),
                    ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\ReferralsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }


}
