import { useState } from 'react';
import { describeRules } from '../lib/describe';
import { displayValue } from '../lib/strings';
import { CATEGORIES, type Category, type Expectation, type FieldSpec, type TestValue } from '../lib/types';

interface Props {
  field: FieldSpec;
  values: TestValue[];
  error: string | null;
}

const CATEGORY_LABEL: Record<Category, string> = { valid: 'Valid', boundary: 'Boundary', invalid: 'Invalid', nasty: 'Nasty' };
const EXPECT_LABEL: Record<Expectation, string> = { accept: 'Accept', reject: 'Reject', confirm: 'Confirm' };

export function ValuesTable({ field, values, error }: Props) {
  const [hidden, setHidden] = useState<Set<Category>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, values.filter((v) => v.category === c).length])) as Record<Category, number>;
  const shown = values.map((v, i) => ({ v, i })).filter(({ v }) => !hidden.has(v.category));

  function toggle(c: Category) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  async function copy(value: string, index: number) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(index);
      setTimeout(() => setCopied((c) => (c === index ? null : c)), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context): nothing to do, the value is still visible.
    }
  }

  return (
    <div>
      <div className="table-head">
        <div>
          <h2 className="section-title">{field.name || 'Untitled field'}</h2>
          <p className="muted small">{describeRules(field)}</p>
        </div>
        <div className="filters" role="group" aria-label="Show categories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${c}${hidden.has(c) ? ' off' : ''}`}
              aria-pressed={!hidden.has(c)}
              onClick={() => toggle(c)}
            >
              {CATEGORY_LABEL[c]} <span className="count">{counts[c]}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="empty muted">Fix the field to see its test data: {error.toLowerCase()}.</p>
      ) : shown.length === 0 ? (
        <p className="empty muted">All categories are hidden. Turn one back on above.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col" className="col-value">
                  Value
                </th>
                <th scope="col">Type</th>
                <th scope="col">Expect</th>
                <th scope="col">Why it's here</th>
                <th scope="col">
                  <span className="sr-only">Copy</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ v, i }) => (
                <tr key={i}>
                  <td className="col-value">
                    <code className={v.value.trim() === '' ? 'placeholder' : undefined}>{displayValue(v.value)}</code>
                  </td>
                  <td>
                    <span className={`tag ${v.category}`}>{CATEGORY_LABEL[v.category]}</span>
                  </td>
                  <td>
                    <span className={`expect ${v.expect}`}>{EXPECT_LABEL[v.expect]}</span>
                  </td>
                  <td className="reason">{v.reason}</td>
                  <td>
                    <button type="button" className="icon-btn copy" onClick={() => copy(v.value, i)} aria-label={`Copy value: ${v.reason}`}>
                      {copied === i ? '✓' : 'Copy'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
