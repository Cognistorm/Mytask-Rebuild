// Georgian and English content-field rules (ROADMAP 4.3.3a; spec 00 R-5.3a P-136, R-5.4; spec 04 AC-5, AC-6): the
// examples of the specs, the refused-character list (order, once each, at most 10), normalisation and markup.
import { describe, expect, it } from 'vitest';
import {
  checkEnglishField,
  checkGeorgianField,
  contentFieldError,
  normaliseContentText,
} from '../src/platform/content-language';

describe('Georgian fields (R-5.3a)', () => {
  it('accepts Georgian with Latin words, digits and the 8 marks (AC-5)', () => {
    expect(checkGeorgianField('title.ka', 'Logo დიზაინი Photoshop-ში')).toBeNull();
    expect(checkGeorgianField('title.ka', 'ვებ-საიტი (2 გვერდი), სწრაფად! რატომ? ა_ბ.')).toBeNull();
    expect(checkGeorgianField('description.ka', 'პირველი\nმეორე\r\n\tმესამე')).toBeNull();
  });

  it('needs at least one Georgian letter (P-37)', () => {
    expect(checkGeorgianField('title.ka', 'Logo design')).toEqual({
      field: 'title.ka',
      code: 'georgian_letter_required',
      messageKey: 't_validator_georgian_letter_required',
      refusedCharacters: [],
    });
  });

  it('names the refused characters in order of first appearance, once each (AC-5)', () => {
    expect(checkGeorgianField('title.ka', 'ფასი: 50₾, ფასი: 60₾')).toEqual({
      field: 'title.ka',
      code: 'georgian_field_characters',
      messageKey: 't_validator_georgian_field_characters',
      params: { chars: ': ₾' },
      refusedCharacters: [':', '₾'],
    });
  });

  it('lists at most 10 refused characters', () => {
    const issue = checkGeorgianField('title.ka', 'ა ; " \' / \\ % + & * # @ № « »');
    expect(issue?.refusedCharacters).toEqual([';', '"', "'", '/', '\\', '%', '+', '&', '*', '#']);
    expect(issue?.params?.chars).toBe('; " \' / \\ % + & * #');
  });

  it('refuses other scripts, Mtavruli capitals, archaic letters and emoji (one character each)', () => {
    const issue = checkGeorgianField('title.ka', 'დიზაინი Дизайн ᲓᲘᲖᲐᲘᲜᲘ ჱ 🎨 – …');
    expect(issue?.refusedCharacters).toEqual(['Д', 'и', 'з', 'а', 'й', 'н', 'Დ', 'Ი', 'Ზ', 'Ა']);
    expect(checkGeorgianField('title.ka', 'ლოგო 🎨')?.refusedCharacters).toEqual(['🎨']);
    expect(checkGeorgianField('title.ka', 'ლოგო ჱ')?.refusedCharacters).toEqual(['ჱ']);
  });

  it('refusal wins over the letter rule: a Latin text with a colon lists the colon', () => {
    expect(checkGeorgianField('title.ka', 'Logo: design')?.code).toBe('georgian_field_characters');
  });

  it('checks formatted text after removing markup and decoding entities', () => {
    const html = '<p><strong>ლოგო</strong> დიზაინი</p><ul><li>ერთი</li></ul><br>';
    expect(checkGeorgianField('description.ka', html, true)).toBeNull();
    expect(
      checkGeorgianField('description.ka', '<p>ფასი&#58; 50 &amp; მეტი</p>', true)
        ?.refusedCharacters,
    ).toEqual([':', '&']);
    // The same text unformatted: the markup itself is refused.
    expect(checkGeorgianField('title.ka', '<b>ლოგო</b>')?.refusedCharacters).toEqual([
      '<',
      '>',
      '/',
    ]);
  });

  it('turns no-break, zero-width and BOM spaces into spaces before checking', () => {
    expect(normaliseContentText('﻿ ლოგო დიზაინი​ ')).toBe('ლოგო დიზაინი');
    expect(checkGeorgianField('title.ka', 'ლოგო დიზაინი​')).toBeNull();
    expect(normaliseContentText('<p>&nbsp;ლოგო&nbsp;</p>', true)).toBe('ლოგო');
  });
});

describe('English fields (R-5.4, AC-6)', () => {
  it('accepts Latin text with any punctuation', () => {
    expect(checkEnglishField('title.en', 'Logo design: 50% off!')).toBeNull();
    expect(checkEnglishField('description.en', '<p><em>Fast</em> delivery</p>', true)).toBeNull();
  });

  it('refuses a Georgian letter or a text without a Latin letter', () => {
    const refused = {
      field: 'title.en',
      code: 'georgian_letters_not_allowed',
      messageKey: 't_validator_english_only',
    };
    expect(checkEnglishField('title.en', 'Logo დიზაინი')).toEqual(refused);
    expect(checkEnglishField('title.en', '123 456')).toEqual(refused);
    expect(checkEnglishField('title.en', '<p>ლოგო</p>', true)).toEqual(refused);
  });
});

describe('contentFieldError', () => {
  it('adds the message in the request language with the chars placeholder', () => {
    const issue = checkGeorgianField('title.ka', 'ფასი: 50₾')!;
    const t = (key: string, params?: Record<string, string | number>) =>
      `${key}|${String(params?.chars)}`;
    expect(contentFieldError(issue, t)).toMatchObject({
      field: 'title.ka',
      code: 'georgian_field_characters',
      message: 't_validator_georgian_field_characters|: ₾',
      refusedCharacters: [':', '₾'],
    });
  });
});
