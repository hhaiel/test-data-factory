import { useId, useState, type ReactNode } from 'react';
import { parseDecimalLimit, parseLimit, parseOptions } from '../lib/generate';
import { FIELD_TYPE_LABELS, type FieldSpec, type FieldType, type PasswordRules } from '../lib/types';

interface Props {
  field: FieldSpec;
  error: string | null;
  onChange: (field: FieldSpec) => void;
}

const ALL_RULES: PasswordRules = { upper: true, lower: true, digit: true, symbol: true };
const RULE_LABELS: [keyof PasswordRules, string][] = [
  ['upper', 'Uppercase letter (A–Z)'],
  ['lower', 'Lowercase letter (a–z)'],
  ['digit', 'Number (0–9)'],
  ['symbol', 'Symbol (#, !, @…)'],
];

/** Sensible starting rules for each type. Everything type-specific is reset when the type changes. */
const TYPE_DEFAULTS: Record<FieldType, Partial<FieldSpec>> = {
  text: { min: 1, max: 50 },
  integer: { min: 1, max: 100 },
  decimal: { min: 0, max: 1000, decimals: 2 },
  email: {},
  date: {},
  phMobile: {},
  password: { min: 8, max: 64, rules: ALL_RULES },
  dropdown: { options: ['Option A', 'Option B', 'Option C'] },
};

const textOf = (n?: number) => (n === undefined ? '' : String(n));

/**
 * A labelled control. The label points at the control with for/id instead of wrapping it:
 * a wrapped <select> or <textarea> gets its current value added to its accessible name, so a
 * screen reader would read "Type Text" or "Options Option A Option B…" (DEF-006).
 */
function Control({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="control">
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}

export function FieldEditor({ field, error, onChange }: Props) {
  // Inputs keep their raw text, so a half-typed "-", "12." or a new empty line isn't overwritten.
  const [minText, setMinText] = useState(textOf(field.min));
  const [maxText, setMaxText] = useState(textOf(field.max));
  const [decimalsText, setDecimalsText] = useState(textOf(field.decimals ?? 2));
  const [optionsText, setOptionsText] = useState((field.options ?? []).join('\n'));
  const set = (patch: Partial<FieldSpec>) => onChange({ ...field, ...patch });

  const isLength = field.type === 'text' || field.type === 'password';
  const hasRange = isLength || field.type === 'integer' || field.type === 'decimal';
  const parse = field.type === 'decimal' ? parseDecimalLimit : parseLimit;

  function changeType(type: FieldType) {
    const defaults = TYPE_DEFAULTS[type];
    setMinText(textOf(defaults.min));
    setMaxText(textOf(defaults.max));
    setDecimalsText(textOf(defaults.decimals ?? 2));
    setOptionsText((defaults.options ?? []).join('\n'));
    onChange({
      id: field.id,
      name: field.name,
      required: field.required,
      type,
      ...defaults,
    });
  }

  return (
    <form className="editor" onSubmit={(e) => e.preventDefault()} aria-labelledby="editor-title">
      <h2 className="section-title" id="editor-title">
        Edit field
      </h2>

      <Control label="Name">
        {(id) => <input id={id} value={field.name} onChange={(e) => set({ name: e.target.value })} placeholder="Full name" />}
      </Control>

      <Control label="Type">
        {(id) => (
          <select id={id} value={field.type} onChange={(e) => changeType(e.target.value as FieldType)}>
            {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      </Control>

      {hasRange && (
        <div className="row">
          <Control label={isLength ? 'Min length' : 'Min value'}>
            {(id) => (
              <input
                id={id}
                inputMode={field.type === 'decimal' ? 'decimal' : 'numeric'}
                value={minText}
                onChange={(e) => {
                  setMinText(e.target.value);
                  set({ min: parse(e.target.value) });
                }}
                placeholder="None"
              />
            )}
          </Control>
          <Control label={isLength ? 'Max length' : 'Max value'}>
            {(id) => (
              <input
                id={id}
                inputMode={field.type === 'decimal' ? 'decimal' : 'numeric'}
                value={maxText}
                onChange={(e) => {
                  setMaxText(e.target.value);
                  set({ max: parse(e.target.value) });
                }}
                placeholder="None"
              />
            )}
          </Control>
        </div>
      )}

      {field.type === 'decimal' && (
        <Control label="Decimal places">
          {(id) => (
            <input
              id={id}
              inputMode="numeric"
              value={decimalsText}
              onChange={(e) => {
                setDecimalsText(e.target.value);
                // Empty means the default of 2; anything that isn't plain digits is reported by validation.
                set({ decimals: parseLimit(e.target.value) ?? 2 });
              }}
            />
          )}
        </Control>
      )}

      {field.type === 'password' && (
        <fieldset className="rules">
          <legend>Must contain</legend>
          {RULE_LABELS.map(([rule, label]) => (
            <label className="check" key={rule}>
              <input
                type="checkbox"
                checked={field.rules?.[rule] ?? false}
                onChange={(e) => set({ rules: { ...(field.rules ?? ALL_RULES), [rule]: e.target.checked } })}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      )}

      {field.type === 'dropdown' && (
        <Control label="Options (one per line)">
          {(id) => (
            <textarea
              id={id}
              rows={5}
              value={optionsText}
              onChange={(e) => {
                setOptionsText(e.target.value);
                set({ options: parseOptions(e.target.value) });
              }}
            />
          )}
        </Control>
      )}

      {field.type === 'date' && (
        <div className="row">
          <Control label="Earliest">
            {(id) => <input id={id} type="date" value={field.minDate ?? ''} onChange={(e) => set({ minDate: e.target.value || undefined })} />}
          </Control>
          <Control label="Latest">
            {(id) => <input id={id} type="date" value={field.maxDate ?? ''} onChange={(e) => set({ maxDate: e.target.value || undefined })} />}
          </Control>
        </div>
      )}

      {field.type === 'email' && <p className="muted small">Standard email rules. Generated addresses use example.com.</p>}
      {field.type === 'phMobile' && <p className="muted small">Accepts 09XXXXXXXXX or +639XXXXXXXXX.</p>}

      <label className="check">
        <input type="checkbox" checked={field.required} onChange={(e) => set({ required: e.target.checked })} />
        <span>Required</span>
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
