# Roadmap: building this project step by step

**Strategy:** ship a small tool that works well, then grow it. Each phase ends with something you can show. The generators are the heart of the project, so they get unit tests first; Playwright covers the UI once the screens settle.

**Total:** about 2–3 weeks part-time. Tick items off as you go. Each phase lists what "done" looks like.

```
Phase 0  Setup                         ½ day
Phase 1  First version (done)          ✓
Phase 2  QA the tool (done)            ✓
Phase 3  CI + deploy (done)            ✓
Phase 4  More field types + nasties    3–4 days
Phase 5  Plain-English input (AI)      2–3 days
Phase 6  Report + polish               1 day
```

---

## Phase 0: Setup (½ day)
- [ ] `npm install`, `npm run dev`, open http://localhost:5173 and try every preset
- [ ] `npm test` passes (78 unit tests) and `npm run test:e2e` passes (48 passed, 3 skipped)
- [ ] `git init`, first commit, create a **public** GitHub repo, push
- [ ] Read through `src/lib/generators/` so you can explain every value in an interview

**Done when:** the app runs locally and the repo is on GitHub.

## Phase 1: First version ✓
- [x] Field builder: name, type, min/max or date range, required
- [x] Generators for text, whole number, email, date, PH mobile
- [x] Valid / boundary / invalid / nasty categories, with Accept / Reject / Confirm and a reason for each value
- [x] Category filters, copy single value
- [x] Export CSV, JSON, Playwright module
- [x] Presets: User signup, Leave request, Checkout
- [x] Fields saved in the browser between visits
- [x] 55 unit tests (Vitest)

## Phase 2: QA the tool ✓
Treated as an application under test, the same way as OrangeHRM.
- [x] User stories + ACs: `user-stories/US-TDF.md` (6 stories)
- [x] Test cases with the **test-case-writer** skill: `test-cases/TC-TDF.md` (28 cases, 7 AC gaps)
- [x] Playwright: `tests/ui/` (one spec per story, page object, downloads read and checked, Playwright export compiled with `tsc --strict`)
- [x] `@axe-core/playwright` checks in light and dark mode, keyboard-only flow, 375 px layout
- [x] **The tool on itself:** `npm run export-self-test-data` exports data for the editor's Min length input through the app's UI; `tests/ui/self-test.spec.ts` drives a data-driven test with it
- [x] Defects logged with the **bug-hunter** skill: `defects/defect-log.md` (5 found, 5 fixed and retested; 2 found by the self-test)
- [ ] **Your part:** run the test cases by hand once (especially US-TDF-0004-TC-002 in Excel and the focus check in US-TDF-0006-TC-002), and decide the open "Needs confirmation" items
- [ ] Optional: one 60-minute exploratory session

**Done when:** UI tests pass locally, defects logged, at least one test runs on data the tool generated. ✓ (manual pass still to do)

## Phase 3: CI + deploy ✓
- [x] GitHub Actions (`.github/workflows/ci.yml`): typecheck, unit tests, build, Playwright on every push and pull request (about 1 minute)
- [x] Playwright HTML report uploaded as an artifact (kept 14 days)
- [x] Deployed to Vercel: https://test-data-factory.vercel.app (redeploys on every push to `main`)
- [x] `vercel.json`: security headers (CSP, nosniff, frame and referrer policies) and long-term caching for built assets
- [x] Live-site checks in `tests/live/` (run with `BASE_URL`); full suite passed against the live site on 2026-11-26 (51 passed, 3 skipped)
- [x] CI badge in the README
- [ ] Optional: in Vercel › Settings › Git, make production deploys wait for the GitHub CI check, so a failing build never goes live

**Done when:** green badge, live link. ✓

## Phase 4: More field types + nasty values (3–4 days)
Pick what's most useful; each type needs generators + unit tests.
- [ ] Decimal / currency (₱, 2 decimal places, rounding)
- [ ] Password with rules (length, character classes)
- [ ] Dropdown / enum (valid options, a removed option, wrong case)
- [ ] URL, PH postal code, time
- [ ] Optional "advanced nasty" pack: Unicode normalization (é as one vs two characters), very long words, homoglyphs
- [ ] Import / export field definitions as JSON so a set can be shared
- [ ] Export as Postman data file

**Done when:** at least 3 new types, each with tests.

## Phase 5: Plain-English input with AI (2–3 days, optional)
- [ ] "Describe your form" box: paste a requirement ("Age must be 18–65 and is required") and get field definitions back
- [ ] Use the Claude API through a small serverless function, so the API key never reaches the browser
- [ ] The AI only produces **field definitions**; the values still come from the tested generators (so the output stays predictable)
- [ ] Show what it understood and let the user correct it before generating

**Done when:** a pasted requirement becomes editable fields.

## Phase 6: Report + polish (1 day)
- [ ] Screenshot / short GIF in the README
- [ ] Short write-up: what you'd test differently in a real project, known limitations
- [ ] Link the repo from your OrangeHRM and Release Night READMEs

**Done when:** a recruiter can understand the project from the README in 2 minutes.
