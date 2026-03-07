# Future-Proofing: Scaling the Questionnaire

This document outlines a plan to support expanding the questionnaire from ~60 questions to many more (e.g. 200–500+) without breaking existing sessions or hitting limits.

---

## Assumption: “Editing” a question = new question + deprecate old

**When we change or “edit” a question, we do not edit it in place.** We:

1. **Add a new question** with a new stable id (e.g. string id) and the new text/options.
2. **Remove (deprecate) the old question** from the `QUESTIONS` array.

So “edit question 5” means: add a new question (new id), delete the old one. Old answers for the deprecated question remain in stored data but are no longer shown; the new question appears blank until users answer it. This avoids showing old answers under reworded questions. **Assume this whenever question changes are requested.**

---

## 1. Current State (Summary)

| Area | How it works today |
|------|---------------------|
| **Question definitions** | Single `data.js`: `QUESTIONS` array (id 1–60), `SECTIONS` array. Keys in answers are `q1`, `q2`, … `q60`. |
| **Storage (local)** | `localStorage`: two keys (`polycule_answers_a`, `polycule_answers_b`) each holding full JSON `{ q1: { value, notes }, q2: …, }`. |
| **Storage (cloud)** | Supabase `sessions` table: `answers_a`, `answers_b` as JSONB (same shape). |
| **Rendering** | Form / Compare / Contract each iterate all questions and build one large block of HTML. |
| **Versioning** | Export has `EXPORT_VERSION = 1`; no questionnaire/schema version in stored data or cloud. |

---

## 2. Risks as the Questionnaire Grows

- **Maintainability**: One huge `QUESTIONS` array is hard to edit and review; merge conflicts when multiple people add questions.
- **Performance**: Rendering 200+ questions in one go can slow first load and tab switches; long scroll is poor UX.
- **Storage limits**: `localStorage` is typically 5–10 MB per origin. Hundreds of questions × 2 partners × (value + notes) could approach limits; large JSON also parses on every load.
- **Cloud**: Large JSONB rows can hit size limits or slow fetches; no way to “patch” one answer without rewriting the whole blob.
- **IDs and migrations**: Adding/removing/reordering questions with numeric ids (1, 2, …) forces renumbering and complicates backward compatibility for old saves.

---

## 3. Recommended Plan (Phased)

### Phase 1: Do Soon (Low Risk, High Value)

**3.1 Questionnaire / schema version in data**

- Add a single constant, e.g. `QUESTIONNAIRE_VERSION = 1`, in `data.js` (or a small `version.js`).
- Include it in:
  - Exported session/agreement payloads (`buildExportData`),
  - Cloud session payloads (e.g. store in `sessions` as `questionnaire_version` or inside existing JSON).
- **Why**: When you add many questions or change structure later, you can detect old sessions (version &lt; N) and run a migration or show “this session was created with an older questionnaire” and offer to upgrade or keep as-is.

**3.2 Stable question IDs for new questions**

- **Current**: IDs are numeric (1–60). Answers stored as `q1`, `q2`, …
- **Going forward**: Prefer **string IDs** that never change, e.g. `money_independent`, `money_shared`, `structure_cohabit`, `values_commitment` (you already have a natural one for the last: id 50).
- **Compatibility**: Keep supporting numeric `q1`…`q60` in storage and in code. New questions use string ids; answer keys become `q_money_independent` or just `money_independent` (decide one convention). In `app.js` and `agreement-generator.js`, use `q.id` as-is (so id can be number or string) and ensure answer keys are consistent, e.g. `'q' + q.id` or a small helper `answerKey(q)` that normalizes (e.g. number → `q17`, string → `q_metamours_meet`).
- **Why**: Adding a question in the middle of a section no longer forces renumbering; old data stays valid; merges are easier.

**3.3 Section-based form UX (progressive enhancement)**

- Keep rendering all questions for now for simplicity.
- Add **section navigation** so users don’t face one endless scroll: e.g. sticky list of section links, or “Next section” / “Previous section” buttons that scroll or expand only that section.
- Optional: render form **one section at a time** (accordion or steps). Only the active section’s DOM is fully built; others can be placeholders or lazy-rendered on first view. This improves performance when the list grows.

**3.4 Document “how to add questions”**

- In repo (e.g. in this file or a short CONTRIBUTING.md): steps to add a question (which file, id format, section, type, options), and that new questions should use stable string ids. Reduces mistakes when many people edit.

---

### Phase 2: When the question count grows (e.g. 100+)

**3.5 Split question definitions by section or domain**

- Replace single `QUESTIONS` array with:
  - Either one file per section: `data/money.js`, `data/structure.js`, … each exporting that section’s questions,
  - Or a single `data.js` that imports and concatenates them: `QUESTIONS = [...money, ...structure, ...]`.
- Keep `SECTIONS` in one place (or derive from the list of section files).
- **Why**: Easier to find and edit questions; fewer merge conflicts; can later load sections on demand if you add lazy loading.

**3.6 Lazy / virtual rendering for very long lists**

