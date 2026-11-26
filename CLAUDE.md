# CLAUDE.md: project conventions

Portfolio project: a web tool that generates test data for form fields. Read this before helping in this repo.

## Context
- The user is a QA engineer. The project should show **test design thinking**: every generated value has a category, an expected result and a reason.
- Related projects in the same parent folder: `orangehrm-qa-portfolio` (manual + Playwright) and `release-night-qa-game` (escape-room game). Keep doc style consistent with them: phased `ROADMAP.md` with "Done when" lines.

## Rules for generators (`src/lib/generators/`)
- Every value is a **string** (it's what a form receives).
- Every value needs `category` (valid / boundary / invalid / nasty), `expect` (accept / reject / confirm) and a short `reason` in plain English.
- Use `confirm` when the right behavior depends on an unwritten requirement. Don't invent a rule to avoid it.
- A nasty value that also breaks a length or range rule is expected to be `reject`, and the reason says why.
- Length = characters (code points), via `charLength` in `src/lib/strings.ts`.
- **No real personal data:** emails use `example.com`; phone numbers use the 0917 123 4567 placeholder.
- Every new type or rule gets unit tests in `src/lib/*.test.ts`.

## Commands
- `npm run dev`: local app on http://localhost:5173
- `npm test`: Vitest unit tests
- `npm run build`: typecheck + production build

## When the QA phase starts (ROADMAP Phase 2)
Use the same IDs and formats as `orangehrm-qa-portfolio/CLAUDE.md`, with module code `TDF`:
- User story `US-TDF-0001`, test case `US-TDF-0001-TC-001`, defect `DEF-001`
- Test cases via the `test-case-writer` skill, defects via the `bug-hunter` skill
