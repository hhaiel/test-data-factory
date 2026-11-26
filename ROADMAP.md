# Roadmap: building this project step by step

**Strategy:** ship a small tool that works well, then grow it. Each phase ends with something you can show. The generators are the heart of the project, so they get unit tests first; Playwright covers the UI once the screens settle.

**Total:** about 2–3 weeks part-time. Tick items off as you go. Each phase lists what "done" looks like.

```
Phase 0  Setup                         ½ day
Phase 1  First version (done)          ✓
Phase 2  QA the tool                   3–4 days
Phase 3  CI + deploy                   1 day
Phase 4  More field types + nasties    3–4 days
Phase 5  Plain-English input (AI)      2–3 days
Phase 6  Report + polish               1 day
```

---

## Phase 0: Setup (½ day)
- [ ] `npm install`, `npm run dev`, open http://localhost:5173 and try every preset
- [ ] `npm test` passes (55 tests)
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

## Phase 2: QA the tool (3–4 days)
Treat it as an application under test, the same way as OrangeHRM.
- [ ] Write user stories + ACs: `user-stories/US-TDF.md` (field builder, generation, filters, export, saved fields)
- [ ] Generate test cases with the **test-case-writer** skill: `test-cases/TC-TDF.md`
- [ ] Execute them manually; log real bugs with the **bug-hunter** skill in `defects/defect-log.md`
- [ ] Add Playwright: `tests/ui/` (build a field, filter, copy, each export downloads a file with the right content)
- [ ] Add `@axe-core/playwright` accessibility checks on the main screen
- [ ] **Use the tool on itself:** export test data for the field editor's Min/Max inputs and drive a data-driven Playwright test with it

**Done when:** UI tests pass locally, defects logged, at least one test runs on data the tool generated.

## Phase 3: CI + deploy (1 day)
- [ ] GitHub Actions: typecheck, unit tests, build, Playwright on every push and pull request
- [ ] Upload the Playwright HTML report as an artifact
- [ ] Deploy to Vercel (static site, no server needed) and put the link in the README
- [ ] CI badge in the README

**Done when:** green badge, live link.

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
