# Test Data Factory

<!-- CI badge goes here in Phase 3 -->

> Describe a form field and its rules. Get the values worth testing, sorted into **valid**, **boundary**, **invalid** and **nasty**, each with the expected result and **the reason it's there**.

Test design techniques (boundary value analysis, equivalence partitioning, error guessing) built into a tool, instead of written up in a document.

<!-- Add a screenshot or GIF here: docs/screenshot.png -->

## At a glance

| | |
|---|---|
| **What it does** | Generates test data for form and API fields, with an expected result and a reason for every value |
| **Field types** | Text, whole number, email, date, PH mobile number |
| **Exports** | CSV (opens in Excel), JSON, Playwright TypeScript module |
| **Stack** | React 19, TypeScript, Vite, Vitest |
| **Tests** | 55 unit tests on the generators and exporters (Playwright UI tests: Phase 2) |
| **Live demo** | [link once deployed in Phase 3] |

## Why I built it

Every time I write test cases I build the same lists by hand: the minimum, one below it, the maximum, one above it, empty, spaces only, an emoji, something that looks like SQL. This tool does that part, so the time goes into the cases that need thinking.

It also shows the reasoning. Every value says *why* it's in the set ("Just below the minimum (17)"), so the output reads like test design, not random data.

## How it works

1. Pick a preset (User signup, Leave request, Checkout) or add your own fields.
2. Set each field's type, limits and whether it's required.
3. Read the generated values. Filter by category, copy a single value, or export everything.

### What "Expect" means

| Expect | Meaning |
|---|---|
| **Accept** | The app should take this value |
| **Reject** | The app should refuse it with a clear message |
| **Confirm** | The right behavior depends on a requirement nobody wrote down (should spaces be trimmed? is `MARIA@` a duplicate of `maria@`?). Ask before testing, the same as "Needs confirmation" in a test case |

### Example: Age, whole number, 18–65, required

| Value | Category | Expect | Why it's here |
|---|---|---|---|
| `42` | Valid | Accept | Typical value inside the range |
| `18` | Boundary | Accept | Minimum allowed (18) |
| `17` | Boundary | Reject | Just below the minimum (17) |
| `42.5` | Invalid | Reject | Decimal in a whole-number field |
| `1e2` | Nasty | Reject | Scientific notation: JavaScript reads it as 100 |
| `٤٢` | Nasty | Reject | Arabic-Indic digits: real digits, but not 0–9 |

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # typecheck + production build
```

## Project structure

```
src/
  lib/
    types.ts            Field and value types
    generate.ts         Validates a field and picks the right generator
    generators/         One file per field type (text, integer, email, date, phMobile)
    exporters.ts        CSV, JSON and Playwright output
    *.test.ts           Unit tests (Vitest)
  components/           Field list, field editor, values table
  App.tsx
```

## Design decisions

- **Values are strings.** Everything typed into a form is a string, so `"42"`, `" 42 "` and `"042"` are different test values.
- **Length counts characters, not bytes.** `José` is 4 and `😀` is 1. Apps disagree on this, which is why emoji are in the nasty set.
- **No real personal data.** Emails use `example.com`, which is reserved for testing. The phone number is a well-known placeholder.
- **CSV is Excel-safe.** UTF-8 with a BOM, every cell quoted, so commas, quotes and accented letters survive.
- **Nasty values stay honest.** If a nasty value is also too long, it's expected to be rejected, and the reason says so.

## Related projects

- [OrangeHRM QA Automation Project](https://github.com/hhaiel/orangehrm-qa-portfolio): the generated Playwright module can feed its data-driven tests
- [Release Night: a QA escape room](https://github.com/hhaiel/release-night-qa-game)

