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
const EXPECTATIONS: Expectation[] = ['accept', 'reject', 'confirm'];

export function ValuesTable({ field, values, error }: Props) {
  const [hidden, setHidden] = useState<Set<Category>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, values.filter((v) => v.category === c).length])) as Record<Category, number>;
  const expectCounts = Object.fromEntries(EXPECTATIONS.map((e) => [e, values.filter((v) => v.expect === e).length])) as Record<
    Expectation,
    number
  >;
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
        <div className="table-title">
          <h2 className="section-title">{field.name || 'Untitled field'}</h2>
          <p className="muted small">{describeRules(field)}</p>
          {!error && values.length > 0 && (
            <p className="summary">
              <strong>{values.length} values</strong>
              {EXPECTATIONS.map((e) => (
                <span key={e} className={`summary-item ${e}`}>
                  {expectCounts[e]} {EXPECT_LABEL[e].toLowerCase()}
                </span>
              ))}
            </p>
          )}
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

      <details className="legend">
        <summary>How to read this table</summary>
        <dl>
          <div>
            <dt>
              <span className="tag valid">Valid</span>
            </dt>
            <dd>Normal input the field should take.</dd>
          </div>
          <div>
            <dt>
              <span className="tag boundary">Boundary</span>
            </dt>
            <dd>Exactly on a limit, or one step past it. Where off-by-one bugs live.</dd>
          </div>
          <div>
            <dt>
              <span className="tag invalid">Invalid</span>
            </dt>
            <dd>The wrong kind of input: empty, letters in a number, a missing @.</dd>
          </div>
          <div>
            <dt>
              <span className="tag nasty">Nasty</span>
            </dt>
            <dd>Tricky input that breaks weak validation, storage or display.</dd>
          </div>
          <div>
            <dt>
              <span className="expect accept">Accept</span> / <span className="expect reject">Reject</span>
            </dt>
            <dd>What the app under test should do with the value.</dd>
          </div>
          <div>
            <dt>
              <span className="expect confirm">Confirm</span>
            </dt>
            <dd>Depends on a rule nobody wrote down yet. Ask before you test it.</dd>
          </div>
        </dl>
      </details>

      {error ? (
        <div className="empty">
          <p className="muted">Fix the field to see its test data: {error.toLowerCase()}.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p className="muted">All categories are hidden. Turn one back on above.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="values">
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
                    <code className={v.value.trim() === '' ? 'value placeholder' : 'value'}>{displayValue(v.value)}</code>
                  </td>
                  <td className="col-type">
                    <span className={`tag ${v.category}`}>{CATEGORY_LABEL[v.category]}</span>
                  </td>
                  <td className="col-expect">
                    <span className={`expect ${v.expect}`}>{EXPECT_LABEL[v.expect]}</span>
                  </td>
                  <td className="reason">{v.reason}</td>
                  <td className="col-copy">
                    <button type="button" className="copy" onClick={() => copy(v.value, i)} aria-label={`Copy value: ${v.reason}`}>
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
