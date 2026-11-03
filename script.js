(() => {
  "use strict";

  const STORAGE_KEY = "todo-app.tasks.v1";
  const THEME_KEY = "todo-app.theme";

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const form = $("add-form");
  const input = $("new-task");
  const prioritySelect = $("new-priority");
  const list = $("task-list");
  const emptyState = $("empty-state");
  const emptyTitle = $("empty-title");
  const emptyText = $("empty-text");
  const clearBtn = $("clear-completed");
  const footerCount = $("footer-count");
  const progressLabel = $("progress-label");
  const progressPercent = $("progress-percent");
  const progressFill = $("progress-fill");
  const progressBar = $("progress-bar");
  const themeToggle = $("theme-toggle");
  const filterButtons = document.querySelectorAll(".seg-btn");

  // ---------- State ----------
  let tasks = load();
  let filter = "all";
  let editingId = null;
  let newestId = null;

  // ---------- Storage ----------
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* storage unavailable: app still works for this session */
    }
  }

  // ---------- Helpers ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const PRIORITY_LABEL = { high: "High priority", medium: "Medium priority", low: "Low priority" };

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9"/></svg>',
    edit: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/></svg>',
    trash: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  };

  // ---------- Actions ----------
  function addTask(text, priority) {
    const task = { id: uid(), text, priority, done: false, createdAt: Date.now() };
    tasks.unshift(task);
    newestId = task.id;
    save();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    save();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    save();
    render();
  }

  function updateTask(id, text) {
    const task = tasks.find((t) => t.id === id);
    const trimmed = text.trim();
    if (task && trimmed) task.text = trimmed;
    editingId = null;
    save();
    render();
  }

  function clearCompleted() {
    tasks = tasks.filter((t) => !t.done);
    save();
    render();
  }

  // ---------- Rendering ----------
  function visibleTasks() {
    if (filter === "active") return tasks.filter((t) => !t.done);
    if (filter === "completed") return tasks.filter((t) => t.done);
    return tasks;
  }

  function createTaskElement(task) {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " is-done" : "") + (task.id === newestId ? " is-new" : "");
    li.dataset.id = task.id;
    li.dataset.priority = task.priority;

    // Checkbox
    const check = document.createElement("label");
    check.className = "check";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = task.done;
    box.setAttribute("aria-label", `Mark "${task.text}" as ${task.done ? "not done" : "done"}`);
    check.appendChild(box);
    check.insertAdjacentHTML("beforeend", ICONS.check);

    // Body
    const body = document.createElement("div");
    body.className = "task-body";

    if (task.id === editingId) {
      const edit = document.createElement("input");
      edit.type = "text";
      edit.className = "edit-input";
      edit.value = task.text;
      edit.maxLength = 200;
      edit.setAttribute("aria-label", "Edit task");
      edit.dataset.edit = "true";
      body.appendChild(edit);
    } else {
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      const meta = document.createElement("span");
      meta.className = "task-meta";
      meta.textContent = `${PRIORITY_LABEL[task.priority] || ""} · Added ${formatDate(task.createdAt)}`;
      body.append(text, meta);
    }

    // Actions
    const actions = document.createElement("div");
    actions.className = "task-actions";
    if (task.id !== editingId) {
      actions.innerHTML =
        `<button class="mini-btn" type="button" data-action="edit" aria-label="Edit task">${ICONS.edit}</button>` +
        `<button class="mini-btn delete" type="button" data-action="delete" aria-label="Delete task">${ICONS.trash}</button>`;
    }

    li.append(check, body, actions);
    return li;
  }

  function render() {
    // List
    const items = visibleTasks();
    list.replaceChildren(...items.map(createTaskElement));
    newestId = null;

    // Focus the edit field if editing
    const editField = list.querySelector("[data-edit]");
    if (editField) {
      editField.focus();
      editField.setSelectionRange(editField.value.length, editField.value.length);
    }

    // Counts
    const total = tasks.length;
    const completed = tasks.filter((t) => t.done).length;
    const active = total - completed;
    $("count-all").textContent = total;
    $("count-active").textContent = active;
    $("count-completed").textContent = completed;

    // Footer
    footerCount.textContent = active === 1 ? "1 task left" : `${active} tasks left`;
    clearBtn.disabled = completed === 0;

    // Progress
    const percent = total ? Math.round((completed / total) * 100) : 0;
    progressFill.style.width = percent + "%";
    progressPercent.textContent = percent + "%";
    progressBar.setAttribute("aria-valuenow", percent);
    progressLabel.textContent = total
      ? `${completed} of ${total} completed`
      : "No tasks yet";

    // Empty state
    const isEmpty = items.length === 0;
    emptyState.hidden = !isEmpty;
    if (isEmpty) {
      if (total === 0) {
        emptyTitle.textContent = "Nothing here yet";
        emptyText.textContent = "Add your first task above to get started.";
      } else if (filter === "active") {
        emptyTitle.textContent = "All caught up";
        emptyText.textContent = "You have no active tasks.";
      } else {
        emptyTitle.textContent = "No completed tasks";
        emptyText.textContent = "Tasks you finish will show up here.";
      }
    }
  }

  // ---------- Events ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addTask(text, prioritySelect.value);
    input.value = "";
    input.focus();
  });

  list.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
      toggleTask(e.target.closest(".task").dataset.id);
    }
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.closest(".task").dataset.id;
    if (btn.dataset.action === "delete") deleteTask(id);
    if (btn.dataset.action === "edit") {
      editingId = id;
      render();
    }
  });

  list.addEventListener("dblclick", (e) => {
    const text = e.target.closest(".task-text");
    if (!text) return;
    editingId = text.closest(".task").dataset.id;
    render();
  });

  list.addEventListener("keydown", (e) => {
    if (!e.target.matches("[data-edit]")) return;
    const id = e.target.closest(".task").dataset.id;
    if (e.key === "Enter") updateTask(id, e.target.value);
    if (e.key === "Escape") {
      editingId = null;
      render();
    }
  });

  list.addEventListener("focusout", (e) => {
    if (e.target.matches("[data-edit]") && editingId) {
      updateTask(e.target.closest(".task").dataset.id, e.target.value);
    }
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      filterButtons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      render();
    });
  });

  clearBtn.addEventListener("click", clearCompleted);

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  }

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  });

  // ---------- Init ----------
  $("today").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  initTheme();
  render();
})();
