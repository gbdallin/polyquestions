# Polycule Expectations — Local App

Runs **only on this machine**. No server, no upload. Data is stored in your browser’s localStorage.

## How to use

1. **Open the app**  
   Double-click `index.html` or open it in your browser (File → Open File → choose `index.html`).

2. **Questionnaire**  
   - Choose **Partner A**, enter an optional name, fill out all questions, click **Save this partner’s answers**.
   - Switch to **Partner B**, enter an optional name, fill out the same questions, click **Save** again.

3. **Compare answers**  
   Click **Compare answers** to see both partners’ responses side by side.

4. **Relationship contract**  
   Click **Relationship contract**. For each section (Money, Sex, etc.):
   - **We expect to fulfill these together** — you’ll meet these needs with each other.
   - **We acknowledge these needs; some may be met in other relationships** — okay if another partner meets some of this.
   - **Needs more discussion** — to be decided later.  
   Add optional notes per section.

5. **Save & load (revisit later)**  
   - **Save session to file** — downloads one `.polycule` file with both partners’ answers, contract choices, and the generated agreement. Use a dedicated folder (e.g. “Polycule agreements”) and name files by pair and date (e.g. `polycule-Alex-Jordan-2025-03-06.polycule`) so you don’t mix sessions.
   - **Load session from file** — pick a `.polycule` (or `.json`) file to restore that session. You’ll be asked to confirm if you have unsaved data, so you won’t overwrite by accident.

6. **Export for sharing / printing**  
   - **Copy contract to clipboard** — paste into a doc to edit or share.
   - **Export agreement as file (.txt)** — downloads the written agreement as a `.txt` file (e.g. `agreement-Alex-Jordan-2025-03-06.txt`) so you can share or print it outside the app.
   - **Print contract** — opens a print-friendly version in a new window.

## File structure (avoid mixing agreements)

- **One file = one pair/session.** Each `.polycule` file is a complete snapshot (names, answers, contract, agreement text).
- Create a folder (e.g. `Polycule agreements`) and save sessions there with clear names: `polycule-PartnerA-PartnerB-2025-03-06.polycule`.
- When you **Load session from file**, only that file’s data is loaded; the app does not merge with other files. Choose the correct file to avoid loading the wrong pair.

## Sharing via a link

To give others a URL to open the app (e.g. partners or friends), put the app on any static host (Netlify, GitHub Pages, etc.). See **SHARED-LINK.md** for step-by-step options and how data works when multiple people use the link.

## Optional: store sessions in the cloud (no manual file sharing)

If the couple fills out the questionnaire on **separate devices** (each opens the shared app link), you can avoid sending `.polycule` files back and forth:

1. **Set up Supabase (free)**  
   - Create a project at [supabase.com](https://supabase.com).  
   - In the SQL Editor, run the statements in **`supabase-schema.sql`** to create the `sessions` table.  
   - In Project Settings → API, copy the **Project URL** and **anon public** key.

2. **Enable the app’s cloud feature**  
   - Edit `config.js` and set `POLYCULE_SUPABASE_URL` and `POLYCULE_SUPABASE_ANON_KEY` to your project URL and anon key.  
   - (Optional) Add `config.js` to `.gitignore` if you don’t want to commit keys; for static hosting you’ll need to add the keys in your deploy config or keep a committed `config.js` with the anon key, which is designed to be public.)

3. **Flow**  
   - **Partner A:** Fills the questionnaire as Partner A, clicks **Save this partner’s answers**, then **Create shared link (save to cloud)**. The app uploads Partner A’s data and shows a link (e.g. `https://yoursite.com/?s=abc-123`). Partner A sends that link to Partner B.  
   - **Partner B:** Opens the link. The app loads Partner A’s answers and shows the form as Partner B. Partner B fills their side, clicks **Save this partner’s answers**, then **Save my answers to session**. Their answers are saved to the same session in the cloud.  
   - **Either partner:** Opens the same link again. The app shows **Load into app**. Click it to load the full session (both partners’ answers) into the app so you can use Compare and build the Relationship contract.

Sessions are identified by the `?s=...` id in the URL; only people with that link can access that session. Data is stored in your Supabase project, not in the app repo.

## Data

- Stored in **localStorage** while you use the app; **Save session to file** writes a copy to disk so you can revisit or move it.
- If you use the **optional cloud** (Supabase), session data is also stored there when you create a shared link or save Partner B’s answers; only the session id is in the URL.
- If you open `index.html` as a file and answers don’t persist, some browsers restrict localStorage for `file://`. Run a local server in this folder instead (e.g. `npx serve .` or `python -m http.server 8000`) and open `http://localhost:8000`.

## Files

- `index.html` — single page (form, compare, contract, file bar, optional cloud bar and shared-session banner).
- `data.js` — the questions and sections.
- `app.js` — form logic, compare view, contract builder, save/load/export.
- `agreement-generator.js` — recommendations and agreement prose.
- `cloud.js` — optional Supabase integration (shared links); only active if `config.js` is set.
- `config.example.js` — copy to `config.js` and add your Supabase URL and anon key to enable cloud.
- `supabase-schema.sql` — run in Supabase SQL Editor to create the `sessions` table.