- **Form**: Render only the current section (or a window of sections); when the user switches section, render that block. Or use a “virtual list” so only visible questions are in the DOM.
- **Compare**: Same idea: by section, or virtualized table rows.
- **Contract**: Already section-based; ensure we only build recommendation/QA for the sections that exist and have answers.

**3.7 Optional: IndexedDB for local answers**

- If `localStorage` size or parse cost becomes an issue: store answers in IndexedDB (one object per session or per partner) and keep only “current session id” in `localStorage`/`sessionStorage`. Load/save answers asynchronously.
- Keep the same *shape* of data (e.g. `{ q1: { value, notes }, … }`) so the rest of the app doesn’t need to change.

---

### Phase 3: If cloud or collaboration grows

**3.8 Cloud: optional normalized answers table**

- Today: one row per session, `answers_a` and `answers_b` as big JSONB blobs.
- Future option: a table `answers` with columns e.g. `session_id`, `partner` (A/B), `question_id`, `value`, `notes`, `updated_at`. Then you can fetch/patch per question or per section and avoid large row updates. The app would still work with the current blob format; a migration script could split existing blobs into rows for new sessions going forward.

**3.9 Backward compatibility and migrations**

- When you bump `QUESTIONNAIRE_VERSION` (e.g. new sections or renames):
  - On load (local or cloud): if stored version &lt; current, either (a) run a small migration (map old ids to new, add defaults for new questions), or (b) show a message and keep showing old questionnaire for that session.
  - Document in this file: “Version 2: added section X, new questions use string ids …” so you can write migration logic later.

---

## 4. What to Do Right Now (Concrete)

1. **Add `QUESTIONNAIRE_VERSION`**  
   In `data.js` add `var QUESTIONNAIRE_VERSION = 1;` and export or expose it. In `app.js` include it in `buildExportData()`. In `cloud.js` include it in the session payload when saving (if you add a column or a metadata JSON field).
2. **Decide ID convention for new questions**  
   Pick one: new questions use string ids like `section_shortname`; answer keys `'q' + id` so you get `q_money_independent`. Ensure `data.js` and all loops (form, compare, contract, agreement generator) use `q.id` and the same key rule so both numeric and string ids work.
3. **Add section navigation to the form**  
   E.g. a sticky sidebar or bar of section links that scroll to each section, or “Next / Previous section” buttons. No need to change how answers are stored.
4. **Keep this document updated**  
   When you add Phase 2 or 3 items, note them here (and any schema/version changes) so the plan stays accurate.

---

## 5. How to add questions

- **Where:** Edit `data.js`. Add a new object to the `QUESTIONS` array (or to the right section if you later split into multiple files).
- **ID for new questions:** Use a **stable string id** (e.g. `money_independent`, `structure_cohabit`). The app uses `getAnswerKey(q)`: numeric ids become `q1`, `q2`; string ids become `q_money_independent`. Existing questions keep numeric ids (1–60).
- **Shape:** `{ id: 'section_topic', section: 'section_id', text: 'Question text?', type: 'choice', options: ['Yes', 'No', …] }` or `type: 'text'` with `placeholder: '…'`. The `section` must match an existing `SECTIONS[].id`.
- **New section:** Add `{ id: 'new_section_id', label: 'Display Name' }` to `SECTIONS` (order here is the display order when using section-based sort).
- After a batch of changes, consider bumping `QUESTIONNAIRE_VERSION` in `data.js` and documenting what changed (e.g. in this file under a “Version history” note).

---

**Existing sessions and new questions:** Users who started a session before you added questions still see their data; new questions appear blank. The app shows a dismissible banner when the session was created with an older questionnaire version so they know they can fill the new ones.

## 6. Checklist for Adding New Questions Later

- [ ] Use a **stable string id** (e.g. `section_topic`).
- [ ] Add to the right **section** in `QUESTIONS` (or the right section file if split).
- [ ] Set **type** and **options** (or placeholder for text).
- [ ] If you add a new **section**, add it to `SECTIONS` and ensure section order is correct (display order is by question id or by explicit section order).
- [ ] After a batch of changes, consider bumping **QUESTIONNAIRE_VERSION** and documenting what changed.
- [ ] Test: new session, add answers, save local and cloud, reopen; compare and contract still work.

---

## 7. Summary Table

| Change | When | Purpose |
|--------|------|---------|
| Questionnaire version in data + export + cloud | Now | Safe migrations and backward compat |
| Stable string ids for new questions | Now | No renumbering; old data still valid |
| Section nav or step-by-step form | Now / soon | UX with many questions |
| Split QUESTIONS by section/files | 100+ questions | Maintainability |
| Lazy / virtual rendering | When UI feels slow | Performance |
| IndexedDB for local answers | If localStorage limit hit | Storage and parse cost |
| Normalized cloud answers table | If cloud blobs get too big | Scalable cloud storage |

Implementing Phase 1 (version constant, id convention, section nav, and this doc) gives you a clear path to scale the questionnaire without breaking existing sessions.
