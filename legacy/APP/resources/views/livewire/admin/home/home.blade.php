<div class="w-full">

    {{-- General statistics --}}
    <div class="w-full mb-12">
        
        {{-- Section title --}}
        <h2 class="text-[15px] font-bold text-black dark:text-white mb-6">
            @lang('dashboard.t_general_stats')
        </h2>

        {{-- Stats --}}
        <ul role="list" class="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">


            {{-- Net income --}}
            <li class="col-span-1">
                <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-transparent rounded-lg text-slate-500 dark:text-zinc-300 inline-flex items-center justify-center px-4 py-3 w-full">

                    {{-- Icon --}}
                    <div class="bg-orange-50 dark:bg-zinc-700 dark:border-transparent border-orange-300 text-orange-600 h-9 w-9 flex items-center justify-center rounded-full border ltr:mr-3 rtl:ml-3 text-xl shrink-0">
                        <i class="ph-duotone ph-images-square"></i>
                    </div>
                    
                    {{-- Title --}}
                    <span class="w-full ltr:text-left rtl:text-right font-medium tracking-wide truncate whitespace-nowrap overflow-hidden text-xs+">
                        @lang('messages.t_net_income')
                    </span>
    
                    {{-- Value --}}
                    <div class="font-bold text-black dark:text-white tracking-wider text-sm">
                        {{ money($net_income, settings('currency')->code, true) }}
                    </div>
    
                </div>
            </li>

            {{-- Income from taxes --}}
            <li class="col-span-1">
                <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-transparent rounded-lg text-slate-500 dark:text-zinc-300 inline-flex items-center justify-center px-4 py-3 w-full">

                    {{-- Icon --}}
                    <div class="bg-red-50 dark:bg-zinc-700 dark:border-transparent border-red-300 text-red-600 h-9 w-9 flex items-center justify-center rounded-full border ltr:mr-3 rtl:ml-3 text-xl shrink-0">
                        <i class="ph-duotone ph-images-square"></i>
                    </div>
                    
                    {{-- Title --}}
                    <span class="w-full ltr:text-left rtl:text-right font-medium tracking-wide truncate whitespace-nowrap overflow-hidden text-xs+">
                        @lang('messages.t_taxes')
                    </span>

                    {{-- Value --}}
                    <div class="font-bold text-black dark:text-white tracking-wider text-sm">
                        {{ money($income_from_taxes, settings('currency')->code, true) }}
                    </div>

                </div>
            </li>

            {{-- Income from commission --}}
            <li class="col-span-1">
                <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-transparent rounded-lg text-slate-500 dark:text-zinc-300 inline-flex items-center justify-center px-4 py-3 w-full">

                    {{-- Icon --}}
                    <div class="bg-indigo-50 dark:bg-zinc-700 dark:border-transparent border-indigo-300 text-indigo-600 h-9 w-9 flex items-center justify-center rounded-full border ltr:mr-3 rtl:ml-3 text-xl shrink-0">
                        <i class="ph-duotone ph-images-square"></i>
                    </div>
                    
                    {{-- Title --}}
                    <span class="w-full ltr:text-left rtl:text-right font-medium tracking-wide truncate whitespace-nowrap overflow-hidden text-xs+">
                        @lang('messages.t_commission')
                    </span>

                    {{-- Value --}}
                    <div class="font-bold text-black dark:text-white tracking-wider text-sm">
                        {{ money($income_from_commission, settings('currency')->code, true) }}
                    </div>

                </div>
            </li>

            {{-- Payouts --}}
            <li class="col-span-1">
                <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-transparent rounded-lg text-slate-500 dark:text-zinc-300 inline-flex items-center justify-center px-4 py-3 w-full">

                    {{-- Icon --}}
                    <div class="bg-lime-50 dark:bg-zinc-700 dark:border-transparent border-lime-300 text-lime-600 h-9 w-9 flex items-center justify-center rounded-full border ltr:mr-3 rtl:ml-3 text-xl shrink-0">
                        <i class="ph-duotone ph-wallet"></i>
                    </div>
                    
                    {{-- Title --}}
                    <span class="w-full ltr:text-left rtl:text-right font-medium tracking-wide truncate whitespace-nowrap overflow-hidden text-xs+">
                        @lang('dashboard.t_total_payout')
                    </span>
    
                    {{-- Value --}}
                    <div class="font-bold text-black dark:text-white tracking-wider text-sm">
                        {{ money($withdrawn_money, settings('currency')->code, true) }}
                    </div>
    
                </div>
            </li>

            {{-- Total gigs --}}
            <li class="col-span-1">
                <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-transparent rounded-lg text-slate-500 dark:text-zinc-300 inline-flex items-center justify-center px-4 py-3 w-full">

                    {{-- Icon --}}
                    <div class="bg-pink-50 dark:bg-zinc-700 dark:border-transparent border-pink-300 text-pink-600 h-9 w-9 flex items-center justify-center rounded-full border ltr:mr-3 rtl:ml-3 text-xl shrink-0">
                        <i class="ph-duotone ph-images-square"></i>
                    </div>
                    
                    {{-- Title --}}
                    <span class="w-full ltr:text-left rtl:text-right font-medium tracking-wide truncate whitespace-nowrap overflow-hidden text-xs+">
                        @lang('messages.t_total_gigs')
                    </span>
    
                    {{-- Value --}}
                    <div class="font-bold text-black dark:text-white tracking-wider text-sm">
                        {{ number_format($total_gigs) }}
                    </div>
    
                </div>
            </li>

            {{-- Total users --}}
            <li class="col-span-1">
                <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-transparent rounded-lg text-slate-500 dark:text-zinc-300 inline-flex items-center justify-center px-4 py-3 w-full">

                    {{-- Icon --}}
                    <div class="bg-green-50 dark:bg-zinc-700 dark:border-transparent border-green-300 text-green-600 h-9 w-9 flex items-center justify-center rounded-full border ltr:mr-3 rtl:ml-3 text-xl shrink-0">
                        <i class="ph-duotone ph-users"></i>
                    </div>
                    
                    {{-- Title --}}
                    <span class="w-full ltr:text-left rtl:text-right font-medium tracking-wide truncate whitespace-nowrap overflow-hidden text-xs+">
                        @lang('messages.t_total_users')
                    </span>
    
                    {{-- Value --}}
                    <div class="font-bold text-black dark:text-white tracking-wider text-sm">
                        {{ number_format($total_users) }}
                    </div>
    
                </div>
            </li>

            {{-- Total messages --}}
            <li class="col-span-1">
                <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-transparent rounded-lg text-slate-500 dark:text-zinc-300 inline-flex items-center justify-center px-4 py-3 w-full">

                    {{-- Icon --}}
                    <div class="bg-blue-50 dark:bg-zinc-700 dark:border-transparent border-blue-300 text-blue-600 h-9 w-9 flex items-center justify-center rounded-full border ltr:mr-3 rtl:ml-3 text-xl shrink-0">
                        <i class="ph-duotone ph-envelope"></i>
                    </div>
                    
                    {{-- Title --}}
                    <span class="w-full ltr:text-left rtl:text-right font-medium tracking-wide truncate whitespace-nowrap overflow-hidden text-xs+">
                        @lang('messages.t_total_messages')
                    </span>
    
                    {{-- Value --}}
                    <div class="font-bold text-black dark:text-white tracking-wider text-sm">
                        {{ number_format($total_messages) }}
                    </div>
    
                </div>
            </li>

            {{-- Total orders --}}
            <li class="col-span-1">
                <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-transparent rounded-lg text-slate-500 dark:text-zinc-300 inline-flex items-center justify-center px-4 py-3 w-full">

                    {{-- Icon --}}
                    <div class="bg-amber-50 dark:bg-zinc-700 dark:border-transparent border-amber-300 text-amber-600 h-9 w-9 flex items-center justify-center rounded-full border ltr:mr-3 rtl:ml-3 text-xl shrink-0">
                        <i class="ph-duotone ph-shopping-cart-simple"></i>
                    </div>
                    
                    {{-- Title --}}
                    <span class="w-full ltr:text-left rtl:text-right font-medium tracking-wide truncate whitespace-nowrap overflow-hidden text-xs+">
                        @lang('dashboard.t_total_orders')
                    </span>
    
                    {{-- Value --}}
                    <div class="font-bold text-black dark:text-white tracking-wider text-sm">
                        {{ number_format($total_sales) }}
                    </div>
    
                </div>
            </li>
            
        </ul>

    </div>

    {{-- Recent records --}}
    <div class="grid grid-cols-12 md:gap-6 gap-y-6 mb-12">

        {{-- Recent users --}}
        <div class="col-span-12 md:col-span-6 bg-white shadow-sm border rounded-xl p-5 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">

            {{-- Section title --}}
            <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                @lang('dashboard.t_recent_users')
            </h2>

            {{-- Section body --}}
            <div class="w-full">
                <div class="flow-root">
                    <ul role="list" class="-mb-9">
                        @foreach ($recent_users as $recent_user)
                            <li wire:key="recent-users-{{ $recent_user->id }}">
                                <div class="relative pb-9">

                                    {{-- Border --}}
                                    @if (!$loop->last)
                                        <span class="absolute top-4 ltr:left-4 rtl:right-4 ltr:ml-0.5 rtl:mr-0.5 h-full w-0.5 bg-gray-200 dark:bg-zinc-700" aria-hidden="true"></span>
                                    @endif

                                    {{-- User --}}
                                    <div class="relative flex space-x-3 rtl:space-x-reverse">

                                        {{-- Avatar --}}
                                        <div>
                                            @if ($recent_user->avatar)
                                                <img src="{{ src($recent_user->avatar) }}" alt="{{ $recent_user->username }}" class="h-10 w-10 rounded-full object-cover ring-8 ring-white dark:ring-zinc-800 bg-gray-200 dark:bg-zinc-800">
                                            @else
                                                <span class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center ring-8 ring-white dark:ring-zinc-800 uppercase text-xs tracking-widest text-gray-500 font-semibold text-center dark:bg-zinc-800 dark:text-zinc-200">
                                                    <span>{{ Str::substr($recent_user->username, 0, 2) }}</span>
                                                </span>
                                            @endif
                                        </div>

                                        {{-- Details --}}
                                        <div class="flex min-w-0 flex-1 justify-between items-center space-x-4 rtl:space-x-reverse">
                                            <div>

                                                {{-- Username --}}
                                                <span class="font-semibold text-gray-900 dark:text-zinc-300 text-xs+ block pb-px">
                                                    {{ $recent_user->username }}
                                                </span>

                                                {{-- Date --}}
                                                <span class="block text-xs font-normal text-gray-400 dark:text-zinc-400">
                                                    {{ format_date($recent_user->created_at) }}
                                                </span>

                                            </div>

                                            {{-- Status --}}
                                            @if ($recent_user->status === 'pending')
                                                <div class="whitespace-nowrap flex items-center text-xs font-semibold text-orange-500 dark:text-orange-400 lowercase ltr:text-right rtl:text-left">
                                                    <i class="ph-duotone ph-dot text-2xl mt-px"></i>
                                                    <span>@lang('messages.t_pending')</span>
                                                </div>
                                            @else
                                                <div class="whitespace-nowrap flex items-center text-xs font-semibold text-green-500 dark:text-green-400 lowercase ltr:text-right rtl:text-left">
                                                    <i class="ph-duotone ph-dot text-2xl mt-px"></i>
                                                    <span>@lang('messages.t_active')</span>
                                                </div>
                                            @endif

                                        </div>
                                    </div>
                                </div>
                            </li>
                        @endforeach
                    </ul>
                </div>
            </div>
        </div>
    
        {{-- Recent gigs --}}
        <div class="col-span-12 md:col-span-6 bg-white shadow-sm border rounded-xl p-5 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">

            {{-- Section title --}}
            <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                @lang('dashboard.t_recent_gigs')
            </h2>

            {{-- Section body --}}
            <div class="w-full">
                <div class="flow-root">
                    <ul role="list" class="-mb-9">
                        @foreach ($recent_gigs as $recent_gig)
                            <li wire:key="recent-gigs-{{ $recent_gig->id }}">
                                <div class="relative pb-9">

                                    {{-- Border --}}
                                    @if (!$loop->last)
                                        <span class="absolute top-4 ltr:left-4 rtl:right-4 ltr:ml-0.5 rtl:mr-0.5 h-full w-0.5 bg-gray-200 dark:bg-zinc-700" aria-hidden="true"></span>
                                    @endif

                                    {{-- Gig --}}
                                    <div class="relative flex space-x-3 rtl:space-x-reverse">

                                        {{-- Thumbnail --}}
                                        <div>
                                            @if ($recent_gig->thumbnail)
                                                <img src="{{ src($recent_gig->thumbnail) }}" alt="{{ $recent_gig->title }}" class="h-10 w-10 rounded-full object-cover ring-8 ring-white dark:ring-zinc-800 bg-gray-200 dark:bg-zinc-800">
                                            @else
                                                <span class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center ring-8 ring-white dark:ring-zinc-800 uppercase text-xs tracking-widest text-gray-500 font-semibold text-center dark:bg-zinc-800 dark:text-zinc-200">
                                                    <span>{{ Str::substr($recent_gig->title, 0, 2) }}</span>
                                                </span>
                                            @endif
                                        </div>

                                        {{-- Details --}}
                                        <div class="flex min-w-0 flex-1 justify-between items-center space-x-4 rtl:space-x-reverse">
                                            <div>

                                                {{-- Title --}}
                                                <span class="font-semibold text-gray-900 dark:text-zinc-300 text-xs+ block pb-px">
                                                    {{ $recent_gig->title }}
                                                </span>

                                                {{-- Date --}}
                                                <span class="block text-xs font-normal text-gray-400 dark:text-zinc-400">
                                                    {{ format_date($recent_gig->created_at) }}
                                                </span>

                                            </div>

                                            {{-- Status --}}
                                            @switch($recent_gig->status)

                                                {{-- Pending --}}
                                                @case('pending')
                                                    <div class="whitespace-nowrap flex items-center text-xs font-semibold text-orange-500 dark:text-orange-400 lowercase ltr:text-right rtl:text-left">
                                                        <i class="ph-duotone ph-dot text-2xl mt-px"></i>
                                                        <span>@lang('messages.t_pending')</span>
                                                    </div>
                                                @break

                                                {{-- Active --}}
                                                @case('active')
                                                    <div class="whitespace-nowrap flex items-center text-xs font-semibold text-green-500 dark:text-green-400 lowercase ltr:text-right rtl:text-left">
                                                        <i class="ph-duotone ph-dot text-2xl mt-px"></i>
                                                        <span>@lang('messages.t_active')</span>
                                                    </div>
                                                @break

                                                {{-- Deleted --}}
                                                @case('deleted')
                                                    <div class="whitespace-nowrap flex items-center text-xs font-semibold text-red-500 dark:text-red-400 lowercase ltr:text-right rtl:text-left">
                                                        <i class="ph-duotone ph-dot text-2xl mt-px"></i>
                                                        <span>@lang('messages.t_deleted')</span>
                                                    </div>
                                                @break
                                                    
                                            @endswitch

                                        </div>
                                    </div>
                                </div>
                            </li>
                        @endforeach
                    </ul>
                </div>
            </div>
        </div>

    </div>

    {{-- Analytics --}}
    <div class="grid grid-cols-12 md:gap-6 gap-y-6 mb-12">

        {{-- Map --}}
        <div class="col-span-12 lg:col-span-8">
            <div class="bg-white shadow-sm border rounded-xl p-5 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">
                
                {{-- Section title --}}
                <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                    @lang('dashboard.t_visitors_map')
                </h2>

                {{-- Section body --}}
                <div class="w-full min-h-[25rem] grid">
                    <div id="world-map-visitors" class="w-full h-full"></div>
                </div>

            </div>
        </div>

        {{-- Top domains --}}
        <div class="col-span-12 lg:col-span-4">
            <div class="bg-white shadow-sm border rounded-xl p-5 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">
                
                {{-- Section title --}}
                <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                    @lang('dashboard.t_top_referrers')
                </h2>

                {{-- Section body --}}
                <div class="w-full">
                    <div class="flow-root">
                        <ul role="list" class="-my-5 divide-y divide-gray-100 dark:divide-zinc-700">
                            @foreach ($tracker_referers as $tracker_referer)
                                <li class="py-4" wire:key="tracker-referers-{{ $tracker_referer->id }}">
                                    <div class="flex items-center space-x-4 rtl:space-x-reverse">

                                        {{-- Favicon --}}
                                        <div class="flex-shrink-0">
                                            <img class="h-5 w-5" src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://{{ $tracker_referer->domain?->name }}&size=50" alt="{{ $tracker_referer->domain?->name }}">
                                        </div>

                                        {{-- Domain name --}}
                                        <div class="min-w-0 flex-1">
                                            <a href="https://{{ $tracker_referer->domain?->name }}" target="_blank" class="truncate text-sm font-semibold text-gray-700 hover:text-primary-600 dark:text-zinc-300 dark:hover:text-primary-600">
                                                {{ $tracker_referer->domain?->name }}
                                            </a>
                                        </div>

                                        {{-- Counter --}}
                                        <div class="font-normal text-xs+ text-gray-500 dark:text-zinc-400">
                                            {{ number_format($tracker_referer->count) }}
                                        </div>

                                    </div>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                </div>

            </div>
        </div>

        {{-- Top browsers --}}
        <div class="col-span-12 lg:col-span-4">
            <div class="bg-white shadow-sm border rounded-xl p-5 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">
                
                {{-- Section title --}}
                <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                    @lang('dashboard.t_browsers')
                </h2>

                {{-- Section body --}}
                <div class="w-full">
                    <div id="tracker-browsers" class="w-full"></div>
                </div>

            </div>
        </div>

        {{-- Top platforms --}}
        <div class="col-span-12 lg:col-span-4">
            <div class="bg-white shadow-sm border rounded-xl p-5 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">
                
                {{-- Section title --}}
                <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                    @lang('dashboard.t_platforms')
                </h2>

                {{-- Section body --}}
                <div class="w-full">
                    <div id="tracker-platforms" class="w-full"></div>
                </div>

            </div>
        </div>

        {{-- Devices --}}
        <div class="col-span-12 lg:col-span-4">
            <div class="bg-white shadow-sm border rounded-xl p-5 dark:bg-zinc-800 dark:shadow-none dark:border-transparent">
                
                {{-- Section title --}}
                <h2 class="text-[15px] font-bold text-black dark:text-white mb-10">
                    @lang('dashboard.t_devices')
                </h2>

                {{-- Section body --}}
                <div class="w-full">
                    <div id="tracker-devices" class="w-full"></div>
                </div>

            </div>
        </div>

    </div>

