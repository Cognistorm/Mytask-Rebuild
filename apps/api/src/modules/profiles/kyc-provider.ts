// KYC provider seam (spec 02 AC-40, Q-048): S-122 `kyc.provider` picks who decides a new verification. `manual`
// (the only value today) leaves it `pending` for the staff queue. An external service later adds its own
// provider here (e.g. it starts a check and stores `provider_reference`); nothing else in the KYC flow changes.
import { Injectable } from '@nestjs/common';
import type {
  KycProvider as KycProviderName,
  KycVerification,
  Prisma,
} from '../../generated/prisma/client';

export interface KycProvider {
  readonly name: KycProviderName;
  /** Called in the submit transaction, after the `pending` row exists. */
  submitted(verification: KycVerification, tx: Prisma.TransactionClient): Promise<void>;
}

/** Staff decide in the admin KYC queue; nothing to start. */
@Injectable()
export class ManualKycProvider implements KycProvider {
  readonly name = 'manual' as const;

  submitted(): Promise<void> {
    return Promise.resolve();
  }
}

@Injectable()
export class KycProviders {
  private readonly byName: Map<KycProviderName, KycProvider>;

  constructor(manual: ManualKycProvider) {
    this.byName = new Map([[manual.name, manual]]);
  }

  get(name: KycProviderName): KycProvider {
    const provider = this.byName.get(name);
    if (!provider) throw new Error(`KYC provider ${name} is not available`);
    return provider;
  }
}
