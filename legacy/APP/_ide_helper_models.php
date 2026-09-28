<?php

// @formatter:off
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */

namespace App\Models{
    /**
     * App\Models\Admin
     *
     * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
     * @property-read int|null $notifications_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
     * @property-read int|null $tokens_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Admin newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Admin newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Admin query()
     */
    class Admin extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Advertisement
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Advertisement newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Advertisement newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Advertisement query()
     */
    class Advertisement extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Article
     *
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ArticleComment> $comments
     * @property-read int|null $comments_count
     * @property-read \App\Models\FileManager|null $image
     * @property-read \App\Models\ArticleSeo|null $seo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Article newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Article newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Article query()
     */
    class Article extends \Eloquent implements \Spatie\Sitemap\Contracts\Sitemapable {}
}

namespace App\Models{
    /**
     * App\Models\ArticleComment
     *
     * @property-read \App\Models\Article|null $article
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ArticleComment newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ArticleComment newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ArticleComment query()
     */
    class ArticleComment extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ArticleSeo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ArticleSeo newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ArticleSeo newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ArticleSeo query()
     */
    class ArticleSeo extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\AutomaticPaymentGateway
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|AutomaticPaymentGateway newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|AutomaticPaymentGateway newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|AutomaticPaymentGateway query()
     */
    class AutomaticPaymentGateway extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\BannedIp
     *
     * @method static \Illuminate\Database\Eloquent\Builder|BannedIp newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|BannedIp newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|BannedIp query()
     */
    class BannedIp extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\BlogSettings
     *
     * @method static \Illuminate\Database\Eloquent\Builder|BlogSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|BlogSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|BlogSettings query()
     */
    class BlogSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\CashfreeSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|CashfreeSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CashfreeSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CashfreeSettings query()
     */
    class CashfreeSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Category
     *
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Gig> $gigs
     * @property-read int|null $gigs_count
     * @property-read \App\Models\FileManager|null $icon
     * @property-read \App\Models\FileManager|null $image
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Subcategory> $subcategories
     * @property-read int|null $subcategories_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Category newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Category newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Category query()
     */
    class Category extends \Eloquent implements \Spatie\Sitemap\Contracts\Sitemapable {}
}

