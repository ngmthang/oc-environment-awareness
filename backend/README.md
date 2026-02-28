# 🚀 Deployment Guide — Free Stack
# Frontend: Netlify | Backend: Render | Database: Neon (PostgreSQL)

---

## 📁 Project Structure

Your project should look like this:

```
your-project/
├── backend/
│   ├── server.js        ← Node.js backend (converted from Spring)
│   ├── package.json
│   ├── .env.example
│   └── public/          ← PUT YOUR HTML/CSS/JS FILES HERE
│       ├── login.html
│       ├── main.html
│       └── ... (css/, js/, images/)
└── README.md
```

> ✅ Because the backend serves your static files from the `public/` folder,
> you only need to deploy ONE thing (the backend on Render).
> No need for a separate Netlify deployment!

---

## STEP 1 — Get a Free PostgreSQL Database (Neon)

1. Go to **https://neon.tech** and sign up for free
2. Create a new project (e.g. "ocenv")
3. On the dashboard, click **"Connection string"** and copy the URL
   - It looks like: `postgresql://alex:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Save this — you'll need it in Step 3

---

## STEP 2 — Push Your Code to GitHub

1. Create a free account at **https://github.com**
2. Create a new repository (e.g. "ocenv")
3. Push your code:

```bash
cd your-project/backend
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ocenv.git
git push -u origin main
```

---

## STEP 3 — Deploy Backend on Render (Free)

1. Go to **https://render.com** and sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Fill in the settings:
   - **Name:** ocenv-backend
   - **Root Directory:** `backend` (if your repo has a backend folder)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Scroll down to **"Environment Variables"** and add:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (paste your Neon connection string) |
   | `SESSION_SECRET` | (any long random string, e.g. `mysupers3cr3tkey123abc`) |
   | `NODE_ENV` | `production` |

6. Click **"Create Web Service"**
7. Wait ~2 minutes for it to deploy
8. Your site will be live at: `https://ocenv-backend.onrender.com`

---

## STEP 4 — Done! Test Your Site

Visit your Render URL and test:
- `https://your-app.onrender.com/` → should redirect to login.html
- `https://your-app.onrender.com/login.html` → your login page
- Register a visitor → should redirect to main.html

---

## ⚠️ Important Notes

- **Free Render instances spin down after 15 min of inactivity** — first request after idle takes ~30 seconds to wake up. This is normal on the free tier.
- **Neon free tier** gives you 0.5 GB storage and 1 project — more than enough.
- **Sessions** are stored in PostgreSQL (the `session` table is auto-created), so they survive server restarts.

---

## 🔧 Updating Your Frontend API Calls

If your frontend JS currently calls Spring endpoints like `/visitor/register` or `/api/dashboard`,
**the URLs are exactly the same** in the new Node.js backend — no changes needed! ✅

If you were using Spring's session cookie (`JSESSIONID`), the new backend uses `connect.sid` instead.
Make sure your frontend fetch calls include `credentials: 'include'`:

```javascript
// Example: registering a visitor
const res = await fetch('/visitor/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',   // ← important for sessions!
  body: JSON.stringify({ name, occStudentId })
});
```

---

## 📋 All API Endpoints (unchanged from Spring)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Redirect to login or main |
| POST | `/visitor/register` | Register visitor, create session |
| GET | `/api/dashboard` | Get dashboard stats |
| POST | `/api/quiz/submit` | Submit quiz score (requires session) |
| POST | `/logout` | Destroy session |
