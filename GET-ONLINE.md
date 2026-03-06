# Get the Polycule App Online — Step by Step

Follow these in order. When you're done, you'll have a shareable link; you and a partner can test by one creating a shared session and the other opening the link.

---

## Part 1: Supabase (where session data is stored)

### 1.1 Create a Supabase account and project

1. Go to **[supabase.com](https://supabase.com)** and sign up or sign in (e.g. with GitHub).
2. Click **New project**.
3. Choose or create an **Organization**, then:
   - **Name**: e.g. `polycule-app`
   - **Database password**: create one and **save it somewhere safe** (you need it for DB access later; the app uses the anon key, not this).
   - **Region**: pick one close to you.
4. Click **Create new project** and wait until it says the project is ready (1–2 minutes).

### 1.2 Create the sessions table

1. In the left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open the file **`supabase-schema.sql`** from this folder and copy its entire contents.
4. Paste into the Supabase SQL Editor.
5. Click **Run** (or press Ctrl+Enter). You should see “Success. No rows returned.”

### 1.3 Get your Project URL and anon key

1. In the left sidebar, click the **gear icon** (**Project Settings**).
2. Click **API** in the left menu.
3. On the right you’ll see:
   - **Project URL** — e.g. `https://abcdefgh.supabase.co`
   - **Project API keys** — find the key labeled **anon** **public** (long string).
4. Leave this tab open or copy both values into a notepad; you’ll paste them into the app in Part 2.

---

## Part 2: Put your Supabase keys in the app

1. On your computer, open the **`config.js`** file inside **`polycule-questionnaire-app`** (in your Documents folder, or wherever the app lives).
2. Replace the empty strings with your values:

   ```js
   window.POLYCULE_SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
   window.POLYCULE_SUPABASE_ANON_KEY = 'eyJhbGc...your-long-anon-key...';
   ```

   - Paste your **Project URL** (no trailing slash).
   - Paste the **anon public** key (the whole string).
3. Save the file.

---

## Part 3: Put the app on GitHub and turn on Pages

### 3.1 Create a new repository on GitHub

1. Go to **[github.com](https://github.com)** and sign in.
2. Click the **+** (top right) → **New repository**.
3. **Repository name**: e.g. `polycule-expectations` (no spaces).
4. Leave **Public** selected.
5. **Do not** check “Add a README” (you already have files).
6. Click **Create repository**.

### 3.2 Push the app folder to the repo

1. Open **PowerShell** or **Command Prompt**.
2. Go into the app folder. For example (adjust if your path is different):

   ```bash
   cd "C:\Users\dalli\OneDrive\Documents\polycule-questionnaire-app"
   ```

3. Run these commands one at a time (replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and the repo name you chose):

   ```bash
   git init
   git add .
   git commit -m "Polycule app with Supabase config"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

   If Git asks for credentials, use your GitHub username and a **Personal Access Token** (not your GitHub password). To create one: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic); give it `repo` scope.

### 3.3 Turn on GitHub Pages

1. On GitHub, open **your repository**.
2. Click **Settings**.
3. In the left sidebar, click **Pages** (under “Code and automation” or “Build and deployment”).
4. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
5. Under **Branch**:
   - Branch: **main**
   - Folder: **/ (root)**
6. Click **Save**.
7. Wait 1–2 minutes. The page will show something like: “Your site is live at **https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/**”.

That URL is your **app link**. Example: `https://jane.github.io/polycule-expectations/`.

---

## Part 4: Test by sharing the link with a partner

### Test 1: You (Partner A) create a shared session

1. Open your live app URL (e.g. `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`).
2. Make sure **Partner A** is selected. Enter a name if you like.
3. Fill out at least a few questions (you don’t have to do all 60 for the test).
4. Click **Save this partner’s answers**.
5. Click **Create shared link (save to cloud)**.
6. You should see a link like `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/?s=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` and a **Copy link** button.
7. Copy the link and send it to your partner (e.g. by message or email).

### Test 2: Partner opens the link and fills as Partner B

1. Your partner opens the link you sent (in their browser, on their device).
2. They should see a banner: **“Partner A shared this. You’re filling as Partner B.”** and the form already set to Partner B.
3. They fill out their side (at least a few questions), then click **Save this partner’s answers**.
4. They click **Save my answers to session** in the banner.
5. They should see a message that their answers were saved.

### Test 3: Either of you loads the full session

1. You or your partner opens the **same link** again.
2. The banner should now say **“Both partners have completed this session.”** with a button **Load into app**.
3. Click **Load into app**. The page reloads with both partners’ data.
4. Click **Compare answers** to see both sides side by side.
5. Click **Relationship contract** to try recommendations and the agreement draft.

---

## If something doesn’t work

- **“Create shared link” does nothing or shows an error**  
  - Check that you clicked **Save this partner’s answers** first.  
  - In the browser (F12 → Console), see if there’s a red error mentioning Supabase or config.  
  - Confirm `config.js` has the correct **Project URL** and **anon** key (no extra spaces, in quotes).

- **Partner opens the link but sees “This shared link is invalid or expired”**  
  - The session id might be wrong. Create a new shared link and send that one.  
  - In Supabase → **Table Editor** → **sessions**, check that a row was created when you clicked “Create shared link.”

- **Partner doesn’t see the banner**  
  - They must open the **full** link you sent (including the `?s=...` part).  
  - Try in an incognito/private window in case of caching.

- **Git push is rejected or asks for login**  
  - Use a **Personal Access Token** instead of your GitHub password when Git asks for a password.  
  - Make sure the repo name and username in `git remote add origin ...` are correct.

---

## Quick reference

| What              | Where / How |
|-------------------|-------------|
| App link          | `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/` |
| Shared session    | Same URL + `?s=` + session id (copy from “Create shared link”) |
| Supabase dashboard| supabase.com → your project |
| Edit app later    | Change files in `polycule-questionnaire-app`, then `git add .` → `git commit -m "..."` → `git push` |
