// Code-defined permission catalogue (ADR-010, spec 16): exactly the contract's PermissionCode enum.
// The compile-time checks below fail if the contract gains or loses a permission.
import type { components } from '@mytask/types';

type PermissionCode = components['schemas']['PermissionCode'];

export const PERMISSIONS = [
  'dashboard.read',
  'analytics.read',
  'users.read',
  'users.edit',
  'users.activate',
  'users.restrict',
  'users.ban',
  'users.delete',
  'users.email',
  'security.ip_bans',
  'kyc.review',
  'gigs.moderate',
  'portfolio.moderate',
  'projects.moderate',
  'proposals.moderate',
  'offers.moderate',
  'reviews.moderate',
  'comments.moderate',
  'reports.handle',
  'chat.read',
  'chat.moderate',
  'orders.read',
  'payments.read',
  'payments.offline.approve',
  'refunds.thread.write',
  'refunds.resolve',
  'escrow.release',
  'escrow.refund',
  'withdrawals.approve',
  'ledger.adjust',
  'points.adjust',
  'subscriptions.manage',
  'promo_codes.write',
  'fees.write',
  'catalog.write',
  'content.write',
  'newsletter.manage',
  'support.handle',
  'translations.write',
  'settings.read',
  'settings.plans.write',
  'settings.payments.write',
  'settings.escrow.write',
  'settings.withdrawals.write',
  'settings.marketplace.write',
  'settings.subscriptions.write',
  'settings.auth.write',
  'settings.moderation.write',
  'settings.media.write',
  'settings.chat.write',
  'settings.notifications.write',
  'settings.content.write',
  'settings.custom_code.write',
  'settings.system.write',
  'system.logs.read',
  'system.health.read',
  'audit.read',
  'staff.manage',
] as const satisfies readonly PermissionCode[];

type Missing = Exclude<PermissionCode, (typeof PERMISSIONS)[number]>;
const complete: [Missing] extends [never] ? true : Missing = true;
void complete;

export const SUPER_ADMIN_ROLE = 'super_admin';
