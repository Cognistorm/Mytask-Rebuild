<?php

namespace App\Livewire\Admin\Includes;

use Livewire\Component;

class Sidebar extends Component
{
    public $links;

    /**
     * Initialize component

     *

     * @return void
     */
    public function mount()
    {

        // Set dashboard link

        $dashboard = url(config('global.dashboard_prefix'));

        // Set links

        $this->links = [

            // Home

            [

                'icon' => 'house',

                'text' => __('messages.t_dashboard'),

                'href' => $dashboard,

                'path' => config('global.dashboard_prefix'),

                'childs' => null,

            ],

            // Users

            [

                'icon' => 'users',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/users',

                'text' => __('messages.t_users'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/users"],

                    ['text' => __('messages.t_create_new'), 'href' => "$dashboard/users/create"],

                    ['text' => __('messages.t_levels'), 'href' => "$dashboard/levels"],

                    ['text' => __('messages.t_verifications'), 'href' => "$dashboard/verifications"],

                    ['text' => __('messages.t_transactions'), 'href' => "$dashboard/users/transactions"],

                ],

            ],

            // Withdrawals

            [

                'icon' => 'bank',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/withdrawals',

                'text' => __('messages.t_withdrawals'),

                'childs' => [

                    ['text' => __('messages.t_withdrawals_history'), 'href' => "$dashboard/withdrawals"],

                ],

            ],

            // Portfolios

            [

                'icon' => 'paint-brush',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/portfolios',

                'text' => __('messages.t_portfolios'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/portfolios"],

                ],

            ],

            // Gigs

            [

                'icon' => 'images',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/gigs',

                'text' => __('messages.t_gigs'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/gigs"],

                ],

            ],

            // Packages

            [

                'icon' => 'table',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/packages',

                'text' => __('dashboard.t_packages'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/packages"],

                    ['text' => __('dashboard.t_attributes'), 'href' => "$dashboard/attributes"],

                ],

            ],

            // Invoices

            [

                'icon' => 'receipt',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/invoices',

                'text' => __('messages.t_invoices'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/invoices"],

                ],

            ],

            // Orders

            [

                'icon' => 'shopping-bag',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/orders',

                'text' => __('messages.t_orders'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/orders"],

                ],

            ],

            // Refunds

            [

                'icon' => 'credit-card',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/refunds',

                'text' => __('messages.t_refunds'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/refunds"],

                ],

            ],

            // Unblock Requests

            [

                'icon' => 'lock-open',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/unblock-requests',

                'text' => __('messages.t_unblock_money_requests'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/unblock-requests"],

                ],

            ],

            // Reviews

            [

                'icon' => 'star',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/reviews',

                'text' => __('messages.t_reviews'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/reviews"],

                ],

            ],

            // Projects

            [

                'icon' => 'briefcase-metal',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/projects',

                'text' => __('messages.t_projects'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/projects"],

                    ['text' => __('messages.t_bids'), 'href' => "$dashboard/projects/bids"],

                    ['text' => __('messages.t_categories'), 'href' => "$dashboard/projects/categories"],

                    ['text' => __('messages.t_plans'), 'href' => "$dashboard/projects/plans"],

                    ['text' => __('messages.t_subscriptions'), 'href' => "$dashboard/projects/subscriptions"],

                    ['text' => __('messages.t_settings'), 'href' => "$dashboard/projects/settings"],

                ],

            ],

            // Offers

            [

                'icon' => 'gift',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/offers',

                'text' => __('messages.t_offers'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/offers"],

                ],

            ],

            // Categories

            [

                'icon' => 'list-dashes',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/categories',

                'text' => __('messages.t_categories'),

                'childs' => [

                    ['text' => __('messages.t_categories'), 'href' => "$dashboard/categories"],

                    ['text' => __('messages.t_subcategories'), 'href' => "$dashboard/subcategories"],

                    ['text' => __('dashboard.t_childcategories'), 'href' => "$dashboard/childcategories"],

                ],

            ],

            // Reports

            [

                'icon' => 'warning',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/reports',

                'text' => __('messages.t_reports'),

                'childs' => [

                    ['text' => __('messages.t_users'), 'href' => "$dashboard/reports/users"],

                    ['text' => __('messages.t_gigs'), 'href' => "$dashboard/reports/gigs"],

                    ['text' => __('messages.t_projects'), 'href' => "$dashboard/reports/projects"],

                    ['text' => __('messages.t_bids'), 'href' => "$dashboard/reports/bids"],

                ],

            ],

            // Conversations

            [

                'icon' => 'chats',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/conversations',

                'text' => __('messages.t_conversations'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/conversations"],

                ],

            ],

            // Advertisements

            [

                'icon' => 'flag-banner',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/advertisements',

                'text' => __('messages.t_advertisements'),

                'childs' => [

                    ['text' => __('messages.t_setup_ads'), 'href' => "$dashboard/advertisements"],

                ],

            ],

            // Blog

            [

                'icon' => 'newspaper',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/blog',

                'text' => __('messages.t_blog'),

                'childs' => [

                    ['text' => __('messages.t_browse_articles'), 'href' => "$dashboard/blog"],

                    ['text' => __('messages.t_comments'), 'href' => "$dashboard/blog/comments"],

                    ['text' => __('messages.t_create_article'), 'href' => "$dashboard/blog/create"],

                    ['text' => __('messages.t_blog_settings'), 'href' => "$dashboard/blog/settings"],

                ],

            ],

            // Support

            [

                'icon' => 'lifebuoy',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/support',

                'text' => __('messages.t_support'),

                'childs' => [

                    ['text' => __('messages.t_messages'), 'href' => "$dashboard/support"],

                ],

            ],

            // Newsletter

            [

                'icon' => 'envelope',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/newsletter',

                'text' => __('messages.t_newsletter'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/newsletter"],

                    ['text' => __('messages.t_settings'), 'href' => "$dashboard/newsletter/settings"],

                ],

            ],

            // Languages

            [

                'icon' => 'globe',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/languages',

                'text' => __('messages.t_languages'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/languages"],

                    ['text' => __('messages.t_create_new'), 'href' => "$dashboard/languages/create"],

                ],

            ],

            // Pages

            [

                'icon' => 'file-text',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/pages',

                'text' => __('messages.t_pages'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/pages"],

                    ['text' => __('messages.t_create_new'), 'href' => "$dashboard/pages/create"],

                ],

            ],

            // Countries

            [

                'icon' => 'globe-hemisphere-east',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/countries',

                'text' => __('messages.t_countries'),

                'childs' => [

                    ['text' => __('messages.t_browse_all'), 'href' => "$dashboard/countries"],

                    ['text' => __('messages.t_create_new'), 'href' => "$dashboard/countries/create"],

                ],

            ],

            // Services

            [

                'icon' => 'puzzle-piece',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/services',

                'text' => __('messages.t_services'),

                'childs' => [

                    ['text' => __('dashboard.t_payment_gateways'), 'href' => "$dashboard/services/payment"],

                    ['text' => __('messages.t_recaptcha'), 'href' => "$dashboard/services/recaptcha"],

                    ['text' => __('dashboard.t_cloud_storage'), 'href' => "$dashboard/services/cloud"],

                    ['text' => __('dashboard.t_findip_net'), 'href' => "$dashboard/services/findip"],

                ],

            ],

            // Settings

            [

                'icon' => 'gear',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/settings',

                'text' => __('messages.t_settings'),

                'childs' => [

                    ['text' => __('messages.t_general_settings_sidebar'), 'href' => "$dashboard/settings/general"],

                    ['text' => __('messages.t_appearance_settings_sidebar'), 'href' => "$dashboard/settings/appearance"],

                    ['text' => __('messages.t_currency_settings_sidebar'), 'href' => "$dashboard/settings/currency"],

                    ['text' => __('messages.t_auth_settings_sidebar'), 'href' => "$dashboard/settings/auth"],

                    ['text' => __('messages.t_live_chat_settings_sidebar'), 'href' => "$dashboard/settings/chat"],

                    ['text' => __('messages.t_commission_settings_sidebar'), 'href' => "$dashboard/settings/commission"],

                    ['text' => __('messages.t_footer_settings_sidebar'), 'href' => "$dashboard/settings/footer"],

                    ['text' => __('messages.t_media_settings_sidebar'), 'href' => "$dashboard/settings/media"],

                    ['text' => __('messages.t_publish_settings_sidebar'), 'href' => "$dashboard/settings/publish"],

                    ['text' => __('messages.t_security_settings_sidebar'), 'href' => "$dashboard/settings/security"],

                    ['text' => __('messages.t_seo_settings_sidebar'), 'href' => "$dashboard/settings/seo"],

                    ['text' => __('messages.t_smtp_settings_sidebar'), 'href' => "$dashboard/settings/smtp"],

                    ['text' => __('messages.t_hero_section'), 'href' => "$dashboard/settings/hero"],

                    ['text' => __('messages.t_withdrawal_settings_sidebar'), 'href' => "$dashboard/settings/withdrawal"],

                ],

            ],

            // System

            [

                'icon' => 'terminal-window',

                'href' => null,

                'path' => config('global.dashboard_prefix').'/system',

                'text' => __('messages.t_system'),

                'childs' => [

                    ['text' => __('messages.t_cron_jobs'), 'href' => "$dashboard/system/crontab"],

                    ['text' => __('messages.t_logs'), 'href' => "$dashboard/system/logs"],

                    ['text' => __('messages.t_cache'), 'href' => "$dashboard/system/cache"],

                    ['text' => __('messages.t_maintenance'), 'href' => "$dashboard/system/maintenance"],

                    ['text' => __('dashboard.t_factory_reset'), 'href' => "$dashboard/system/reset"],

                    ['text' => __('dashboard.t_licensing'), 'href' => "$dashboard/system/licensing"],

                ],

            ],

        ];

    }

    /**
     * Render component

     *

     * @return Illuminate\View\View
     */
    public function render()
    {

        return view('livewire.admin.includes.sidebar');

    }

}
