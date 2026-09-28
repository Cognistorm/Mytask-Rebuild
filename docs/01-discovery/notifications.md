# Notifications inventory
Channels in legacy: **email** (Laravel Notifications `via ['mail']`, 61 classes used) and **in-app** (`notifications` table via `notification()` helper, `app/Utils/Helper/helpers.php:1530-1560`: stores text key + params + action URL). No SMS, no push. Realtime: Chatify/Pusher chat, refund thread broadcasts (`app/Events/NewRefundMessage.php`, `NewProjectRefundMessage.php`). Email locale: mostly `config('app.locale')`; subscription renewal forced `ka` (`ProcessSubscriptionPayments.php:215`). Email text keys live in `lang/*/messages.php` (subject `t_subject_*`, body `t_notification_*`).

## Email (class → trigger → recipient → call site)
| Class (`app/Notifications/...`) | Trigger | Recipient | Key text keys | Sent from |
|---|---|---|---|---|
| Admin/BidPendingApproval | bid needs approval | Admin::first | t_notification_admin_bid_pending_approval | Project/ProjectComponent.php:1053; Seller/Projects/Bids/Options/EditComponent.php:482 |
| Admin/BidReported | bid reported | admin | t_subject_admin_bid_reported | Cards/Bid.php:389 |
| Admin/NewCustomOfferPending | offer needs approval | admin | t_subject_admin_new_offer_pending_approval | Profile/ProfileComponent.php:642; Account/Offers (CR) 1104 |
| Admin/NewIdVerificationPending | ID docs submitted | admin | t_verification_center | Account/Verification/VerificationComponent.php:310 |
| Admin/NewPayment | BOG gig order created (invoice pending) | admin | t_new_online_payment | Checkout/CheckoutComponent.php (CR) 5341 |
| Admin/NewRefundMessage | buyer message in refund | admin | t_subject_admin_new_refund_message | Account/Refunds/Options/DetailsComponent.php:188 |
| Admin/NewRestrictionAppeal | appeal submitted | admin | t_hi_admin | Restricted/IndexComponent.php:170 |
| Admin/PendingArticleComment | blog comment | admin | t_subject_admin_pending_article_comment | Blog/ArticleComponent.php:208 |
| Admin/PendingGig | gig created/edited needs approval | admin | t_subject_admin_pending_gig | Create/CreateComponent.php:824; Seller/Gigs/Options/EditComponent.php:447; Steps/Overview.php:713; Admin/Gigs/Options/EditComponent.php:1755 |
| Admin/PendingMessage | contact form | admin | t_subject_admin_new_support_message | Help/Contact/ContactComponent.php:133 |
| Admin/PendingOfflinePayment | offline checkout | admin | t_notification_admin_pending_offline_payment | CheckoutComponent.php (CR) 5684 |
| Admin/PendingPortfolio | portfolio create/edit | admin | t_subject_admin_pending_portfolio | Seller/Portfolio/Options/CreateComponent.php:174; EditComponent.php:234 |
| Admin/PendingUser | registration w/ admin verification | admin | t_subject_admin_pending_user | Auth/RegisterComponent.php:194 |
| Admin/PendingWithdrawal | withdrawal request | admin | t_subject_admin_pending_withdrawal | Seller/Withdrawals/CreateComponent.php:794 |
| Admin/ProfileReported | profile reported | admin | t_subject_admin_profile_reported | Profile/ProfileComponent.php:332 |
| Admin/ProjectReported | project reported | admin | t_subject_admin_project_reported | Project/ProjectComponent.php:1206 |
| Admin/RefundDispute | buyer raises dispute | admin | t_subject_admin_refund_dispute_raised | Account/Refunds/Options/DetailsComponent.php:300 |
| Admin/SiteIsDown | maintenance on | admin | t_hi_admin | Admin/System/MaintenanceComponent.php:124 |
| User/Buyer/NewRefundMessage | seller message in refund | buyer | t_subject_buyer_new_refund_message | Account/Refunds/Options/DetailsComponent.php:168 (+seller side) |
| User/Buyer/OrderDelivered | seller delivered | buyer | t_subject_buyer_order_delivered | Seller/Orders/Options/DeliverComponent.php:326 |
| User/Buyer/OrderItemCanceled | seller canceled | buyer | t_subject_buyer_order_canceled | Seller/Orders/OrdersComponent.php:227; Options/DetailsComponent.php:260; RequirementsComponent.php:169 |
| User/Buyer/OrderItemCompleted | buyer completed | buyer | t_subject_buyer_order_item_completed_thanks | Account/Orders/Options/FilesComponent.php:337 |
| User/Buyer/OrderItemInProgress | seller started | buyer | t_subject_buyer_order_item_in_progress | Seller/Orders/OrdersComponent.php:381; DetailsComponent.php:162; RequirementsComponent.php:228 |
| User/Buyer/OrderPlaced | wallet checkout | buyer | t_subject_buyer_order_has_placed | CheckoutComponent.php (CR) 4957 |
| User/Buyer/RefundAccepted / RefundDeclined | seller decision | buyer | t_subject_buyer_refund_accepted / _declined | Seller/Refunds/Options/DetailsComponent.php:240 / 357 |
| User/Buyer/WebhookPaymentFailed | gateway webhook failure | buyer | – | callback controllers |
| User/Employer/FreelancerAcceptedYourOffer / RejectedYourOffer / CanceledYourOffer | freelancer offer action | client | t_subject_employer_* | Seller/Offers/OffersComponent.php:266 / 183 / 568 |
| User/Employer/FreelancerAcceptedYourProject / RejectedYourProject | award accept/reject | client | t_subject_employer_freelancer_*_ur_project | Seller/Projects/ProjectsComponent.php:339 / 216 |
| User/Employer/FreelancerRequestedMilestone | milestone request | client | t_subject_employer_freelancer_requested_a_milestone | Seller/Projects/Milestones/MilestonesComponent.php:506 |
| User/Employer/NewFinishedOfferFile | offer work uploaded | client | t_subject_employer_offer_new_file_received | Seller/Offers/OffersComponent.php:388 |
| User/Employer/ProjectCompleted | project work delivered (misnamed) / admin completes | client | t_subject_employer_project_completed | Seller/Projects/Options/DeliverComponent.php:210; Admin/Projects/Milestones/MilestonesComponent.php:482 |
| User/Employer/YourOfferNeedsChanges | admin rejects offer | client | t_subject_employer_ur_offer_needs_changes | Admin/Offers/OffersComponent.php:178 |
| User/Employer/YourProjectApproved / Rejected | admin moderation | client | t_subject_employer_project_approved / _needs_changes | Admin/Projects/ProjectsComponent.php:94 / 161 |
| User/Everyone/AccountActivated | admin activates user | user | t_subject_everyone_ur_account_activated | Admin/Users/UsersComponent.php:186 |
| User/Everyone/AppealAccepted / AppealRejected | admin appeal decision | user | t_subject_user_appeal_* | Admin/Users/Options/RestrictComponent.php:308 / 367 |
| User/Everyone/BillingInfoUpdated | billing saved | user | t_subject_everyone_billing_info_updated | Account/Billing/BillingComponent.php:199 |
| User/Everyone/DepositRejected | admin rejects deposit | user | t_subject_everyone_recent_deposit_rejected | Admin/Users/Transactions/TransactionsComponent.php:141 |
| User/Everyone/GigPublished | admin approves gig | seller | t_subject_everyone_ur_gig_published | Admin/Gigs/GigsComponent.php:228 |
| User/Everyone/NewBidReceived | active bid posted/approved | client | t_subject_everyone_u_received_new_bid | Project/ProjectComponent.php:1043; Admin/Projects/Bids/BidsComponent.php:108; Bids/Options/EditComponent.php:474 |
| User/Everyone/NewMessage | chat msg to offline user (≤1/10min) | recipient | t_subject_everyone_u_have_new_message | Chat/MessagesController.php:282; Messages/ConversationComponent.php:282 |
| User/Everyone/PasswordChanged | password change/reset | user | t_subject_everyone_password_changed | Account/Password/PasswordComponent.php:139; Auth/Password/UpdateComponent.php:183 |
| User/Everyone/PasswordReset | reset requested | user | t_subject_everyone_reset_ur_password | Auth/Password/ResetComponent.php:138 |
| User/Everyone/PaymentApproved / PaymentRejected | withdrawal paid/rejected | seller | t_subject_everyone_payment_* | Admin/Withdrawals/WithdrawalsComponent.php:76 / 127 |
| User/Everyone/SubscriptionCancelled | user cancels | user | t_subject_subscription_cancelled | Account/Subscription/MySubscriptionComponent.php:48 |
| User/Everyone/SubscriptionConfirmation | subscription activated (BOG/points) | user | t_subject_subscription_confirmation | PaymentBogController.php:229; Main/SubscriptionController.php:60,106 (sent twice for points) |
| User/Everyone/SubscriptionRenewed | auto-renew success | user | t_subject_subscription_renewed | Console/Commands/ProcessSubscriptionPayments.php:215 |
| User/Everyone/VerificationApproved / Declined | admin ID decision | user | t_subject_everyone_verification_* | Admin/Verifications/VerificationsComponent.php:86 / 143 |
| User/Everyone/VerifyEmail | registration / resend | user | t_subject_everyone_verify_ur_email | Auth/RegisterComponent.php:186; Auth/RequestComponent.php:156 |
| User/Everyone/YourBidApproved / Rejected | admin bid moderation | freelancer | t_subject_everyone_ur_bid_* | Admin/Projects/Bids/BidsComponent.php:90 / 175 |
| User/Freelancer/EmployerFundedMilestone | milestone funded | freelancer | t_subject_freelancer_employer_deposited_funds | PaymentBogController.php:157; UnifiedCheckoutComponent.php:573; PayComponent.php:619,851,1149; Account/Projects/Options/MilestonesComponent.php:616,1035 |
| User/Freelancer/EmployerReleasedMilestone | release | freelancer | t_subject_freelancer_employer_released_funds | PayComponent.php:1311; MilestonesComponent.php:1306 |
| User/Freelancer/NewOfferReceived | offer delivered to freelancer | freelancer | t_subject_freelancer_new_offer_received | Profile/ProfileComponent.php:668; Admin/Offers:108; Account/Offers (CR) 1090 |
| User/Freelancer/NewProjectInCategory | project posted in category | matching sellers | t_new_project_in_your_category | Services/Project/ProjectNotificationService.php:41 |
| User/Freelancer/OfferFunded | offer funded | freelancer | t_subject_freelancer_offer_funded | PaymentBogController.php:110; UnifiedCheckoutComponent.php:633; Account/Offers (CR) 1513 |
| User/Freelancer/OfferPaymentReleased | offer released | freelancer | t_subject_freelancer_offer_payment_released | Admin/Offers:359; Account/Offers (CR) 1739 |
| User/Freelancer/ProjectAwarded | bid awarded | freelancer | t_subject_freelancer_u_awarded_a_project | Cards/Bid.php:652 |
| User/Freelancer/RejectMilestone | client rejects milestone request | freelancer | t_reject_milestone | Account/Projects/Options/MilestonesComponent.php:1118 |
| User/Freelancer/YourGigNeedsChanges | admin rejects gig | seller | t_subject_freelancer_ur_gig_needs_changes | Admin/Gigs/GigsComponent.php:312 |
| User/Seller/DeliveredWorkNewMessage | buyer message on delivery | seller | t_subject_seller_delivered_work_new_msg | Account/Orders/Options/FilesComponent.php:197 |
| User/Seller/NewRefundMessage | buyer refund message | seller | t_subject_seller_new_refund_msg | refund details |
| User/Seller/OrderItemCanceled | buyer canceled | seller | t_subject_seller_order_item_canceled | Account/Orders/OrdersComponent.php:273 |
| User/Seller/OrderItemCompleted | buyer completed | seller | t_subject_seller_order_item_completed | FilesComponent.php:308 |
| User/Seller/PendingOrder | new paid order | seller | t_subject_seller_pending_order | PaymentBogController.php:86; CheckoutComponent.php (CR) 4871; Admin/Invoices/InvoicesComponent.php:109 |
| User/Seller/PendingWithdrawal | withdrawal submitted | seller | t_subject_seller_pending_withdrawal | Seller/Withdrawals/CreateComponent.php:798 |
| User/Seller/PortfolioPublished | admin approves portfolio | seller | t_subject_seller_portfolio_published | Admin/Portfolios/PortfoliosComponent.php:135 |
| User/Seller/RefundClosed / RefundRequest | buyer closes / opens refund | seller | t_subject_seller_refund_closed / _request | Account/Refunds/Options/DetailsComponent.php:240; RequestComponent.php:188 |
| User/Seller/ReviewReceived | new review | seller | t_subject_seller_new_review | Account/Reviews/Options/CreateComponent.php:202 |
| User/Seller/YouBecameSeller | start selling | user | t_subject_seller_u_became_seller | Become/SellerComponent.php:160 |
| User/Everyone/Welcome | NOT SENT anywhere (dead) | – | t_welcome_to_app_name | – |
Direct mailables (`app/Mail`): Admin newsletter/send-email (Filament UserResource.php:118, Admin/Users/Options/MessageComponent.php:94, Newsletter/SendComponent.php:92), SMTP test (Settings/SmtpComponent.php:296), support reply (Support/ReplyComponent.php:115), restriction notice (Users/Options/RestrictComponent.php:124), newsletter verification/approved (Home/HomeComponent.php:233,263; Blog/BlogComponent.php:218,268; Newsletter/VerifyComponent.php:58).

