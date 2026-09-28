@props([
    'value' => 'value',
    'label' => 'label',
    'selected' => 'false',
    'flag' => '',
    'image' => '',
])
@aware(['onselect' => ''])

@php $selected = filter_var($selected, FILTER_VALIDATE_BOOLEAN); @endphp
<div class="py-2.5 ltr:pl-4 ltr:pr-3 rtl:pr-4 rtl:pl-3 flex items-center cursor-pointer hover:bg-primary-600 text-gray-500 hover:text-white dark:hover:bg-zinc-800 dark:hover:text-zinc-200 bw-select-item dark:text-zinc-300"
    data-label="{{ $label }}" data-value="{{ $value }}" 
    @if($selected) data-selected="true" @endif
    @if($onselect !== '') data-user-function="{{ $onselect }}"@endif>
    @if ($flag !== '' && $image == '')<i class="{{ $flag }} flag"></i>@endif
    @if ($image !== '')<x-bladewind.avatar size="small" class="!mt-0 !mr-4" image="{{ $image }}" />@endif
    <span class="grow ltr:text-left rtl:text-right text-xs+ font-medium">{!! $label !!}</span>
    <x-bladewind.icon name="check-circle" class="text-slate-400 h-5 w-5 hidden svg-{{$value }}" />
</div>