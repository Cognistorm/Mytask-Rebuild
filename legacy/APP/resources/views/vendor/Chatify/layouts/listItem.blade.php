{{-- -------------------- Saved Messages -------------------- --}}
@if($get == 'saved')
    <table class="messenger-list-item m-li-divider !border-b-gray-100 dark:!border-zinc-700"
           data-contact="{{ strtolower(auth()->user()->uid) }}"
           data-contact-id="{{ auth()->id() }}">
        <tr data-action="0">
            {{-- Avatar side --}}
            <td>
                <div class="avatar av-m flex flex-col items-center justify-center bg-blue-100 text-center">
                    <svg class="w-6 h-6 text-blue-500" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <desc></desc>
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M9 4h6a2 2 0 0 1 2 2v14l-5 -3l-5 3v-14a2 2 0 0 1 2 -2"></path>
                    </svg>
                </div>
            </td>
            {{-- center side --}}
            <td>
                <p data-id="{{ auth()->id() }}" data-type="user" class="!text-[13px] !font-medium text-slate-700 rtl:flex rtl:justify-between">
                    @lang('messages.t_saved_messages')
                    <span class="!text-xs font-normal !text-slate-400">@lang('messages.t_you')</span>
                </p>
                <span class="!text-xs !text-slate-400 dark:!text-slate-300">@lang('messages.t_save_messages_secretly')</span>
            </td>
        </tr>
    </table>
@endif

{{-- -------------------- All users/group list -------------------- --}}
@if($get == 'users')
    @php
        mb_internal_encoding("UTF-8");

        $safeUsername = $user->username;
        if (mb_strlen($safeUsername) > 15) {
            $safeUsername = trim(mb_substr($safeUsername, 0, 15)) . '...';
        }

        $body = $lastMessage->body ?? '';
        $body = mb_convert_encoding($body, 'UTF-8', 'UTF-8');

        if (mb_strlen($body) > 30) {
            $body = trim(mb_substr($body, 0, 30)) . '..';
        }
    @endphp

    <table class="messenger-list-item hover:bg-[#e9eef5] dark:hover:bg-[#323232]"
           data-contact="{{ strtolower($user->uid) }}"
           data-contact-id="{{ $user->id }}">
        <tr data-action="0">

            {{-- Avatar side --}}
            <td style="position: relative">
                @if($user->active_status)
                    <span class="activeStatus"></span>
                @endif
                <div class="avatar av-m" style="background-image: url('{{ src($user->avatar) }}');"></div>
            </td>

            {{-- center side --}}
            <td>
                <p data-id="{{ $user->id }}" data-type="user" class="!text-[13px] !font-medium text-slate-700 rtl:flex rtl:justify-between">

                    {{-- Username --}}
                    {{ $safeUsername }}

                    {{-- Last message date --}}
                    <span class="!text-xs font-normal !text-slate-400 contact-item-time"
                          data-time="{{ $lastMessage->created_at }}">
                        {{ format_date($lastMessage->created_at) }}
                    </span>

                </p>

                <span class="!text-xs !text-slate-400 flex items-center justify-between h-5">

                    <div class="rtl:flex" dir="{{ config()->get('direction') }}">
                        {{-- Last Message user indicator --}}
                        {!! $lastMessage->from_id == Auth::user()->id
                            ? '<span class="lastMessageIndicator !text-xs !font-medium ltr:pr-1 rtl:pl-1">' . __("messages.t_you") . '</span>'
                            : '' !!}

                        {{-- Last message body --}}
                        @if($lastMessage->attachment == null)
                            {!! $body !!}
                        @else
                            @php
                                $msg_attach = json_decode($lastMessage->attachment);
                            @endphp

                            {{-- Image/File --}}
                            @if(in_array($msg_attach->extension, config('chatify.attachments.allowed_images')))
                                <div class="flex items-center space-x-1 rtl:space-x-reverse ltr:ml-1.5 rtl:mr-1.5">
                                    <svg class="h-4 w-4 dark:text-gray-300" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>
                                    </svg>
                                    <div>@lang('messages.t_image')</div>
                                </div>
                            @else
                                <div class="flex items-center space-x-1 rtl:space-x-reverse ltr:ml-1.5 rtl:mr-1.5">
                                    <svg class="h-4 w-4 dark:text-gray-300" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"></path>
                                    </svg>
                                    <div>@lang('messages.t_attachment')</div>
                                </div>
                            @endif
                        @endif
                    </div>

                    {{-- New messages counter --}}
                    {!! $unseenCounter > 0 ? "<b class='new-messages-counter'>".$unseenCounter."</b>" : '' !!}

                </span>

            </td>

        </tr>
    </table>
@endif

{{-- -------------------- Search Item -------------------- --}}
@if($get == 'search_item')
    @php
        $safeSearchUsername = $user->username;
        if (mb_strlen($safeSearchUsername) > 15) {
            $safeSearchUsername = trim(mb_substr($safeSearchUsername, 0, 15)) . '..';
        }
    @endphp

    <table class="messenger-list-item" data-contact="{{ strtolower($user->uid) }}" data-contact-id="{{ $user->id }}">
        <tr data-action="0">
            <td class="relative">
                <div class="avatar av-m" style="background-image: url('{{ src($user->avatar) }}');"></div>
            </td>

            <td>
                <p data-id="{{ $user->id }}" data-type="user">
                    {{ $safeSearchUsername }}
                </p>
            </td>
        </tr>
    </table>
@endif

{{-- -------------------- Shared photos Item -------------------- --}}
@if($get == 'sharedPhoto')
    <div class="shared-photo chat-image" style="background-image: url('{{ $image }}')"></div>
@endif
