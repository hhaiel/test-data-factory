# User Stories: Test Data Factory (TDF)

**Module:** Test Data Factory (whole app: field builder, generated values, filters, export, presets)
**Version:** 0.1.0 (commit 436b645)
**Roles involved:** Tester (the only role; no sign-in)
**Source of rules:** written by the developer before testing; the generator rules are in [CLAUDE.md](../CLAUDE.md) and `src/lib/generators/`.
**Status:** TESTED 2026-11-26 (see test-cases/TC-TDF.md for results). **(verify)** = behavior not decided yet; becomes "Needs confirmation" in test cases.

---

## US-TDF-0001: Tester describes the fields of a form

**As a** tester
**I want to** describe each field of a form with its type and rules
**So that** the tool can generate test data that matches the real requirements

**Pre-conditions:** App open. The "User signup" preset is loaded (default on first visit).

### Acceptance Criteria
- **AC1:** Given I click **+ Add field**, then a new text field named "Field N" (N = number of fields) is added, selected, and shown in the editor with Min length 1, Max length 50 and Required ticked.
- **AC2:** The editor shows Name, Type, Required, and the limits that fit the type: Min/Max length for Text, Min/Max value for Whole number, Earliest/Latest for Date, and a one-line rule note instead of limits for Email and PH mobile number.
- **AC3:** Changes in the editor update the field's summary in the list straight away (e.g. "Text, 2–50 chars, required").
- **AC4:** Changing the type resets the limits to that type's defaults (Text 1–50, Whole number 1–100, none for Email, Date and PH mobile).
- **AC5:** Invalid rules show an error under the editor and a red dot on the field in the list:
  - empty name → "Give the field a name"
  - min greater than max → "Min can't be greater than max"
  - a non-whole number in Min or Max (e.g. `2.5`, `abc`) → "Min must be a whole number" / "Max must be a whole number"
  - negative length → "Length can't be negative"
  - max length over 100,000 → "Max length is 100,000 characters"
  - earliest date after latest → "Earliest date can't be after the latest date"
- **AC6:** Leaving Min or Max empty means "no limit" and is not an error.
- **AC7:** Given I click **×** on a field, then it is removed. If it was selected, the first remaining field is selected.
- **AC8:** Given I remove every field, then the right panel shows "Add your first field" with an **Add field** button.

**Assumptions / open questions:**
- Removing a field has no confirmation and no undo. Acceptable for a small tool? **(verify)**
- Two fields can have the same name. In JSON and Playwright exports, the second overwrites the first. **(verify)**

---

## US-TDF-0002: Tester sees the values worth testing, with reasons

**As a** tester
**I want to** see generated values for the selected field, sorted into categories with an expected result and a reason
**So that** I can use them in test cases without building the lists by hand

**Pre-conditions:** A field with valid rules is selected.

### Acceptance Criteria
- **AC1:** The table shows Value, Type (Valid / Boundary / Invalid / Nasty), Expect (Accept / Reject / Confirm) and "Why it's here" for every value. No value appears twice.
- **AC2:** Boundaries sit exactly on and just outside each limit: Text min, min−1, max, max+1 characters; Whole number min, min−1, max, max+1; Date earliest, the day before, latest, the day after. On-limit values are Accept; outside are Reject.
- **AC3:** An empty value is Invalid / Reject for a required field and Valid / Accept for an optional one.
- **AC4:** A nasty value that also breaks a length rule is Reject, and its reason says it is too long or too short.
- **AC5:** Values that are hard to see are described: empty → "(empty)", only spaces → "(3 spaces)", leading/trailing spaces → "␣", a zero-width space → "[zero-width space]", values longer than 48 characters are shortened with their length, e.g. "… (10,000 chars)".
- **AC6:** Values that look like code (e.g. `<script>alert(1)</script>`) are shown as text and never run.
- **AC7:** Each category chip shows how many values are in that category.
- **AC8:** If the field's rules are invalid, the table is replaced by "Fix the field to see its test data: <error>." and all counts show 0.
- **AC9:** Generated emails only use `example.com` domains (reserved for testing).

---

## US-TDF-0003: Tester filters and copies values

**As a** tester
**I want to** hide categories I don't need and copy single values
**So that** I can focus on one kind of test and paste values straight into the app under test

**Pre-conditions:** A field with valid rules is selected.

### Acceptance Criteria
- **AC1:** Clicking a category chip hides that category's rows; the chip appears crossed out and its `aria-pressed` is false. Clicking again shows them.
- **AC2:** With every category hidden, the table shows "All categories are hidden. Turn one back on above."
- **AC3:** The hidden categories stay hidden when I select another field. **(verify: intended?)**
- **AC4:** Clicking **Copy** on a row puts the exact value on the clipboard (including spaces and invisible characters, not the "(empty)" / "␣" display) and the button shows ✓ for about 1.5 seconds.

---

## US-TDF-0004: Tester exports all the test data

**As a** tester
**I want to** download the data for all fields as CSV, JSON or a Playwright module
**So that** I can use it in spreadsheets, API tools and automated tests

**Pre-conditions:** At least one field has valid rules.

### Acceptance Criteria
- **AC1:** **CSV** downloads `test-data.csv` with the columns field, value, category, expect, reason, and one row per value for every field.
- **AC2:** The CSV opens correctly in Excel: accented letters and emoji display correctly, and values containing commas, quotes or line breaks stay in one cell.
- **AC3:** **JSON** downloads `test-data.json`: an object keyed by field name, each with its list of values.
- **AC4:** **Playwright** downloads `test-data.ts`, a TypeScript module exporting `testData` and the `TestValue` type, plus a commented example test.
- **AC5:** Fields with invalid rules are left out of every export, and a banner says "N field(s) has/have a problem and won't be exported until fixed."
- **AC6:** If no field is exportable, the three export buttons are disabled.

**Assumptions / open questions:**
- The Playwright file starts with comments and is meant to be pasted into a TypeScript project. Should it compile with `strict` on? **(verify, assumed yes)**

---

## US-TDF-0005: Tester starts from a preset and keeps their work

**As a** tester
**I want to** start from common forms and have my fields remembered
**So that** I don't rebuild the same fields every visit

**Pre-conditions:** App open.

### Acceptance Criteria
- **AC1:** On the first visit, the "User signup" preset is loaded: Full name, Age, Email, Mobile, with Full name selected.
- **AC2:** Choosing a preset from **Preset** replaces all fields with the preset's fields and selects the first one. The dropdown goes back to "Load a preset…".
- **AC3:** Presets available: User signup, Leave request, Checkout.
- **AC4:** After a reload, my fields and their rules are the same as before.
- **AC5:** If the saved data is broken (not valid JSON, or an empty list), the app loads the "User signup" preset instead of crashing.

**Assumptions / open questions:**
- Loading a preset replaces my fields without asking first. **(verify)**

---

## US-TDF-0006: The tool is usable with a keyboard and screen reader

**As a** tester who uses a keyboard or screen reader
**I want to** use every feature without a mouse
**So that** the tool is accessible to everyone

### Acceptance Criteria
- **AC1:** The main screen has no WCAG 2.1 A/AA violations reported by axe-core, in both the normal state and the "invalid field" state.
- **AC2:** Every input has a visible label, and every icon-only button has an accessible name (e.g. "Remove Age", "Copy value: …").
- **AC3:** All controls can be reached with Tab and used with Enter/Space, and focus is always visible.
- **AC4:** The selected field is announced (`aria-current`), and validation errors are announced (`role="alert"`).
- **AC5:** The layout works at 375 px wide with no horizontal page scroll (the table may scroll inside its own panel).
