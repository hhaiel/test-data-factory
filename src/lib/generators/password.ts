import { charLength } from '../strings';
import type { FieldSpec, PasswordRules, TestValue } from '../types';
import { emptyValue } from './shared';

type RuleName = keyof PasswordRules;

const RULE_LABEL: Record<RuleName, string> = { upper: 'uppercase letter', lower: 'lowercase letter', digit: 'number', symbol: 'symbol' };
const RULE_TEST: Record<RuleName, RegExp> = { upper: /\p{Lu}/u, lower: /\p{Ll}/u, digit: /\d/, symbol: /[^\p{L}\d\s]/u };
const PIECE: Record<RuleName, string> = { upper: 'Q', lower: 'a', digit: '7', symbol: '#' };
const FILLER: Record<RuleName, string> = { lower: 'testpass', upper: 'TESTPASS', digit: '2468', symbol: '#!@$' };
const ORDER: RuleName[] = ['upper', 'lower', 'digit', 'symbol'];

export const NO_RULES: PasswordRules = { upper: false, lower: false, digit: false, symbol: false };

export function requiredRules(rules: PasswordRules = NO_RULES): RuleName[] {
  return ORDER.filter((r) => rules[r]);
}

/**
 * Builds a password of exactly `length` characters that meets `rules`,
 * optionally leaving out one character type on purpose (to test that rule).
 */
export function buildPassword(length: number, rules: PasswordRules, omit?: RuleName): string {
  const pieces = requiredRules(rules).filter((r) => r !== omit).map((r) => PIECE[r]).join('');
  const fillerType = (['lower', 'upper', 'digit', 'symbol'] as RuleName[]).find((r) => r !== omit)!;
  let out = pieces;
  while (out.length < length) out += FILLER[fillerType];
  return out.slice(0, Math.max(length, 0));
}

/**
 * Password field. `min` / `max` are length limits, `rules` the character types it must contain.
 * Like text, a nasty value that also breaks a rule is expected to be rejected, with the reason.
 */
export function generatePassword(field: FieldSpec): TestValue[] {
  const rules = field.rules ?? NO_RULES;
  const required = requiredRules(rules);
  const min = field.min ?? 1;
  const max = field.max;
  const problems = (v: string) => {
    const len = charLength(v);
    const out: string[] = [];
    if (len < min) out.push(`shorter than the minimum of ${min}`);
    if (max !== undefined && len > max) out.push(`longer than the maximum of ${max}`);
    for (const r of required) if (!RULE_TEST[r].test(v)) out.push(`missing a ${RULE_LABEL[r]}`);
    return out;
  };
  const note = (v: string) => {
    const p = problems(v);
    return p.length ? ` It is also ${p.join(' and ')}.` : '';
  };

  const values: TestValue[] = [];
  const typicalLength = Math.min(Math.max(12, min, required.length), max ?? Infinity);
  const typical = buildPassword(typicalLength, rules);
  const rulesText = required.length ? `has a ${required.map((r) => RULE_LABEL[r]).join(', ')}` : 'no character rules';
  values.push({ value: typical, category: 'valid', expect: 'accept', reason: `Meets every rule: ${typicalLength} characters, ${rulesText}` });

  // Boundaries on length, each meeting the character rules.
  if (min > 0) {
    values.push({ value: buildPassword(min, rules), category: 'boundary', expect: 'accept', reason: `Exactly the minimum length (${min})` });
    if (min - 1 > 0) {
      values.push({ value: buildPassword(min - 1, rules), category: 'boundary', expect: 'reject', reason: `One character below the minimum (${min - 1})` });
    }
  }
  if (max !== undefined) {
    values.push({ value: buildPassword(max, rules), category: 'boundary', expect: 'accept', reason: `Exactly the maximum length (${max})` });
    values.push({ value: buildPassword(max + 1, rules), category: 'boundary', expect: 'reject', reason: `One character over the maximum (${max + 1})` });
  }

  // Invalid: empty, and one value per rule that leaves that character type out.
  values.push(emptyValue(field));
  for (const r of required) {
    values.push({ value: buildPassword(typicalLength, rules, r), category: 'invalid', expect: 'reject', reason: `No ${RULE_LABEL[r]}, otherwise valid` });
  }

  // Nasty.
  const half = Math.floor(typical.length / 2);
  const nasty: { value: string; expect: TestValue['expect']; reason: string }[] = [
    { value: 'Password1!', expect: 'confirm', reason: 'Meets the usual rules but is on every leaked-password list: should it be blocked?' },
    { value: ` ${typical} `, expect: 'confirm', reason: 'Spaces around it: if trimmed silently on sign-up, the user may not be able to sign in' },
    { value: `${typical.slice(0, half)} ${typical.slice(half)}`, expect: 'confirm', reason: 'Space inside: allowed by NIST guidance, blocked by many apps' },
    { value: `${typical.slice(0, -1)}😀`, expect: 'confirm', reason: 'Emoji: counts as 1 or 2 characters depending on the system' },
    { value: 'Pässwörd#7', expect: 'confirm', reason: 'Accented letters: can be stored two different ways, so the same password may not match' },
  ];
  for (const n of nasty) {
    const p = problems(n.value);
    values.push({ value: n.value, category: 'nasty', expect: p.length ? 'reject' : n.expect, reason: n.reason + note(n.value) });
  }
  const huge = buildPassword(10_000, rules);
  values.push(
    max === undefined
      ? { value: huge, category: 'nasty', expect: 'confirm', reason: 'Very long password (10,000 characters): no maximum is set, so confirm the real limit (hashing very long input can be slow)' }
      : { value: huge, category: 'nasty', expect: problems(huge).length ? 'reject' : 'accept', reason: 'Very long password (10,000 characters): checks limits on the server, not just the form' },
  );

  return values;
}
