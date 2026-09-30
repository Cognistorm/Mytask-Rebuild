// "Update required" (ADR-018): shown when the API answers 426 APP_VERSION_UNSUPPORTED.
// The store buttons are added with the store identifiers in Phase 6.
import { Notice, Screen } from '../components/form';
import { createT } from '../lib/i18n';

const t = createT('ka');

export default function UpdateRequired() {
  return (
    <Screen title="MyTask.ge">
      <Notice kind="info" text={t('t_app_update_required')} />
    </Screen>
  );
}
