'use client';
// Availability block + modal (spec 02 AC-22, AC-23, R-P5; design components.md §5.11 DatePicker, §8.1 Dialog
// `md`; legacy "Set availability" section and `modal-set-availability-container`). Any user may set it (Q-013).
// The date picker starts tomorrow (Asia/Tbilisi); the API decides "in the future" and answers
// `t_pls_select_availability_date_in_future` otherwise. Legacy "Change" removed the notice; here "Change" opens
// the modal with the current values and "Remove" ends it early (AC-23).
import { useState } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Dialog, Field, Pill, TextArea } from '@mytask/ui/web';
import type { TFunction } from 'i18next';
import { useApi, type ApiErrorBody } from '../../lib/client';
import { addDays, formatDateOnly, platformToday } from '../../lib/format';
import { Block, BlockMessage, EditButton, useBlockState } from './block';

type Availability = components['schemas']['AvailabilityNotice'];

export function AvailabilityBlock(props: {
  t: TFunction;
  locale: Locale;
  availability: Availability | null;
  onChange: (availability: Availability | null) => void;
}) {
  const { t, availability } = props;
  const api = useApi(props.locale);
  const block = useBlockState();
  const form = useBlockState();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');

  function openModal() {
    setDate(availability?.unavailableUntil ?? '');
    setMessage(availability?.message ?? '');
    form.reset();
    block.reset();
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    form.start();
    const res = await api.PUT('/me/availability', {
      body: { unavailableUntil: date, message: message.trim() },
    });
    if (res.error) return form.done({ err: res.error as ApiErrorBody });
    form.done({});
    setOpen(false);
    props.onChange(res.data);
    block.done({ ok: t('t_ur_availability_settings_updated') });
  }

  async function remove() {
    block.start();
    const res = await api.DELETE('/me/availability');
    if (res.error) return block.done({ err: res.error as ApiErrorBody });
    props.onChange(null);
    block.done({ ok: t('t_ur_availability_settings_updated') });
  }

  return (
    <Block
      title={t('t_availability')}
      hint={t('t_when_unavailable_u_wont_receive_orders')}
      testId="availability-block"
      action={
        !availability && (
          <EditButton
            label={t('t_set_availability')}
            onClick={openModal}
            testId="availability-set"
          />
        )
      }
    >
      <BlockMessage ok={block.ok} general={block.general} />
      {availability && (
        <div className="mt-edit-availability" data-testid="availability-current">
          <Pill tone="danger">{t('t_unavailable')}</Pill>
          <p>
            {t('t_u_wont_be_able_to_receive_orders_until_date', {
              date: formatDateOnly(availability.unavailableUntil),
            })}
          </p>
          <blockquote className="mt-edit-quote">{availability.message}</blockquote>
          <div className="mt-edit-buttons">
            <button
              type="button"
              className="mt-button"
              disabled={block.busy}
              onClick={openModal}
              data-testid="availability-change"
            >
              {t('t_change')}
            </button>
            <button
              type="button"
              className="mt-button"
              disabled={block.busy}
              onClick={() => void remove()}
              data-testid="availability-remove"
            >
              {t('t_remove')}
            </button>
          </div>
        </div>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('t_change_availability')}
        closeLabel={t('t_ui_close')}
        testId="availability-dialog"
      >
        <form onSubmit={save} noValidate className="mt-edit-form">
          <Field
            label={t('t_when_do_u_expect_tobe_ready_for_new_work')}
            name="unavailableUntil"
            type="date"
            min={addDays(platformToday(), 1)}
            value={date}
            onChange={setDate}
            error={form.fields.unavailableUntil}
          />
          <TextArea
            label={t('t_add_a_message')}
            name="message"
            placeholder={t('t_buyers_will_see_ur_message_when_visiting_ur_gigs')}
            maxLength={750}
            rows={4}
            value={message}
            onChange={setMessage}
            error={form.fields.message}
          />
          <BlockMessage general={form.general} />
          <div className="mt-edit-buttons">
            <button type="submit" className="mt-button mt-button-primary" disabled={form.busy}>
              {t('t_set_availability')}
            </button>
          </div>
        </form>
      </Dialog>
    </Block>
  );
}
