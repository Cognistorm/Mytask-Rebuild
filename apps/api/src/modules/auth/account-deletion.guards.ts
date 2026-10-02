// deleteMe refusals (spec 02 AC-32, AC-33; spec 14 AC-20). Each later slice registers its own check from its
// module's onModuleInit, so slice 1 builds no order, project, balance or withdrawal logic:
//   slices 5, 10, 11 — active order item or project, as buyer or freelancer (AC-32,
//                      `t_cannot_delete_account_active_orders_projects`);
//   slice 4          — Available or HOLD/Pending balance not 0 (AC-33, `t_cannot_delete_account_balance`);
//   slice 13         — withdrawal pending or processing (`t_cannot_delete_account_pending_withdrawal`).
import { Injectable } from '@nestjs/common';

export interface AccountDeletionGuard {
  /** For logs and tests. */
  readonly name: string;
  /** The refusal's message key, or null when this guard allows the deletion. */
  refusal(userId: string): Promise<string | null>;
}

@Injectable()
export class AccountDeletionGuards {
  private readonly guards: AccountDeletionGuard[] = [];

  register(guard: AccountDeletionGuard): void {
    if (this.guards.some((g) => g.name === guard.name)) return;
    this.guards.push(guard);
  }

  /** The first refusal in registration order, or null when the account may be deleted. */
  async firstRefusal(userId: string): Promise<string | null> {
    for (const guard of this.guards) {
      const key = await guard.refusal(userId);
      if (key) return key;
    }
    return null;
  }
}
