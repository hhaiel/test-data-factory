import { useState } from 'react';
import { parseLimit } from '../lib/generate';
import { FIELD_TYPE_LABELS, type FieldSpec, type FieldType } from '../lib/types';

interface Props {
  field: FieldSpec;
  error: string | null;
  onChange: (field: FieldSpec) => void;
}

/** Number inputs keep their raw text, so a half-typed "-" or "" doesn't jump back to a number. */
function useNumberText(initial?: number) {
  return useState(initial === undefined ? '' : String(initial));
}


export function FieldEditor({ field, error, onChange }: Props) {
  const [minText, setMinText] = useNumberText(field.min);
  const [maxText, setMaxText] = useNumberText(field.max);
  const set = (patch: Partial<FieldSpec>) => onChange({ ...field, ...patch });
  const isLength = field.type === 'text';
  const hasRange = field.type === 'text' || field.type === 'integer';

  function changeType(type: FieldType) {
    // Reset limits when the meaning of min/max changes, and suggest sensible ones.
    const defaults: Partial<FieldSpec> =
      type === 'text' ? { min: 1, max: 50 } : type === 'integer' ? { min: 1, max: 100 } : { min: undefined, max: undefined };
    setMinText(defaults.min === undefined ? '' : String(defaults.min));
    setMaxText(defaults.max === undefined ? '' : String(defaults.max));
    set({ type, ...defaults, minDate: undefined, maxDate: undefined });
  }

  return (
    <form className="editor" onSubmit={(e) => e.preventDefault()} aria-labelledby="editor-title">
      <h2 className="section-title" id="editor-title">
        Edit field
      </h2>

      <label className="control">
        <span>Name</span>
        <input value={field.name} onChange={(e) => set({ name: e.target.value })} placeholder="Full name" />
      </label>

      <label className="control">
        <span>Type</span>
        <select value={field.type} onChange={(e) => changeType(e.target.value as FieldType)}>
          {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {hasRange && (
        <div className="row">
          <label className="control">
            <span>{isLength ? 'Min length' : 'Min value'}</span>
            <input
              inputMode="numeric"
              value={minText}
              onChange={(e) => {
                setMinText(e.target.value);
                set({ min: parseLimit(e.target.value) });
              }}
              placeholder="None"
            />
          </label>
          <label className="control">
            <span>{isLength ? 'Max length' : 'Max value'}</span>
            <input
              inputMode="numeric"
              value={maxText}
              onChange={(e) => {
                setMaxText(e.target.value);
                set({ max: parseLimit(e.target.value) });
              }}
              placeholder="None"
            />
          </label>
        </div>
      )}

      {field.type === 'date' && (
        <div className="row">
          <label className="control">
            <span>Earliest</span>
            <input type="date" value={field.minDate ?? ''} onChange={(e) => set({ minDate: e.target.value || undefined })} />
          </label>
          <label className="control">
            <span>Latest</span>
            <input type="date" value={field.maxDate ?? ''} onChange={(e) => set({ maxDate: e.target.value || undefined })} />
          </label>
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
