/**
 * Length in characters as a person counts them (code points), not UTF-16 units.
 * "José" is 4, and an emoji like "😀" is 1 rather than 2.
 * Apps disagree on this, which is exactly why emoji are in the nasty set.
 */
export function charLength(value: string): number {
  return [...value].length;
}

/** Builds a readable string of exactly `length` characters, e.g. for boundary values. */
export function stringOfLength(length: number, seed = 'Maria Santos '): string {
  if (length <= 0) return '';
  let out = '';
  while (out.length < length) out += seed;
  out = out.slice(0, length);
  // A trailing space would make the value look shorter than it is in most UIs.
  if (out.endsWith(' ')) out = out.slice(0, -1) + 'x';
  return out;
}

const INVISIBLE: Record<string, string> = {
  '​': '[zero-width space]',
  ' ': '[non-breaking space]',
  '\t': '[tab]',
  '\n': '[newline]',
};

const MAX_PREVIEW = 48;

/**
 * Makes a value readable in the table without changing what gets exported:
 * empty and whitespace-only values are described, invisible characters are named,
 * and very long values are shortened with their length shown.
 */
export function displayValue(value: string): string {
  if (value === '') return '(empty)';
  if (value.trim() === '' && /^ +$/.test(value)) {
    return `(${value.length} space${value.length === 1 ? '' : 's'})`;
  }
  // Leading and trailing spaces are the point of some values, so make them visible as ␣.
  const lead = /^ */.exec(value)![0].length;
  const trail = / *$/.exec(value)![0].length;
  const core = value.slice(lead, value.length - trail);
  let shown = '␣'.repeat(lead);
  for (const ch of core) shown += INVISIBLE[ch] ?? ch;
  shown += '␣'.repeat(trail);
  const length = charLength(value);
  if (charLength(shown) > MAX_PREVIEW) {
    shown = [...shown].slice(0, MAX_PREVIEW).join('') + `… (${length.toLocaleString('en-US')} chars)`;
  }
  return shown;
}
