# oc-environment-awareness

This repository currently contains only this README file. If you intended to upload your project, ensure all source files are committed and pushed to this branch first.

## Quick check before asking for migration help

Run these locally and push any missing files:

```bash
git status
git add .
git commit -m "Add project files"
git push origin <your-branch>
```

After pushing, your repo should include items like:

- `package.json` for Node backend (or `pom.xml`/`build.gradle` if still Spring)
- backend source files (for example `src/` or `backend/src/`)
- frontend files (for example `index.html`, `assets/`, `css/`, `js/`)
- SQL schema/migration files

## Fastest deployment target (Option B)

If you're moving to Node.js and want free/easy deployment:

- **Frontend:** Cloudflare Pages
- **Backend:** Render (Node.js web service)
- **Database:** Supabase Postgres

## Node backend baseline (what we can generate after files are present)

```txt
backend/
  src/
    server.js
    app.js
    routes/
    controllers/
    services/
    db/
  package.json
  .env.example
```

Typical environment variables:

```env
PORT=10000
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://your-frontend.pages.dev
NODE_ENV=production
```

## Render config (example)

- Build Command: `npm install`
- Start Command: `npm run start`
- Root Directory: `backend` (if backend is in subfolder)

## Cloudflare Pages config (example)

- Framework preset: none (for plain HTML/CSS/JS)
- Build command: *(empty)*
- Build output directory: `/`

Then point frontend API calls to:

```txt
https://<your-render-service>.onrender.com
```

## How to test

Use this order so you can quickly isolate issues.

### 1) Test backend locally

From your backend folder:

```bash
npm install
npm run dev
```

If your project does not have `dev`, use:

```bash
npm start
```

Health check example (adjust route):

```bash
curl http://localhost:10000/health
```

Expected result: status `200` and simple JSON/text response.

### 2) Test database connection locally

With backend running, call one API endpoint that reads/writes DB:

```bash
curl http://localhost:10000/api/<your-endpoint>
```

If it fails, verify `DATABASE_URL` in `.env`.

### 3) Test frontend locally

If it is plain HTML/CSS/JS, open `index.html` directly or run a static server:

```bash
python3 -m http.server 5500
```

Open `http://localhost:5500` and confirm API calls target your local backend URL.

### 4) Test after deployment

- Open Render URL: `https://<your-render-service>.onrender.com/health`
- Open Cloudflare Pages URL and test core flows (login, create/read/update/delete if available)
- Confirm browser network tab shows successful API requests (2xx status)

### 5) Quick smoke checklist

- [ ] Backend starts with no crash
- [ ] Health endpoint returns 200
- [ ] One DB read works
- [ ] One DB write works
- [ ] Frontend loads without console errors
- [ ] Frontend can call deployed backend URL

---

Once the full source files are in this repo, migration can be done route-by-route from Spring controllers/services/entities into Express + Postgres equivalents.
