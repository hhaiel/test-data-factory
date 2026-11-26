/** The kinds of field the factory can generate data for. */
export type FieldType = 'text' | 'integer' | 'decimal' | 'email' | 'date' | 'phMobile' | 'password' | 'dropdown';

/** Character types a password must contain. */
export interface PasswordRules {
  upper: boolean;
  lower: boolean;
  digit: boolean;
  symbol: boolean;
}

/**
 * One field in a form or API, described the way a tester would read it from a requirement.
 *
 * `min` and `max` mean different things per type:
 * - text, password: length in characters
 * - integer, decimal: the value itself
 * - date: not used (see `minDate` / `maxDate`)
 * - email, phMobile, dropdown: not used
 */
export interface FieldSpec {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  min?: number;
  max?: number;
  /** Earliest allowed date, as YYYY-MM-DD. */
  minDate?: string;
  /** Latest allowed date, as YYYY-MM-DD. */
  maxDate?: string;
  /** Decimal: digits allowed after the decimal point (0–6). */
  decimals?: number;
  /** Password: character types it must contain. */
  rules?: PasswordRules;
  /** Dropdown: the options a user can pick, in order. */
  options?: string[];
}

/** Why a value is in the set. */
export type Category = 'valid' | 'boundary' | 'invalid' | 'nasty';

/**
 * What the app should do with the value.
 * `confirm` means the right behavior depends on requirements nobody wrote down yet,
 * so the tester has to ask (the same idea as "Needs confirmation" in a test case).
 */
export type Expectation = 'accept' | 'reject' | 'confirm';

export interface TestValue {
  /** Exactly what gets typed or sent. Every form input is a string, so values are strings too. */
  value: string;
  category: Category;
  expect: Expectation;
  /** Why this value is worth testing, in one short sentence. */
  reason: string;
}

export const CATEGORIES: Category[] = ['valid', 'boundary', 'invalid', 'nasty'];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  integer: 'Whole number',
  decimal: 'Decimal / amount',
  email: 'Email',
  date: 'Date',
  phMobile: 'PH mobile number',
  password: 'Password',
  dropdown: 'Dropdown',
};