## In-app (notifications table) — text key → trigger → recipient → file:line
| Text key | Trigger | Recipient | File |
|---|---|---|---|
| t_u_received_new_order_seller | wallet/gateway order or admin approves invoice | seller | CheckoutComponent.php (CR) 4883; Admin/Invoices/InvoicesComponent.php:113; 28 callback controllers |
| t_notification_buyer_order_placed | BOG order success | seller | PaymentBogController.php:73 |
| t_ur_payment_has_been_received_offline | admin approves offline invoice | buyer | Admin/Invoices/InvoicesComponent.php:133 |
| t_seller_has_started_ur_order | start | buyer | Seller/Orders/OrdersComponent.php:385; Options/DetailsComponent.php:164; RequirementsComponent.php:232 |
| t_seller_has_delivered_ur_order | delivery | buyer | Seller/Orders/Options/DeliverComponent.php:332 |
| t_seller_has_canceled_ur_order | seller cancels | buyer | Seller/Orders/OrdersComponent.php:231; DetailsComponent.php:264; RequirementsComponent.php:173 |
| t_buyer_has_canceled_order | buyer cancels | seller | Account/Orders/OrdersComponent.php:277 |
| t_buyer_sent_u_message_about_delivered_files | message on delivery | seller | Account/Orders/Options/FilesComponent.php:201 |
| t_order_id_completed | buyer completes | seller | FilesComponent.php:323 |
| t_u_have_received_new_rating | review | seller | Account/Reviews/Options/CreateComponent.php:206 |
| t_buyer_opened_new_refund_request | refund request | seller | Account/Refunds/Options/RequestComponent.php:192 |
| t_new_message_about_refund | refund message | other party | Account/Refunds/Options/DetailsComponent.php:172 |
| t_a_refund_has_closed | buyer closes refund | seller | DetailsComponent.php:244 |
| t_buyer_opened_new_refund_dispute | dispute | seller | DetailsComponent.php:302 |
| t_seller_has_accepted_ur_refund / t_seller_has_declined_ur_refund | seller decision | buyer | Seller/Refunds/Options/DetailsComponent.php:242 / 360 |
| t_freelancer_has_accepted_ur_refund / t_freelancer_has_declined_ur_refund | project refund decision | client | Seller/Refunds/Options/DetailsComponent.php:300 / 383 |
| t_subject_freelancer_client_requested_project_refund | project refund request | freelancer | Account/ProjectRefunds/Options/RequestComponent.php:150 |
| t_app_name_has_approved_ur_refund_request / t_app_name_has_approved_refund_request_from_buyer / t_app_name_has_declined_ur_refund_request | admin dispute decision | both parties | Admin/Refunds/Options/DetailsComponent.php:133,147,223,237; Admin/ProjectRefunds/Options/DetailsComponent.php:108,115,187,194 |
| t_admin_approved_unblock_request / t_admin_declined_unblock_request | admin (list page) | freelancer | Admin/UnblockRequests/UnblockRequestsComponent.php:112 / 159 |
| t_app_name_has_approved_ur_unblock_request / t_app_name_has_declined_ur_unblock_request | admin (details page) | freelancer | Admin/UnblockRequests/Options/DetailsComponent.php:98 / 140 |
| t_u_received_new_bid_on_ur_project | active bid | client | Project/ProjectComponent.php:1031; Admin/Projects/Bids/BidsComponent.php:96; Bids/Options/EditComponent.php:462 |
| t_congratulations_employer_awarded_u_their_project_title | award (deleted on revoke/re-award) | freelancer | Cards/Bid.php:638 |
| t_subject_employer_freelancer_accepted_ur_project / _rejected_ur_project | accept/reject award | client | Seller/Projects/ProjectsComponent.php:346 / 226 |
| t_username_has_deposited_amount_in_project | milestone funded | freelancer | PaymentBogController.php:158; UnifiedCheckoutComponent.php:575; PayComponent.php:1129; MilestonesComponent.php:1015 |
| t_username_has_released_amount_in_project | release | freelancer | PayComponent.php:1315; MilestonesComponent.php:1310 |
| t_reject_milestone | client rejects milestone | freelancer | MilestonesComponent.php:1100 |
| t_subject_employer_freelancer_requested_a_milestone | milestone request | client | Seller/Projects/Milestones/MilestonesComponent.php:510 |
| t_freelancer_has_delivered_project_work | project delivery | client | Seller/Projects/Options/DeliverComponent.php:213 |
| t_congts_freelancer_ur_project_completed | admin completes project | freelancer | Admin/Projects/Milestones/MilestonesComponent.php:486 |
| t_a_new_custom_offer_received | offer sent/approved | freelancer | Profile/ProfileComponent.php:656; Account/Offers (CR) 1076; Admin/Offers:96 |
| t_an_offer_needs_changes_rejected_admin | admin rejects offer | client | Admin/Offers/OffersComponent.php:182 |
| t_notification_username_has_accpted_ur_offer / t_notification_username_has_rejected_ur_offer / t_freelancer_has_canceled_ur_offer | freelancer offer action | client | Seller/Offers/OffersComponent.php:270 / 187 / 572 |
| t_a_new_file_received_offer | offer work uploaded | client | Seller/Offers/OffersComponent.php:392 |
| t_a_custom_order_has_been_funded | offer funded | freelancer | PaymentBogController.php:114; UnifiedCheckoutComponent.php:635; Account/Offers (CR) 1519 |
| t_u_received_a_new_payment_offer | offer released | freelancer | Account/Offers (CR) 1745; Admin/Offers:363 |
| t_ur_gig_title_has_been_published / t_ur_gig_needs_changes_rejected_admin | gig moderation | seller | Admin/Gigs/GigsComponent.php:232 / 316 |
| t_ur_portfolio_title_has_been_published | portfolio approved | seller | Admin/Portfolios/PortfoliosComponent.php:139 |
| t_ur_account_has_verified / t_verification_files_declined | ID verification | user | Admin/Verifications/VerificationsComponent.php:98 / 155 |
| t_withdrawal_amount_paid / t_withdrawal_amount_rejected | withdrawal decision | seller | Admin/Withdrawals/WithdrawalsComponent.php:86 / 149 |
| t_u_became_a_seller | start selling | user | Become/SellerComponent.php:164 |
| t_u_have_new_message_from_username | legacy conversation message | recipient | Messages/ConversationComponent.php:286 |
| t_subscription_activated_message | subscription via BOG / points | user | PaymentBogController.php:220; Main/SubscriptionController.php:61 |
| t_subscription_updated_message | auto-renew | user | Console/Commands/ProcessSubscriptionPayments.php:206 |
