import { describeRules } from '../lib/describe';
import { validateField } from '../lib/generate';
import type { FieldSpec, FieldType } from '../lib/types';

interface Props {
  fields: FieldSpec[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

/** A short visual cue per type. Decorative: the type is also written out in the summary line. */
const TYPE_BADGE: Record<FieldType, string> = {
  text: 'Aa',
  integer: '123',
  decimal: '0.00',
  email: '@',
  date: '31',
  phMobile: '09',
  password: '***',
  dropdown: '▾',
};

export function FieldList({ fields, selectedId, onSelect, onRemove, onAdd }: Props) {
  return (
    <div>
      <h2 className="section-title">
        Fields <span className="muted count-label">{fields.length}</span>
      </h2>
      <ul className="field-list">
        {fields.map((f) => {
          const hasError = validateField(f) !== null;
          const selected = f.id === selectedId;
          return (
            <li key={f.id} className={`field-item${selected ? ' selected' : ''}${hasError ? ' has-error' : ''}`}>
              <button type="button" className="field-select" onClick={() => onSelect(f.id)} aria-current={selected ? 'true' : undefined}>
                <span className={`type-badge ${f.type}`} aria-hidden="true">
                  {TYPE_BADGE[f.type]}
                </span>
                <span className="field-text">
                  <span className="field-name">
                    {f.name || 'Untitled field'}
                    {hasError && <span className="dot" role="img" aria-label="has a problem" />}
                  </span>
                  <span className="muted small">{describeRules(f)}</span>
                </span>
              </button>
              <button type="button" className="icon-btn remove" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name || 'field'}`}>
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="wide add" onClick={onAdd}>
        + Add field
      </button>
    </div>
  );
}
