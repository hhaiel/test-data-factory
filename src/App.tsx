import { useEffect, useMemo, useState } from 'react';
import { FieldEditor } from './components/FieldEditor';
import { FieldList } from './components/FieldList';
import { ValuesTable } from './components/ValuesTable';
import { download } from './lib/download';
import { buildDataSet, toCsv, toJson, toPlaywright } from './lib/exporters';
import { generate, validateField } from './lib/generate';
import { PRESETS, fieldsFromPreset, newId } from './lib/presets';
import type { FieldSpec } from './lib/types';

const STORAGE_KEY = 'tdf.fields.v1';

function loadFields(): FieldSpec[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as FieldSpec[];
      // JSON turns an unfinished number (NaN) into null; treat that as "no limit".
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((f) => ({ ...f, min: f.min ?? undefined, max: f.max ?? undefined }));
      }
    }
  } catch {
    // Corrupt or unavailable storage: fall back to the default preset.
  }
  return fieldsFromPreset(PRESETS[0]);
}

export default function App() {
  const [fields, setFields] = useState<FieldSpec[]>(loadFields);
  const [selectedId, setSelectedId] = useState<string>(() => fields[0]?.id ?? '');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
    } catch {
      // Storage full or blocked: the app still works, it just won't remember fields.
    }
  }, [fields]);

  const selected = fields.find((f) => f.id === selectedId) ?? fields[0];
  const error = selected ? validateField(selected) : null;
  const values = useMemo(() => (selected ? generate(selected) : []), [selected]);
  const exportable = fields.filter((f) => !validateField(f));

  function updateField(next: FieldSpec) {
    setFields((all) => all.map((f) => (f.id === next.id ? next : f)));
  }

  function addField() {
    const field: FieldSpec = { id: newId(), name: `Field ${fields.length + 1}`, type: 'text', required: true, min: 1, max: 50 };
    setFields((all) => [...all, field]);
    setSelectedId(field.id);
  }

  function removeField(id: string) {
    const remaining = fields.filter((f) => f.id !== id);
    setFields(remaining);
    if (id === selected?.id) setSelectedId(remaining[0]?.id ?? '');
  }

  function loadPreset(name: string) {
    const preset = PRESETS.find((p) => p.name === name);
    if (!preset) return;
    const next = fieldsFromPreset(preset);
    setFields(next);
    setSelectedId(next[0].id);
  }

  function exportAs(kind: 'csv' | 'json' | 'ts') {
    const data = buildDataSet(exportable);
    if (kind === 'csv') download('test-data.csv', toCsv(data), 'text/csv;charset=utf-8');
    if (kind === 'json') download('test-data.json', toJson(data), 'application/json');
    if (kind === 'ts') download('test-data.ts', toPlaywright(data), 'text/plain;charset=utf-8');
  }

  const skipped = fields.length - exportable.length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <div>
            <h1>Test Data Factory</h1>
            <p className="muted">Describe a field. Get the values worth testing, and why.</p>
          </div>
        </div>
        <div className="actions">
          <label className="preset">
            <span className="muted">Preset</span>
            <select value="" onChange={(e) => loadPreset(e.target.value)} aria-label="Load a preset (replaces your fields)">
              <option value="" disabled>
                Load a preset…
              </option>
              {PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="export" role="group" aria-label="Export all fields">
            <button type="button" onClick={() => exportAs('csv')} disabled={exportable.length === 0}>
              CSV
            </button>
            <button type="button" onClick={() => exportAs('json')} disabled={exportable.length === 0}>
              JSON
            </button>
            <button type="button" onClick={() => exportAs('ts')} disabled={exportable.length === 0}>
              Playwright
            </button>
          </div>
        </div>
      </header>
      {skipped > 0 && (
        <p className="notice" role="status">
          {skipped} field{skipped === 1 ? ' has' : 's have'} a problem and won't be exported until fixed.
        </p>
      )}

      <main className="layout">
        <aside className="panel side" aria-label="Fields">
          <FieldList fields={fields} selectedId={selected?.id} onSelect={setSelectedId} onRemove={removeField} onAdd={addField} />
          {selected && <FieldEditor key={selected.id} field={selected} error={error} onChange={updateField} />}
        </aside>
        <section className="panel" aria-label="Generated test data">
          {selected ? (
            <ValuesTable field={selected} values={values} error={error} />
          ) : (
            <div className="empty">
              <h2>Add your first field</h2>
              <p className="muted">Describe a form field and its rules, and the test data appears here.</p>
              <button type="button" onClick={addField}>
                Add field
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="footer muted">
        Generated emails use example.com, a domain reserved for testing. Values marked “Confirm” depend on requirements: ask before
        assuming.
      </footer>
    </div>
  );
}
