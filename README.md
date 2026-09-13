# Money Custody Tracker — Phase 1

This repository contains a simple money custody tracker MVP Phase 1 scaffold.

Backend: Express + MongoDB (Mongoose)
Frontend: static HTML/CSS/JS

Run locally:

1. Install backend dependencies

```bash
cd "backend"
npm install
```

2. Create `.env` using `.env.example` and set `MONGODB_URI`.

3. Start server

```bash
npm run dev
```

4. Serve frontend (static files are in `frontend/`). For local development, you can open `frontend/index.html` in a browser. When running the backend on the same host, the frontend will fetch `/api/people`.