namespace App\Models{
    /**
     * App\Models\ChFavorite
     *
     * @property int $id
     * @property int $user_id
     * @property int $favorite_id
     * @property \Illuminate\Support\Carbon|null $created_at
     * @property \Illuminate\Support\Carbon|null $updated_at
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ChFavorite newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ChFavorite newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ChFavorite query()
     * @method static \Illuminate\Database\Eloquent\Builder|ChFavorite whereCreatedAt($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChFavorite whereFavoriteId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChFavorite whereId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChFavorite whereUpdatedAt($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChFavorite whereUserId($value)
     */
    class ChFavorite extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ChMessage
     *
     * @property int $id
     * @property int $from_id
     * @property int $to_id
     * @property string|null $body
     * @property string|null $attachment
     * @property int $seen
     * @property \Illuminate\Support\Carbon|null $created_at
     * @property \Illuminate\Support\Carbon|null $updated_at
     * @property-read \App\Models\FileManager|null $avatar
     * @property-read \App\Models\User|null $from
     * @property-read \App\Models\User|null $to
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage query()
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage whereAttachment($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage whereBody($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage whereCreatedAt($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage whereFromId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage whereId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage whereSeen($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage whereToId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|ChMessage whereUpdatedAt($value)
     */
    class ChMessage extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\CheckoutWebhook
     *
     * @method static \Illuminate\Database\Eloquent\Builder|CheckoutWebhook newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CheckoutWebhook newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CheckoutWebhook query()
     */
    class CheckoutWebhook extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Conversation
     *
     * @property-read \App\Models\User|null $blocker
     * @property-read \App\Models\User|null $from
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ConversationMessage> $messages
     * @property-read int|null $messages_count
     * @property-read \App\Models\User|null $sender
     * @property-read \App\Models\User|null $to
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ConversationMessage> $unreadMessages
     * @property-read int|null $unread_messages_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Conversation newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Conversation newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Conversation query()
     */
    class Conversation extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ConversationMessage
     *
     * @property-read \App\Models\User|null $sender
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ConversationMessage newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ConversationMessage newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ConversationMessage query()
     */
    class ConversationMessage extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Country
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Country newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Country newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Country query()
     */
    class Country extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\CustomOffer
     *
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CustomOfferAttachment> $attachments
     * @property-read int|null $attachments_count
     * @property-read \App\Models\User|null $buyer
     * @property-read \App\Models\User|null $freelancer
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CustomOfferWork> $work
     * @property-read int|null $work_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOffer newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOffer newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOffer query()
     */
    class CustomOffer extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\CustomOfferAttachment
     *
     * @property-read \App\Models\CustomOffer|null $offer
     *
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOfferAttachment newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOfferAttachment newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOfferAttachment query()
     */
    class CustomOfferAttachment extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\CustomOfferWork
     *
     * @property-read \App\Models\CustomOffer|null $offer
     *
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOfferWork newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOfferWork newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|CustomOfferWork query()
     */
    class CustomOfferWork extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\DepositTransaction
     *
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|DepositTransaction newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|DepositTransaction newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|DepositTransaction query()
     */
    class DepositTransaction extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\DepositWebhook
     *
     * @method static \Illuminate\Database\Eloquent\Builder|DepositWebhook newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|DepositWebhook newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|DepositWebhook query()
     */
    class DepositWebhook extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\EmailVerification
     *
     * @method static \Illuminate\Database\Eloquent\Builder|EmailVerification newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|EmailVerification newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|EmailVerification query()
     */
    class EmailVerification extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\EpointSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|EpointSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|EpointSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|EpointSettings query()
     */
    class EpointSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Favorite
     *
     * @property-read \App\Models\Gig|null $gig
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Favorite newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Favorite newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Favorite query()
     */
    class Favorite extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\FileManager
     *
     * @method static \Illuminate\Database\Eloquent\Builder|FileManager newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|FileManager newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|FileManager query()
     */
    class FileManager extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\FlutterwaveSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|FlutterwaveSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|FlutterwaveSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|FlutterwaveSettings query()
     */
    class FlutterwaveSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Gig
     *
     * @property-read \App\Models\Category|null $category
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\GigDocument> $documents
     * @property-read int|null $documents_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\GigFaq> $faqs
     * @property-read int|null $faqs_count
     * @property array $tag_names
     * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\Tagged[] $tags
     * @property-read \App\Models\FileManager|null $imageLarge
     * @property-read \App\Models\FileManager|null $imageMedium
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\GigImage> $images
     * @property-read int|null $images_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\OrderItem> $orders
     * @property-read int|null $orders_count
     * @property-read \App\Models\User|null $owner
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\GigRequirement> $requirements
     * @property-read int|null $requirements_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Review> $reviews
     * @property-read int|null $reviews_count
     * @property-read \App\Models\GigSeo|null $seo
     * @property-read \App\Models\Subcategory|null $subcategory
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \Conner\Tagging\Model\Tagged> $tagged
     * @property-read int|null $tagged_count
     * @property-read \App\Models\FileManager|null $thumbnail
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\GigUpgrade> $upgrades
     * @property-read int|null $upgrades_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\GigVisit> $visits
     * @property-read int|null $visits_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Gig active()
     * @method static \Illuminate\Database\Eloquent\Builder|Gig newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Gig newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Gig onlyTrashed()
     * @method static \Illuminate\Database\Eloquent\Builder|Gig query()
     * @method static \Illuminate\Database\Eloquent\Builder|Gig withAllTags($tagNames)
     * @method static \Illuminate\Database\Eloquent\Builder|Gig withAnyTag($tagNames)
     * @method static \Illuminate\Database\Eloquent\Builder|Gig withTrashed()
     * @method static \Illuminate\Database\Eloquent\Builder|Gig withoutTags($tagNames)
     * @method static \Illuminate\Database\Eloquent\Builder|Gig withoutTrashed()
     */
    class Gig extends \Eloquent implements \Spatie\Sitemap\Contracts\Sitemapable {}
}

namespace App\Models{
    /**
     * App\Models\GigDocument
     *
     * @method static \Illuminate\Database\Eloquent\Builder|GigDocument newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigDocument newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigDocument query()
     */
    class GigDocument extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\GigFaq
     *
     * @method static \Illuminate\Database\Eloquent\Builder|GigFaq newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigFaq newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigFaq query()
     */
    class GigFaq extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\GigImage
     *
     * @property-read \App\Models\FileManager|null $large
     * @property-read \App\Models\FileManager|null $medium
     * @property-read \App\Models\FileManager|null $small
     *
     * @method static \Illuminate\Database\Eloquent\Builder|GigImage newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigImage newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigImage query()
     */
    class GigImage extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\GigRequirement
     *
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\GigRequirementOption> $options
     * @property-read int|null $options_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|GigRequirement newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigRequirement newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigRequirement query()
     */
    class GigRequirement extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\GigRequirementOption
     *
     * @method static \Illuminate\Database\Eloquent\Builder|GigRequirementOption newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigRequirementOption newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigRequirementOption query()
     */
    class GigRequirementOption extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\GigSeo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|GigSeo newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigSeo newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigSeo query()
     */
    class GigSeo extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\GigUpgrade
     *
     * @method static \Illuminate\Database\Eloquent\Builder|GigUpgrade newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigUpgrade newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigUpgrade query()
     */
    class GigUpgrade extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\GigVisit
     *
     * @method static \Database\Factories\GigVisitFactory factory($count = null, $state = [])
     * @method static \Illuminate\Database\Eloquent\Builder|GigVisit newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigVisit newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|GigVisit query()
     */
    class GigVisit extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\JazzcashSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|JazzcashSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|JazzcashSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|JazzcashSettings query()
     */
    class JazzcashSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Language
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Language newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Language newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Language query()
     */
    class Language extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Level
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Level newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Level newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Level query()
     */
    class Level extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\MercadopagoSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|MercadopagoSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|MercadopagoSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|MercadopagoSettings query()
     */
    class MercadopagoSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\MollieSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|MollieSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|MollieSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|MollieSettings query()
     */
    class MollieSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\NewsletterList
     *
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterList newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterList newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterList query()
     */
    class NewsletterList extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\NewsletterSettings
     *
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterSettings query()
     */
    class NewsletterSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\NewsletterVerification
     *
     * @property-read \App\Models\NewsletterList|null $list
     *
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterVerification newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterVerification newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|NewsletterVerification query()
     */
    class NewsletterVerification extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Notification
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Notification newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Notification newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Notification query()
     */
    class Notification extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\NowpaymentsSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|NowpaymentsSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|NowpaymentsSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|NowpaymentsSettings query()
     */
    class NowpaymentsSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\OfflinePaymentGateway
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|OfflinePaymentGateway newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OfflinePaymentGateway newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OfflinePaymentGateway query()
     */
    class OfflinePaymentGateway extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\OfflinePaymentSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|OfflinePaymentSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OfflinePaymentSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OfflinePaymentSettings query()
     */
    class OfflinePaymentSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Order
     *
     * @property-read \App\Models\User|null $buyer
     * @property-read \App\Models\OrderInvoice|null $invoice
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\OrderItem> $items
     * @property-read int|null $items_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Order newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Order newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Order query()
     */
    class Order extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\OrderInvoice
     *
     * @property-read \App\Models\Order|null $order
     *
     * @method static \Illuminate\Database\Eloquent\Builder|OrderInvoice newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderInvoice newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderInvoice query()
     */
    class OrderInvoice extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\OrderItem
     *
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\OrderItemWorkConversation> $conversation
     * @property-read int|null $conversation_count
     * @property-read \App\Models\OrderItemWork|null $delivered_work
     * @property-read \App\Models\Gig|null $gig
     * @property-read \App\Models\Order|null $order
     * @property-read \App\Models\User|null $owner
     * @property-read \App\Models\Refund|null $refund
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\OrderItemRequirement> $requirements
     * @property-read int|null $requirements_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\OrderItemUpgrade> $upgrades
     * @property-read int|null $upgrades_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItem newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItem newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItem query()
     */
    class OrderItem extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\OrderItemRequirement
     *
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemRequirement newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemRequirement newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemRequirement query()
     */
    class OrderItemRequirement extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\OrderItemUpgrade
     *
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemUpgrade newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemUpgrade newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemUpgrade query()
     */
    class OrderItemUpgrade extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\OrderItemWork
     *
     * @property-read \App\Models\OrderItem|null $item
     *
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemWork newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemWork newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemWork query()
     */
    class OrderItemWork extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\OrderItemWorkConversation
     *
     * @property-read \App\Models\User|null $buyer
     * @property-read \App\Models\User|null $from
     * @property-read \App\Models\User|null $seller
     *
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemWorkConversation newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemWorkConversation newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|OrderItemWorkConversation query()
     */
    class OrderItemWorkConversation extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Page
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Page newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Page newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Page query()
     */
    class Page extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\PasswordReset
     *
     * @method static \Illuminate\Database\Eloquent\Builder|PasswordReset newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PasswordReset newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PasswordReset query()
     */
    class PasswordReset extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\PayPalSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|PayPalSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PayPalSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PayPalSettings query()
     */
    class PayPalSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\PaymobSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|PaymobSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PaymobSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PaymobSettings query()
     */
    class PaymobSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\PaystackSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|PaystackSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PaystackSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PaystackSettings query()
     */
    class PaystackSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\PaytabsSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|PaytabsSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PaytabsSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PaytabsSettings query()
     */
    class PaytabsSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\PaytrSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|PaytrSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PaytrSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|PaytrSettings query()
     */
    class PaytrSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Project
     *
     * @property-read \App\Models\ProjectBid|null $awarded_bid
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProjectBid> $bids
     * @property-read int|null $bids_count
     * @property-read \App\Models\ProjectCategory|null $category
     * @property-read \App\Models\User|null $client
     * @property-read \App\Models\ProjectMilestone|null $has_confirmed_milestone
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProjectMilestone> $milestones
     * @property-read int|null $milestones_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProjectSharedFile> $shared_files
     * @property-read int|null $shared_files_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProjectRequiredSkill> $skills
     * @property-read int|null $skills_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProjectSubscription> $subscriptions
     * @property-read int|null $subscriptions_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Project newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Project newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Project query()
     */
    class Project extends \Eloquent implements \Spatie\Sitemap\Contracts\Sitemapable {}
}

namespace App\Models{
    /**
     * App\Models\ProjectBid
     *
     * @property-read \App\Models\ProjectBidUpgrade|null $checkout
     * @property-read \App\Models\Project|null $project
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProjectBidUpgrade> $upgrades
     * @property-read int|null $upgrades_count
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBid newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBid newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBid query()
     */
    class ProjectBid extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectBidUpgrade
     *
     * @property-read \App\Models\ProjectBid|null $bid
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBidUpgrade newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBidUpgrade newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBidUpgrade query()
     */
    class ProjectBidUpgrade extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectBiddingPlan
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBiddingPlan newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBiddingPlan newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectBiddingPlan query()
     */
    class ProjectBiddingPlan extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectCategory
     *
     * @property-read \App\Models\FileManager|null $ogimage
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Project> $projects
     * @property-read int|null $projects_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProjectSkill> $skills
     * @property-read int|null $skills_count
     * @property-read \App\Models\FileManager|null $thumbnail
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProjectCategoryTranslation> $translation
     * @property-read int|null $translation_count
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectCategory newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectCategory newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectCategory query()
     */
    class ProjectCategory extends \Eloquent implements \Spatie\Sitemap\Contracts\Sitemapable {}
}

namespace App\Models{
    /**
     * App\Models\ProjectCategoryTranslation
     *
     * @property-read \App\Models\ProjectCategory|null $category
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectCategoryTranslation newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectCategoryTranslation newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectCategoryTranslation query()
     */
    class ProjectCategoryTranslation extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectMilestone
     *
     * @property-read \App\Models\User|null $employer
     * @property-read \App\Models\User|null $freelancer
     * @property-read \App\Models\Project|null $project
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectMilestone newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectMilestone newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectMilestone query()
     */
    class ProjectMilestone extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectPlan
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectPlan newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectPlan newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectPlan query()
     */
    class ProjectPlan extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectReportedBid
     *
     * @property-read \App\Models\ProjectBid|null $bid
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectReportedBid newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectReportedBid newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectReportedBid query()
     */
    class ProjectReportedBid extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectRequiredSkill
     *
     * @property-read \App\Models\ProjectSkill|null $skill
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectRequiredSkill newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectRequiredSkill newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectRequiredSkill query()
     */
    class ProjectRequiredSkill extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectSettings
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSettings query()
     */
    class ProjectSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectSharedFile
     *
     * @property-read \App\Models\Project|null $project
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSharedFile newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSharedFile newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSharedFile query()
     */
    class ProjectSharedFile extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectSkill
     *
     * @property-read \App\Models\ProjectCategory|null $category
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSkill newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSkill newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSkill query()
     */
    class ProjectSkill extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectSubscription
     *
     * @property-read \App\Models\Project|null $project
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSubscription newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSubscription newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectSubscription query()
     */
    class ProjectSubscription extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ProjectVisit
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectVisit newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectVisit newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ProjectVisit query()
     */
    class ProjectVisit extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\RazorpaySettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|RazorpaySettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|RazorpaySettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|RazorpaySettings query()
     */
    class RazorpaySettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Refund
     *
     * @property-read \App\Models\User|null $buyer
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RefundConversation> $conversation
     * @property-read int|null $conversation_count
     * @property-read \App\Models\OrderItem|null $item
     * @property-read \App\Models\User|null $seller
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Refund newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Refund newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Refund query()
     */
    class Refund extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\RefundConversation
     *
     * @property-read \App\Models\User|null $buyer
     * @property-read \App\Models\User|null $seller
     *
     * @method static \Illuminate\Database\Eloquent\Builder|RefundConversation newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|RefundConversation newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|RefundConversation query()
     */
    class RefundConversation extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ReportedGig
     *
     * @property-read \App\Models\Gig|null $gig
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedGig newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedGig newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedGig query()
     */
    class ReportedGig extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ReportedProject
     *
     * @property-read \App\Models\Project|null $project
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedProject newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedProject newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedProject query()
     */
    class ReportedProject extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\ReportedUser
     *
     * @property-read \App\Models\User|null $reported
     * @property-read \App\Models\User|null $reporter
     *
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedUser newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedUser newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|ReportedUser query()
     */
    class ReportedUser extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Review
     *
     * @property-read \App\Models\Gig|null $gig
     * @property-read \App\Models\User|null $seller
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Review active()
     * @method static \Illuminate\Database\Eloquent\Builder|Review newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Review newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Review query()
     */
    class Review extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsAppearance
     *
     * @property-read \App\Models\FileManager|null $placeholder
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsAppearance newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsAppearance newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsAppearance query()
     */
    class SettingsAppearance extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsAuth
     *
     * @property-read \App\Models\FileManager|null $wallpaper
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsAuth newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsAuth newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsAuth query()
     */
    class SettingsAuth extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsCommission
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsCommission newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsCommission newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsCommission query()
     */
    class SettingsCommission extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsCurrency
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsCurrency newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsCurrency newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsCurrency query()
     */
    class SettingsCurrency extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsFooter
     *
     * @property-read \App\Models\FileManager|null $logo
     * @property-read \App\Models\Page|null $privacy
     * @property-read \App\Models\Page|null $terms
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsFooter newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsFooter newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsFooter query()
     */
    class SettingsFooter extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsGeneral
     *
     * @property-read \App\Models\FileManager|null $favicon
     * @property-read \App\Models\FileManager|null $logo
     * @property-read \App\Models\FileManager|null $logo_dark
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsGeneral newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsGeneral newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsGeneral query()
     */
    class SettingsGeneral extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsHero
     *
     * @property-read \App\Models\FileManager|null $background_large
     * @property-read \App\Models\FileManager|null $background_medium
     * @property-read \App\Models\FileManager|null $background_small
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsHero newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsHero newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsHero query()
     */
    class SettingsHero extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsLiveChat
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsLiveChat newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsLiveChat newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsLiveChat query()
     */
    class SettingsLiveChat extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsMedia
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsMedia newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsMedia newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsMedia query()
     */
    class SettingsMedia extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsPublish
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsPublish newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsPublish newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsPublish query()
     */
    class SettingsPublish extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsSecurity
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsSecurity newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsSecurity newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsSecurity query()
     */
    class SettingsSecurity extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsSeo
     *
     * @property-read \App\Models\FileManager|null $ogimage
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsSeo newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsSeo newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsSeo query()
     */
    class SettingsSeo extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SettingsWithdrawal
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsWithdrawal newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsWithdrawal newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SettingsWithdrawal query()
     */
    class SettingsWithdrawal extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Slider
     *
     * @property-read \App\Models\FileManager|null $image
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Slider newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Slider newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Slider query()
     */
    class Slider extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\StripeSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|StripeSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|StripeSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|StripeSettings query()
     */
    class StripeSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\Subcategory
     *
     * @property-read \App\Models\FileManager|null $icon
     * @property-read \App\Models\FileManager|null $image
     * @property-read \App\Models\Category|null $parent
     *
     * @method static \Illuminate\Database\Eloquent\Builder|Subcategory newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Subcategory newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|Subcategory query()
     */
    class Subcategory extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\SupportMessage
     *
     * @method static \Illuminate\Database\Eloquent\Builder|SupportMessage newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SupportMessage newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|SupportMessage query()
     */
    class SupportMessage extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\User
     *
     * @property int $id
     * @property string $uid
     * @property string $username
     * @property string $email
     * @property \Illuminate\Support\Carbon|null $email_verified_at
     * @property string|null $password
     * @property string $account_type
     * @property int|null $avatar_id
     * @property int|null $level_id
     * @property string|null $provider_name
     * @property string|null $provider_id
     * @property int|null $country_id
     * @property string|null $fullname
     * @property string|null $headline
     * @property string|null $description
     * @property string $status
     * @property string $balance_net
     * @property string $balance_withdrawn
     * @property string $balance_purchases
     * @property string $balance_pending
     * @property string $balance_available
     * @property string|null $remember_token
     * @property \Illuminate\Support\Carbon|null $deleted_at
     * @property string|null $last_activity
     * @property \Illuminate\Support\Carbon|null $created_at
     * @property \Illuminate\Support\Carbon|null $updated_at
     * @property int $active_status
     * @property int $dark_mode
     * @property-read \App\Models\UserLinkedAccount|null $accounts
     * @property-read \App\Models\UserAvailability|null $availability
     * @property-read \App\Models\FileManager|null $avatar
     * @property-read \App\Models\UserBilling|null $billing
     * @property-read \Illuminate\Database\Eloquent\Collection<int, User> $chat_contacts_from
     * @property-read int|null $chat_contacts_from_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, User> $chat_contacts_to
     * @property-read int|null $chat_contacts_to_count
     * @property-read \App\Models\Country|null $country
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\UserLanguage> $languages
     * @property-read int|null $languages_count
     * @property-read \App\Models\Level|null $level
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Notification> $notifications
     * @property-read int|null $notifications_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\UserPortfolio> $projects
     * @property-read int|null $projects_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Review> $reviews
     * @property-read int|null $reviews_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\OrderItem> $sales
     * @property-read int|null $sales_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\UserSkill> $skills
     * @property-read int|null $skills_count
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
     * @property-read int|null $tokens_count
     * @property-read \App\Models\VerificationCenter|null $verification
     *
     * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
     * @method static \Illuminate\Database\Eloquent\Builder|User newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|User newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|User onlyTrashed()
     * @method static \Illuminate\Database\Eloquent\Builder|User query()
     * @method static \Illuminate\Database\Eloquent\Builder|User whereAccountType($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereActiveStatus($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereAvatarId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereBalanceAvailable($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereBalanceNet($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereBalancePending($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereBalancePurchases($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereBalanceWithdrawn($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereCountryId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereCreatedAt($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereDarkMode($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereDeletedAt($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereDescription($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereEmail($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereEmailVerifiedAt($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereFullname($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereHeadline($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereLastActivity($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereLevelId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User wherePassword($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereProviderId($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereProviderName($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereRememberToken($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereStatus($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereUid($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereUpdatedAt($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User whereUsername($value)
     * @method static \Illuminate\Database\Eloquent\Builder|User withTrashed()
     * @method static \Illuminate\Database\Eloquent\Builder|User withoutTrashed()
     */
    class User extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserAvailability
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserAvailability newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserAvailability newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserAvailability query()
     */
    class UserAvailability extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserBilling
     *
     * @property-read \App\Models\Country|null $country
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserBilling newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserBilling newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserBilling query()
     */
    class UserBilling extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserLanguage
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserLanguage newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserLanguage newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserLanguage query()
     */
    class UserLanguage extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserLinkedAccount
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserLinkedAccount newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserLinkedAccount newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserLinkedAccount query()
     */
    class UserLinkedAccount extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserPortfolio
     *
     * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\UserPortfolioGallery> $gallery
     * @property-read int|null $gallery_count
     * @property-read \App\Models\FileManager|null $thumbnail
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserPortfolio newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserPortfolio newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserPortfolio query()
     */
    class UserPortfolio extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserPortfolioGallery
     *
     * @property-read \App\Models\FileManager|null $image
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserPortfolioGallery newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserPortfolioGallery newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserPortfolioGallery query()
     */
    class UserPortfolioGallery extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserSkill
     *
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserSkill newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserSkill newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserSkill query()
     */
    class UserSkill extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserWithdrawalHistory
     *
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserWithdrawalHistory newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserWithdrawalHistory newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserWithdrawalHistory query()
     */
    class UserWithdrawalHistory extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\UserWithdrawalSettings
     *
     * @method static \Illuminate\Database\Eloquent\Builder|UserWithdrawalSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserWithdrawalSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|UserWithdrawalSettings query()
     */
    class UserWithdrawalSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\VNPaySettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|VNPaySettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|VNPaySettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|VNPaySettings query()
     */
    class VNPaySettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\VerificationCenter
     *
     * @property-read \App\Models\FileManager|null $backside
     * @property-read \App\Models\FileManager|null $frontside
     * @property-read \App\Models\FileManager|null $selfie
     * @property-read \App\Models\User|null $user
     *
     * @method static \Illuminate\Database\Eloquent\Builder|VerificationCenter newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|VerificationCenter newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|VerificationCenter query()
     */
    class VerificationCenter extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\XenditSettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|XenditSettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|XenditSettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|XenditSettings query()
     */
    class XenditSettings extends \Eloquent {}
}

namespace App\Models{
    /**
     * App\Models\YoucanpaySettings
     *
     * @property-read \App\Models\FileManager|null $logo
     *
     * @method static \Illuminate\Database\Eloquent\Builder|YoucanpaySettings newModelQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|YoucanpaySettings newQuery()
     * @method static \Illuminate\Database\Eloquent\Builder|YoucanpaySettings query()
     */
    class YoucanpaySettings extends \Eloquent {}
}
