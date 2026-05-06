# Notes (learning log)

This file is my short record of how I used AI to speed up learning while still doing the verification myself.

## What I asked the AI
 
- **Project planning**: I asked for a simple end-to-end plan to build a local notes app that uses **Docker Desktop + PostgreSQL**, and whether it was realistic to finish by Wednesday.
- **Docker sanity checks**: I asked how to confirm **Docker Desktop / Docker Engine** is actually running, and to help capture evidence (for example `docker info` / `docker ps` style output saved as `docker-info.txt`).
- **Database verification**: I asked how to confirm **Postgres is up** (healthy container, port listening, and that the app can query it).
- **Feature understanding**: I asked the AI to explain the main screens and flows:
  - Home: **New note**, open recent notes, see recents
  - Workspace: folders (left), note list/tiles (middle), editor + markdown preview (right)
  - **Autosave** behavior (debounced saves to the API → Postgres)
  - **Create/delete folders** and **delete notes**
  - Dark theme styling
- **UI change request**: I asked for help implementing a simpler home flow:
  - Remove **Open workspace**
  - Keep **New note** + **Recent notes**
  - Add a **tag filter** on Home (based on hashtags like `#todo` in title/body)
  - Change primary button styling to **emerald green**
  - Keep behavior where clicking a recent note **opens the editor workspace automatically**
- **Git/GitHub workflow**: I asked how pushing works (that Git uploads files via commits, not manual copy/paste), and for help pushing to my repo.

## What confused me (and what I had to re-check)

- **Why `http://localhost:3000` sometimes refused to connect**: I learned this usually means the **server process/container wasn’t running**, not a Chrome problem.
- **Why the UI looked “old” after I changed files**: When running via Docker, the running container can still serve an **older copied `public/`** until I **rebuild/restart** the server image/container.
- **GitHub “only shows some files changed”**: I learned the repo home page highlights the latest commit; older commits can contain the bigger code changes, so I need to check **commit history** or open the file directly.
- **Tag filter vs “where do tags live”**: The filter matches **hashtags typed inside note text** (title/body), not a separate tags database field (at least in the current version).

## What I decided (my choices + how I verified)

- **Run Postgres in Docker Desktop** using the project’s `compose.yaml`, because that matches the assignment expectation (local Docker Postgres, persistent data).
- **Treat the app as three layers I can name in a demo**:
  - Browser UI: `public/index.html`, `public/app.js`, `public/styles.css`
  - API server: `server/index.js` (+ `server/db.js`)
  - Database: Postgres tables created/used by the server (folders + notes)
- **Verify with real checks**, not assumptions:
  - Containers running (`docker compose ps` / `docker ps`)
  - API health (`/api/health`)
  - Persistence: create a note → refresh → note still there
- **Keep secrets out of Git**:
  - Use `server/.env` locally
  - Commit `server/.env.example` as the safe template
- **Use hashtags for the Home tag filter** (example: `#todo`, `#important`) because it’s the simplest approach without changing the database schema.

## Appendix — raw prompt list (optional traceability)

This is the same content as above, but kept closer to my original wording so a reviewer can see what I actually typed.

1. I’m building a localhost app — summarize a simple plan and can I execute by Wednesday?
2. Show me if Docker Desktop is running and help generate `docker-info.txt`.
3. Verify Postgres is up.
4. Notes app requirements: home + recent + autosave + 3-panel workspace + folder/note delete + dark theme + Docker Desktop localhost.
5. New UI changes: remove Open workspace; home shows New note + recents + tag filter; emerald primary button; recent click opens editor.
6. Push to GitHub under my account.
