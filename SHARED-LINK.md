# Sharing the app via a link

The app is just HTML, CSS, and JavaScript — no server or database. To make it available at a **shared link** (e.g. `https://your-site.com/polycule`), you only need to put these files on a **static hosting** service. Everyone who opens the link gets the same app; data stays in *their* browser (or in files they save).

---

## How data works when shared

- **Same device, same browser:** One person can fill Partner A and Partner B, compare, and build the contract (current workflow).
- **Different people, different devices:** Each person who opens the link has their own empty form. They don’t see each other’s answers unless you combine manually:
  - **Option A:** One person fills both sides (e.g. during a call), or both sit at one device.
  - **Option B:** Each person fills their side, uses **Save session to file**, and sends the `.polycule` file to the other. One person then **Load session from file** and re-saves with both sets of answers (you’d need a simple “merge” or “load Partner B from file” flow to do that cleanly — not built yet).
- **Privacy:** Nothing is sent to any server. Saving and loading use only the visitor’s device (and any files they choose to save or open).

---

## Hosting options (easiest first)

### 1. Netlify (recommended — no account needed for a quick try)

- Go to [netlify.com](https://www.netlify.com) → **Add new site** → **Deploy manually**.
- Drag and drop the **folder** that contains `index.html`, `data.js`, `app.js`, `agreement-generator.js` (i.e. your `polycule-questionnaire-app` folder).
- Netlify gives you a URL like `https://random-name-123.netlify.app`. That’s your shared link.
- Optional: Create a free account to change the subdomain or add a custom domain.

### 2. GitHub Pages

- Create a new GitHub repository (e.g. `polycule-expectations`).
- Upload the app files (the contents of `polycule-questionnaire-app`) into the repo (e.g. in the root or in a folder like `docs/` or a branch `gh-pages` depending on how you set up Pages).
- In the repo: **Settings → Pages** → Source: Deploy from branch (or GitHub Actions). Branch: `main` (or `gh-pages`), folder: root (or the folder you used).
- Your link will be like `https://yourusername.github.io/polycule-expectations/` (or with a custom domain if you add one).

### 3. Cloudflare Pages

- Go to [pages.cloudflare.com](https://pages.cloudflare.com).
- **Create a project** → **Direct Upload** → upload the app folder as a zip (or connect Git and point to the folder).
- You get a URL like `https://your-project.pages.dev`. Use that as the shared link.

### 4. Vercel

- Go to [vercel.com](https://vercel.com) → **Add New** → **Project** (or upload).
- Import or upload the folder containing the app. Vercel will serve it and give you a link like `https://your-project.vercel.app`.

### 5. Surge (from your machine, no account for first deploy)

- Install: `npm install -g surge` (requires Node).
- In a terminal, go into the app folder and run: `surge .` (or `surge ./polycule-questionnaire-app` from the parent folder).
- Follow the prompts; you get a URL like `https://something.surge.sh`. Share that link.

### 6. Your own hosting (e.g. GoDaddy cPanel)

- If you already have web hosting (e.g. GoDaddy cPanel, or any host that serves static files):
  - Upload the contents of `polycule-questionnaire-app` into a folder (e.g. `polycule` or `agreements`).
  - Your shared link is then `https://yourdomain.com/polycule/` (or whatever path you used).
- Use **HTTPS** if possible so the app works consistently (some browsers limit features on plain HTTP).

---

## Checklist before you share

- [ ] All four files are uploaded: `index.html`, `data.js`, `app.js`, `agreement-generator.js`.
- [ ] The URL you share opens `index.html` (often the default for the root or folder).
- [ ] You’ve opened the link in an incognito/private window to confirm it loads and you can fill and save (localStorage works on that origin).

---

## Optional: custom domain

Most of the options above let you add a custom domain (e.g. `polycule.yourdomain.com` or `yourdomain.com/agreements`) in the host’s settings. You then point DNS (e.g. a CNAME or A record) as instructed by the host. That way your shared link is a URL you control and can share long-term.
