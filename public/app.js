(function () {
  const api = {
    async req(path, opts = {}) {
      const r = await fetch("/api" + path, {
        headers: { "Content-Type": "application/json", ...opts.headers },
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      if (r.status === 204) return null;
      const text = await r.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
      }
      if (!r.ok) {
        const err = new Error(data?.error || r.statusText || "Request failed");
        err.status = r.status;
        err.data = data;
        throw err;
      }
      return data;
    },
    get(path) {
      return this.req(path, { method: "GET" });
    },
    post(path, body) {
      return this.req(path, { method: "POST", body });
    },
    patch(path, body) {
      return this.req(path, { method: "PATCH", body });
    },
    delete(path) {
      return this.req(path, { method: "DELETE" });
    },
  };

  function previewPlain(text) {
    const line = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
    return line || "No additional text";
  }

  /** Plain line for tiles / home (strip Markdown to text). */
  function plainFromMarkdown(md) {
    const s = String(md ?? "");
    if (!s.trim()) return "No additional text";
    try {
      if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
        return previewPlain(s);
      }
      const html = DOMPurify.sanitize(marked.parse(s, { async: false }));
      const d = document.createElement("div");
      d.innerHTML = html;
      const line = d.textContent.replace(/\s+/g, " ").trim().slice(0, 100);
      return line || "No additional text";
    } catch {
      return previewPlain(s);
    }
  }

  function renderMarkdownHtml(md) {
    if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
      const esc = String(md ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return "<p>" + esc.replace(/\n/g, "<br>") + "</p>";
    }
    return DOMPurify.sanitize(marked.parse(md || "", { async: false }));
  }

  if (typeof marked !== "undefined" && typeof marked.setOptions === "function") {
    marked.setOptions({ gfm: true, breaks: true });
  }

  /** @param {string | Date} t */
  function formatDate(t) {
    const d = typeof t === "string" ? new Date(t) : t;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }

  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      el.hidden = true;
    }, 4200);
  }

  const screenHome = document.getElementById("screenHome");
  const screenWorkspace = document.getElementById("screenWorkspace");
  const homeNewNote = document.getElementById("homeNewNote");
  const homeOpenWorkspace = document.getElementById("homeOpenWorkspace");
  const homeRecentList = document.getElementById("homeRecentList");
  const homeRecentEmpty = document.getElementById("homeRecentEmpty");
  const backHome = document.getElementById("backHome");
  const saveStatus = document.getElementById("saveStatus");
  const folderListEl = document.getElementById("folderList");
  const newFolderBtn = document.getElementById("newFolder");
  const notesPanelTitle = document.getElementById("notesPanelTitle");
  const noteTilesEl = document.getElementById("noteTiles");
  const searchEl = document.getElementById("search");
  const newNoteBtn = document.getElementById("newNote");
  const emptyStateEl = document.getElementById("emptyState");
  const editorEl = document.getElementById("editor");
  const titleEl = document.getElementById("noteTitle");
  const bodyEl = document.getElementById("noteBody");
  const metaEl = document.getElementById("noteMeta");
  const deleteBtn = document.getElementById("deleteNote");
  const tabWrite = document.getElementById("tabWrite");
  const tabPreview = document.getElementById("tabPreview");
  const notePreviewEl = document.getElementById("notePreview");

  /** @type {{ id: string, name: string, sort_order: number, created_at: string }[]} */
  let folders = [];
  /** @type {string | null} */
  let activeFolderId = null;
  /** @type {{ id: string, folder_id: string, title: string, body: string, updated_at: string }[]} */
  let notes = [];
  /** @type {string | null} */
  let activeNoteId = null;

  let saveTimer = null;
  /** @type {{ id: string, title: string, body: string } | null} */
  let pendingSave = null;

  function setSaveStatus(text, isError) {
    saveStatus.textContent = text;
    saveStatus.classList.toggle("is-error", Boolean(isError));
  }

  function showHome() {
    screenHome.hidden = false;
    screenWorkspace.hidden = true;
    loadRecentForHome();
  }

  function showWorkspace() {
    screenHome.hidden = true;
    screenWorkspace.hidden = false;
  }

  async function loadRecentForHome() {
    try {
      const recent = await api.get("/notes/recent?limit=12");
      homeRecentList.innerHTML = "";
      homeRecentEmpty.hidden = recent.length > 0;
      for (const n of recent) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "home-recent-tile";
        btn.innerHTML = `
          <span class="home-recent-tile-title">${escapeHtml(n.title.trim() || "Untitled")}</span>
          <span class="home-recent-tile-preview">${escapeHtml(plainFromMarkdown(n.body))}</span>
          <span class="home-recent-tile-meta">${escapeHtml(n.folder_name)} · ${formatDate(n.updated_at)}</span>
        `;
        btn.addEventListener("click", () => openNoteFromHome(n.folder_id, n.id));
        li.appendChild(btn);
        homeRecentList.appendChild(li);
      }
    } catch (e) {
      console.error(e);
      showToast("Could not load recent notes. Is the server running?");
    }
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function ensureFolders() {
    if (folders.length) return;
    await refreshFolders();
  }

  async function refreshFolders() {
    folders = await api.get("/folders");
    if (!folders.length) {
      throw new Error("No folders");
    }
    if (!activeFolderId || !folders.some((f) => f.id === activeFolderId)) {
      activeFolderId = folders[0].id;
    }
    renderFolders();
  }

  async function refreshNotes() {
    if (!activeFolderId) return;
    notes = await api.get("/folders/" + encodeURIComponent(activeFolderId) + "/notes");
    renderNoteTiles();
  }

  function getActiveNote() {
    return notes.find((n) => n.id === activeNoteId) ?? null;
  }

  function renderFolders() {
    folderListEl.innerHTML = "";
    for (const f of folders) {
      const li = document.createElement("li");
      li.className = "folder-item";
      const row = document.createElement("div");
      row.className = "folder-row";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "folder-btn" + (f.id === activeFolderId ? " is-active" : "");
      btn.textContent = f.name;
      btn.addEventListener("click", () => selectFolder(f.id));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-icon-danger btn-xs";
      del.title = "Delete folder";
      del.setAttribute("aria-label", "Delete folder " + f.name);
      del.textContent = "×";
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        deleteFolder(f.id);
      });
      row.appendChild(btn);
      row.appendChild(del);
      li.appendChild(row);
      folderListEl.appendChild(li);
    }
  }

  function renderNoteTiles() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const filtered = q
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
        )
      : notes;

    noteTilesEl.innerHTML = "";
    const folder = folders.find((x) => x.id === activeFolderId);
    notesPanelTitle.textContent = folder ? folder.name : "Notes";

    for (const n of filtered) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "note-tile" + (n.id === activeNoteId ? " is-active" : "");
      card.dataset.id = n.id;
      card.innerHTML = `
        <span class="note-tile-title">${escapeHtml(n.title.trim() || "Untitled")}</span>
        <span class="note-tile-preview">${escapeHtml(plainFromMarkdown(n.body))}</span>
        <span class="note-tile-meta">${formatDate(n.updated_at)}</span>
      `;
      card.addEventListener("click", () => selectNote(n.id));
      noteTilesEl.appendChild(card);
    }
  }

  function refreshPreview() {
    const md = bodyEl.value;
    if (!md.trim()) {
      notePreviewEl.innerHTML = '<p class="preview-empty">Nothing to preview yet.</p>';
      return;
    }
    notePreviewEl.innerHTML = renderMarkdownHtml(md);
  }

  /** @param {"write" | "preview"} mode */
  function setEditorMode(mode) {
    const isWrite = mode === "write";
    tabWrite.classList.toggle("is-active", isWrite);
    tabWrite.setAttribute("aria-selected", String(isWrite));
    tabPreview.classList.toggle("is-active", !isWrite);
    tabPreview.setAttribute("aria-selected", String(!isWrite));
    bodyEl.toggleAttribute("hidden", !isWrite);
    notePreviewEl.toggleAttribute("hidden", isWrite);
    if (!isWrite) refreshPreview();
  }

  function updateEditorUI() {
    const n = getActiveNote();
    if (!n) {
      emptyStateEl.hidden = false;
      editorEl.hidden = true;
      titleEl.value = "";
      bodyEl.value = "";
      metaEl.textContent = "";
      notePreviewEl.innerHTML = "";
      return;
    }
    emptyStateEl.hidden = true;
    editorEl.hidden = false;
    titleEl.value = n.title;
    bodyEl.value = n.body;
    metaEl.textContent = "Last edited " + formatDate(n.updated_at);
    refreshPreview();
  }

  async function flushSave() {
    if (!pendingSave) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    const payload = pendingSave;
    pendingSave = null;
    setSaveStatus("Saving…");
    try {
      const updated = await api.patch("/notes/" + encodeURIComponent(payload.id), {
        title: payload.title,
        body: payload.body,
      });
      const local = notes.find((x) => x.id === updated.id);
      if (local) {
        local.title = updated.title;
        local.body = updated.body;
        local.updated_at = updated.updated_at;
      }
      notes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      renderNoteTiles();
      if (activeNoteId === updated.id) {
        metaEl.textContent = "Last edited " + formatDate(updated.updated_at);
      }
      setSaveStatus("Saved");
      setTimeout(() => {
        if (saveStatus.textContent === "Saved") saveStatus.textContent = "";
      }, 1600);
    } catch (e) {
      console.error(e);
      setSaveStatus("Save failed", true);
      showToast(e.message || "Save failed");
    }
  }

  function scheduleSave() {
    const n = getActiveNote();
    if (!n) return;
    pendingSave = {
      id: n.id,
      title: titleEl.value,
      body: bodyEl.value,
    };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flushSave(), 450);
  }

  async function selectFolder(id) {
    await flushSave();
    activeFolderId = id;
    activeNoteId = null;
    setEditorMode("write");
    renderFolders();
    await refreshNotes();
    updateEditorUI();
  }

  async function selectNote(id) {
    await flushSave();
    activeNoteId = id;
    setEditorMode("write");
    renderNoteTiles();
    updateEditorUI();
    titleEl.focus();
  }

  async function openWorkspace() {
    showWorkspace();
    try {
      setSaveStatus("Loading…");
      await refreshFolders();
      await refreshNotes();
      if (!activeNoteId && notes.length) {
        activeNoteId = notes[0].id;
      }
      setEditorMode("write");
      updateEditorUI();
      renderNoteTiles();
      setSaveStatus("");
    } catch (e) {
      console.error(e);
      setSaveStatus("");
      showToast(e.message || "Could not load workspace");
    }
  }

  async function openNoteFromHome(folderId, noteId) {
    showWorkspace();
    try {
      await refreshFolders();
      activeFolderId = folderId;
      renderFolders();
      await refreshNotes();
      activeNoteId = noteId;
      setEditorMode("write");
      renderNoteTiles();
      updateEditorUI();
    } catch (e) {
      console.error(e);
      showToast(e.message || "Could not open note");
    }
  }

  async function createNoteInActiveFolder() {
    await ensureFolders();
    if (!activeFolderId) activeFolderId = folders[0].id;
    const created = await api.post("/notes", { folderId: activeFolderId });
    await refreshNotes();
    activeNoteId = created.id;
    setEditorMode("write");
    renderNoteTiles();
    updateEditorUI();
    titleEl.focus();
  }

  homeNewNote.addEventListener("click", async () => {
    try {
      await ensureFolders();
      showWorkspace();
      await refreshFolders();
      activeFolderId = folders[0].id;
      renderFolders();
      await refreshNotes();
      await createNoteInActiveFolder();
    } catch (e) {
      console.error(e);
      showToast(e.message || "Could not create note");
    }
  });

  homeOpenWorkspace.addEventListener("click", () => openWorkspace());

  backHome.addEventListener("click", async () => {
    await flushSave();
    showHome();
  });

  newFolderBtn.addEventListener("click", async () => {
    const name = window.prompt("Folder name");
    if (!name || !name.trim()) return;
    try {
      await api.post("/folders", { name: name.trim() });
      await refreshFolders();
      await refreshNotes();
    } catch (e) {
      showToast(e.message || "Could not create folder");
    }
  });

  async function deleteFolder(id) {
    const f = folders.find((x) => x.id === id);
    if (!f) return;
    if (!window.confirm(`Delete folder "${f.name}" and all notes inside?`)) return;
    try {
      await flushSave();
      setEditorMode("write");
      await api.delete("/folders/" + encodeURIComponent(id));
      await refreshFolders();
      await refreshNotes();
      if (!notes.some((n) => n.id === activeNoteId)) {
        activeNoteId = notes[0]?.id ?? null;
      }
      renderFolders();
      renderNoteTiles();
      updateEditorUI();
    } catch (e) {
      showToast(e.message || "Could not delete folder");
    }
  }

  newNoteBtn.addEventListener("click", () => createNoteInActiveFolder());

  searchEl.addEventListener("input", renderNoteTiles);

  titleEl.addEventListener("input", () => {
    const n = getActiveNote();
    if (n) {
      n.title = titleEl.value;
      renderNoteTiles();
    }
    scheduleSave();
  });

  bodyEl.addEventListener("input", () => {
    const n = getActiveNote();
    if (n) n.body = bodyEl.value;
    if (!notePreviewEl.hidden) refreshPreview();
    scheduleSave();
  });

  tabWrite.addEventListener("click", () => setEditorMode("write"));
  tabPreview.addEventListener("click", () => setEditorMode("preview"));

  deleteBtn.addEventListener("click", async () => {
    const n = getActiveNote();
    if (!n) return;
    if (!window.confirm("Delete this note?")) return;
    try {
      await flushSave();
      await api.delete("/notes/" + encodeURIComponent(n.id));
      await refreshNotes();
      activeNoteId = notes[0]?.id ?? null;
      renderNoteTiles();
      updateEditorUI();
    } catch (e) {
      showToast(e.message || "Could not delete note");
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "n" && !screenWorkspace.hidden) {
      e.preventDefault();
      createNoteInActiveFolder();
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (pendingSave || saveTimer) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  showHome();
  loadRecentForHome();
})();
