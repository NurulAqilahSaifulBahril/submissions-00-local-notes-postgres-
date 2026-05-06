import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { pool, initDb } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/folders", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, sort_order, created_at FROM folders ORDER BY sort_order ASC, created_at ASC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list folders" });
  }
});

app.post("/api/folders", async (req, res) => {
  const name = String(req.body?.name ?? "").trim().slice(0, 200);
  if (!name) {
    res.status(400).json({ error: "Name required" });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO folders (name, sort_order)
       VALUES ($1, COALESCE((SELECT MAX(sort_order) + 1 FROM folders f2), 0))
       RETURNING id, name, sort_order, created_at`,
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

app.delete("/api/folders/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const { rows: cnt } = await pool.query("SELECT COUNT(*)::int AS c FROM folders");
    if (cnt[0].c <= 1) {
      res.status(400).json({ error: "Cannot delete the last folder" });
      return;
    }
    const { rowCount } = await pool.query("DELETE FROM folders WHERE id = $1", [id]);
    if (!rowCount) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

app.get("/api/folders/:folderId/notes", async (req, res) => {
  const folderId = req.params.folderId;
  try {
    const { rows } = await pool.query(
      `SELECT id, folder_id, title, body, updated_at
       FROM notes WHERE folder_id = $1
       ORDER BY updated_at DESC`,
      [folderId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list notes" });
  }
});

app.get("/api/notes/recent", async (req, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 10, 1), 50);
  try {
    const { rows } = await pool.query(
      `SELECT n.id, n.folder_id, n.title, n.body, n.updated_at, f.name AS folder_name
       FROM notes n
       JOIN folders f ON f.id = n.folder_id
       ORDER BY n.updated_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list recent notes" });
  }
});

app.post("/api/notes", async (req, res) => {
  const folderId = req.body?.folderId;
  if (!folderId || typeof folderId !== "string") {
    res.status(400).json({ error: "folderId required" });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO notes (folder_id, title, body)
       VALUES ($1, '', '')
       RETURNING id, folder_id, title, body, updated_at`,
      [folderId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.patch("/api/notes/:id", async (req, res) => {
  const id = req.params.id;
  const title = req.body?.title;
  const body = req.body?.body;
  if (title !== undefined && typeof title !== "string") {
    res.status(400).json({ error: "Invalid title" });
    return;
  }
  if (body !== undefined && typeof body !== "string") {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  if (title === undefined && body === undefined) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  try {
    const fields = [];
    const vals = [];
    let i = 1;
    if (title !== undefined) {
      fields.push(`title = $${i++}`);
      vals.push(title.slice(0, 200));
    }
    if (body !== undefined) {
      fields.push(`body = $${i++}`);
      vals.push(body.slice(0, 500_000));
    }
    fields.push(`updated_at = now()`);
    vals.push(id);
    const { rows, rowCount } = await pool.query(
      `UPDATE notes SET ${fields.join(", ")} WHERE id = $${i} RETURNING id, folder_id, title, body, updated_at`,
      vals
    );
    if (!rowCount) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const { rowCount } = await pool.query("DELETE FROM notes WHERE id = $1", [id]);
    if (!rowCount) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

await initDb();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Notes app http://localhost:${PORT}`);
});
