// Availability block + bottom sheet (spec 02 AC-22, AC-23, R-P5; screens table "bottom sheet with date picker";
// design components.md §5.11 DatePicker), as the web `profile-edit/availability.tsx`. Any user may set it
// (Q-013). The picker starts tomorrow in Asia/Tbilisi; the API decides "in the future" and answers
// `t_pls_select_availability_date_in_future` otherwise. "Change" opens the sheet with the current values,
// "Remove" ends it early (AC-23). iOS shows the calendar inside the sheet; Android opens its date dialog.
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiClient } from '@mytask/api-client';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import {
  addDays,
  dateOnlyToLocal,
  formatDateOnly,
  localToDateOnly,
  platformToday,
} from '../../lib/format';
import { Button, Input } from '../form';
import { BottomSheet, OutlineButton, Pill } from '../profile';
import type { ApiError } from '../reauth';
import { Block, BlockMessage, ButtonCell, ButtonRow, EditLink, useBlockState } from './block';

type Availability = components['schemas']['AvailabilityNotice'];
type T = (key: string, options?: Record<string, unknown>) => string;

export function AvailabilityBlock(props: {
  api: ApiClient;
  t: T;
  availability: Availability | null;
  onChange: (availability: Availability | null) => void;
}) {
  const { api, t, availability } = props;
  const block = useBlockState();
  const form = useBlockState();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const min = addDays(platformToday(), 1);

  function openSheet() {
    // The picker always shows a chosen day, so the form starts on it: the current date, else tomorrow.
    setDate(availability?.unavailableUntil ?? min);
    setMessage(availability?.message ?? '');
    form.reset();
    block.reset();
    setOpen(true);
  }

  async function save() {
    form.start();
    const res = await api.PUT('/me/availability', {
      body: { unavailableUntil: date, message: message.trim() },
    });
    if (res.error) return form.done({ err: res.error as ApiError });
    form.done({});
    setOpen(false);
    props.onChange(res.data);
    block.done({ ok: t('t_ur_availability_settings_updated') });
  }

  async function remove() {
    block.start();
    const res = await api.DELETE('/me/availability');
    if (res.error) return block.done({ err: res.error as ApiError });
    props.onChange(null);
    block.done({ ok: t('t_ur_availability_settings_updated') });
  }

  const pickerValue = dateOnlyToLocal(date && date >= min ? date : min);
  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      mode: 'date',
      value: pickerValue,
      minimumDate: dateOnlyToLocal(min),
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) setDate(localToDateOnly(picked));
      },
    });

  return (
    <Block
      title={t('t_availability')}
      hint={t('t_when_unavailable_u_wont_receive_orders')}
      testID="availability-block"
      action={
        availability ? null : (
          <EditLink label={t('t_set_availability')} onPress={openSheet} testID="availability-set" />
        )
      }
    >
      <BlockMessage ok={block.ok} general={block.general} />
      {availability ? (
        <View style={s.current} testID="availability-current">
          <Pill tone="danger" label={t('t_unavailable')} />
          <Text style={s.body}>
            {t('t_u_wont_be_able_to_receive_orders_until_date', {
              date: formatDateOnly(availability.unavailableUntil),
            })}
          </Text>
          <Text style={s.quote}>{availability.message}</Text>
          <ButtonRow>
            <ButtonCell>
              <OutlineButton
                label={t('t_change')}
                onPress={openSheet}
                testID="availability-change"
              />
            </ButtonCell>
            <ButtonCell>
              <OutlineButton
                label={t('t_remove')}
                onPress={() => !block.busy && void remove()}
                testID="availability-remove"
              />
            </ButtonCell>
          </ButtonRow>
        </View>
      ) : null}
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('t_change_availability')}
        closeLabel={t('t_ui_close')}
        testID="availability-sheet"
      >
        <View style={s.field}>
          <Text style={s.label}>{t('t_when_do_u_expect_tobe_ready_for_new_work')}</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              mode="date"
              display="inline"
              value={pickerValue}
              minimumDate={dateOnlyToLocal(min)}
              accentColor={theme.colors.action.primary}
              onChange={(_, picked) => picked && setDate(localToDateOnly(picked))}
            />
          ) : (
            <Pressable
              style={[s.dateField, form.fields.unavailableUntil ? s.dateFieldError : null]}
              onPress={openAndroidPicker}
              accessibilityRole="button"
              accessibilityLabel={t('t_when_do_u_expect_tobe_ready_for_new_work')}
              accessibilityValue={{ text: formatDateOnly(date) }}
              testID="availability-date"
            >
              <Text style={s.body}>{formatDateOnly(date)}</Text>
            </Pressable>
          )}
          {form.fields.unavailableUntil ? (
            <Text style={s.error} accessibilityLiveRegion="polite">
              {form.fields.unavailableUntil}
            </Text>
          ) : null}
        </View>
        <Input
          label={t('t_add_a_message')}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={750}
          placeholder={t('t_buyers_will_see_ur_message_when_visiting_ur_gigs')}
          error={form.fields.message}
        />
        <BlockMessage general={form.general} />
        <Button label={t('t_set_availability')} onPress={() => void save()} busy={form.busy} />
      </BottomSheet>
    </Block>
  );
}

const s = StyleSheet.create({
  current: { gap: theme.space[2] },
  body: { ...theme.text.body, color: theme.colors.text.primary },
  quote: {
    ...theme.text.body,
    color: theme.colors.text.secondary,
    borderLeftWidth: theme.borderWidth.strong,
    borderLeftColor: theme.colors.border.default,
    paddingLeft: theme.space[3],
  },
  field: { gap: theme.space[1] },
  label: { ...theme.text.label, color: theme.colors.text.primary },
  dateField: {
    backgroundColor: theme.colors.bg.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.strong,
    borderRadius: theme.radius.control,
    padding: theme.space[3],
    minHeight: theme.size.control.md,
    justifyContent: 'center',
  },
  dateFieldError: { borderColor: theme.colors.border.danger },
  error: { ...theme.text.bodySm, color: theme.colors.text.danger },
});