</div>

{{-- Inject Css --}}
@push('styles')
    
    {{-- JsVectorMap --}}
    <link rel="stylesheet" href="{{ asset('js/plugins/jvectormap/jquery-jvectormap-2.0.5.css') }}" />

    {{-- Apexcharts --}}
    <link rel="stylesheet" href="{{ asset('js/plugins/apexcharts/apexcharts.css') }}">

    {{-- JVectorMap css --}}
    <style>
        .jvectormap-tip {
            z-index: 11 !important;
        }
    </style>

@endpush

{{-- Inject Js --}}
@push('scripts')

    {{-- jVectorMap --}}
    <script src="https://code.jquery.com/jquery-3.3.1.js"></script>
    <script src="{{ asset('js/plugins/jvectormap/jquery-jvectormap-2.0.5.min.js') }}"></script>
    <script src="{{ asset('js/plugins/jvectormap/jquery-jvectormap-world-mill.js') }}"></script>
    <script>
        $(function() {

            // Get data
            var data   = @json($tracker_map);

            // empty array
            var visits = [];

            // Loop through data
            data.forEach((element, index) => {

                const el = {
                    [element.country_code]: element.count
                };

                visits.push(el)
            });

            // Set results
            var result = visits.reduce((a, c) => {
                let [
                    [k, v]
                ] = Object.entries(c);
                a[k] = v;
                return a;
            }, {});

            // Initialize map
            $('#world-map-visitors').vectorMap({
                map: 'world_mill',
                backgroundColor: 'transparent',
                regionStyle: {
                    initial: {
                        fill            : '#94a3b8',
                        "fill-opacity"  : 1,
                        stroke          : 'none',
                        "stroke-width"  : 0,
                        "stroke-opacity": 1
                    },
                    hover: {
                        "fill-opacity": 0.8,
                        cursor        : 'pointer'
                    },
                    selected: {
                        fill: '#94a3b8'
                    },
                    selectedHover: {}
                },
                series: {
                    regions: [{
                        values           : result,
                        scale            : ['#334155', '#0f172a'],
                        normalizeFunction: 'polynomial'
                    }]
                },
                onRegionTipShow: function(e, el, code) {
                    if (result[code]) {
                        el.html(el.html() + ' ( ' + result[
                            code] + ' )');
                    }
                }
            });

        });
    </script>

    {{-- ApexCharts --}}
    <script src="{{ asset('js/plugins/apexcharts/apexcharts.min.js') }}"></script>

    {{-- Browsers --}}
    <script>

        // Set data
        var data       = @json($tracker_browsers);
        var series     = [];
        var categories = [];

        // Loop through data
        data.forEach(element => {
            series.push(Number(element.count))
            categories.push(element.browser)
        });

        // Set chart options
        var options = {
            series: [{ data: series }],
            chart: {
                height    : 350,
                type      : 'bar',
                fontFamily: "@php echo settings('appearance')->font_family @endphp" + ', sans-serif',
                fontWeight: 'bold',
            },
            plotOptions: {
                bar: {
                    columnWidth: '45%',
                    distributed: true,
                }
            },
            dataLabels: { enabled: false },
            legend: { show: false },
            xaxis: {
                categories: categories,
                labels: {
                    style: {
                        fontSize: '12px'
                    }
                }
            },
            grid: {
                show: false,
            },
            tooltip: {
                custom: function({series, seriesIndex, dataPointIndex, w}) {
                    return '<div class="bg-black px-3 py-1 text-white font-semibold bg-opacity-80 tracking-wider">' + series[seriesIndex][dataPointIndex] + '</div>'
                }
            }
        };

        // Render chart
        var chart = new ApexCharts(document.querySelector("#tracker-browsers"), options);
        chart.render();

    </script>

    {{-- Platforms --}}
    <script>

        // Set data
        var data       = @json($tracker_platforms);
        var series     = [];
        var categories = [];

        // Loop through data
        data.forEach(element => {
            series.push(Number(element.count))
            categories.push(element.platform)
        });

        // Set chart options
        var options = {
            series: [{ data: series }],
            colors : ['#b84644', '#C4E538', '#1B1464', '#EE5A24', '#4576b5'],
            chart: {
                height    : 350,
                type      : 'bar',
                fontFamily: "@php echo settings('appearance')->font_family @endphp" + ', sans-serif',
                fontWeight: 'bold',
            },
            plotOptions: {
                bar: {
                    columnWidth: '45%',
                    distributed: true,
                }
            },
            dataLabels: { enabled: false },
            legend: { show: false },
            xaxis: {
                categories: categories,
                labels: {
                    style: {
                        fontSize: '12px'
                    }
                }
            },
            grid: {
                show: false,
            },
            tooltip: {
                custom: function({series, seriesIndex, dataPointIndex, w}) {
                    return '<div class="bg-black px-3 py-1 text-white font-semibold bg-opacity-80 tracking-wider">' + series[seriesIndex][dataPointIndex] + '</div>'
                }
            }
        };

        // Render chart
        var chart = new ApexCharts(document.querySelector("#tracker-platforms"), options);
        chart.render();

    </script>

    {{-- Devices --}}
    <script>

        // Set data
        var data       = @json($tracker_devices);
        var series     = [];
        var categories = [];

        // Loop through data
        data.forEach(element => {
            series.push(Number(element.count))
            categories.push(element.kind)
        });

        // Set chart options
        var options = {
            series: [{ data: series }],
            colors : ['#FC427B', '#18dcff', '#EAB543', '#EE5A24', '#4576b5'],
            chart: {
                height    : 350,
                type      : 'bar',
                fontFamily: "@php echo settings('appearance')->font_family @endphp" + ', sans-serif',
                fontWeight: 'bold',
            },
            plotOptions: {
                bar: {
                    columnWidth: '45%',
                    distributed: true,
                }
            },
            dataLabels: { enabled: false },
            legend: { show: false },
            xaxis: {
                categories: categories,
                labels: {
                    style: {
                        fontSize: '12px'
                    }
                }
            },
            grid: {
                show: false,
            },
            tooltip: {
                custom: function({series, seriesIndex, dataPointIndex, w}) {
                    return '<div class="bg-black px-3 py-1 text-white font-semibold bg-opacity-80 tracking-wider">' + series[seriesIndex][dataPointIndex] + '</div>'
                }
            }
        };

        // Render chart
        var chart = new ApexCharts(document.querySelector("#tracker-devices"), options);
        chart.render();

    </script>
    
@endpush