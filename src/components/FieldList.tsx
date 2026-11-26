import { describeRules } from '../lib/describe';
import { validateField } from '../lib/generate';
import type { FieldSpec } from '../lib/types';

interface Props {
  fields: FieldSpec[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export function FieldList({ fields, selectedId, onSelect, onRemove, onAdd }: Props) {
  return (
    <div>
      <h2 className="section-title">Fields</h2>
      <ul className="field-list">
        {fields.map((f) => {
          const hasError = validateField(f) !== null;
          return (
            <li key={f.id} className={`field-item${f.id === selectedId ? ' selected' : ''}`}>
              <button type="button" className="field-select" onClick={() => onSelect(f.id)} aria-current={f.id === selectedId ? 'true' : undefined}>
                <span className="field-name">
                  {f.name || 'Untitled field'}
                  {hasError && <span className="dot" aria-label="has a problem" />}
                </span>
                <span className="muted small">{describeRules(f)}</span>
              </button>
              <button type="button" className="icon-btn" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name || 'field'}`}>
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="wide" onClick={onAdd}>
        + Add field
      </button>
    </div>
  );
}
