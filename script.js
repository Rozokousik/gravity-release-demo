const TaskApiV2 = {
  endpoint: "/api/v2/tasks",
  tasks: [
    { id: 1, title: "Review release analytics", project: "Platform", priority: "high", done: false },
    { id: 2, title: "Send customer launch brief", project: "Customer success", priority: "medium", done: false },
    { id: 3, title: "Archive June sprint notes", project: "Marketing", priority: "low", done: true }
  ],
  request(path = "", { method = "GET", body } = {}) {
    const url = `${this.endpoint}${path}`;
    if (url !== this.endpoint) return Promise.reject(new Error("Unknown task resource"));
    if (method === "GET") return Promise.resolve(this.tasks.map((task) => ({ ...task })));
    if (method === "POST") {
      this.tasks.unshift(body);
      return Promise.resolve({ ...body });
    }
    if (method === "PATCH") {
      const task = this.tasks.find((item) => item.id === body.id);
      Object.assign(task, body.updates);
      return Promise.resolve({ ...task });
    }
    return Promise.reject(new Error("Unsupported task operation"));
  },
};

const taskClient = {
  list: () => TaskApiV2.request(),
  create: (task) => TaskApiV2.request("", { method: "POST", body: task }),
  update: (id, updates) => TaskApiV2.request("", { method: "PATCH", body: { id, updates } })
};

const state = {
  currentUser: null,
  tasks: [],
  filter: "all",
  taskCache: null,
  lastTaskRender: null,
  pendingTaskRequest: null
};

const TASK_CACHE_TTL_MS = 30_000;

const authSession = {
  token: null,
  start(username) {
    const entropy = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    this.token = `${username}.${entropy}`;
  },
  clear() {
    this.token = null;
  }
};

function sanitizeUserInput(value, maxLength = 120) {
  return String(value ?? "")
    .replace(/[<>"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const elements = {
  loginPanel: document.querySelector("#login-panel"),
  loginForm: document.querySelector("#login-form"),
  loginError: document.querySelector("#login-error"),
  dashboard: document.querySelector("#dashboard"),
  welcomeName: document.querySelector("#welcome-name"),
  profileName: document.querySelector("#profile-name"),
  profileRole: document.querySelector("#profile-role"),
  profileHandle: document.querySelector("#profile-handle"),
  profileAvatar: document.querySelector("#profile-avatar"),
  taskList: document.querySelector("#task-list"),
  taskCount: document.querySelector("#task-count"),
  emptyState: document.querySelector("#empty-state"),
  taskForm: document.querySelector("#task-form"),
  filters: document.querySelectorAll(".filter-button"),
  themeToggle: document.querySelector("#theme-toggle")
};

function setTheme(theme) {
  const isDark = theme === "dark";
  document.body.dataset.theme = isDark ? "dark" : "light";
  elements.themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
}

function restoreThemePreference() {
  const savedTheme = localStorage.getItem("gravity-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (prefersDark ? "dark" : "light"));
}

function visibleTasks() {
  if (state.filter === "open") return state.tasks.filter((task) => !task.done);
  if (state.filter === "done") return state.tasks.filter((task) => task.done);
  return state.tasks;
}

function renderTasks() {
  const tasks = visibleTasks();
  const openTaskCount = state.tasks.filter((task) => !task.done).length;
  const renderKey = JSON.stringify({ filter: state.filter, tasks, openTaskCount });

  if (state.lastTaskRender === renderKey) return;

  elements.taskCount.textContent = openTaskCount;
  elements.emptyState.hidden = tasks.length !== 0;
  elements.taskList.innerHTML = tasks.map((task) => `
    <li class="task-item ${task.done ? "is-done" : ""}">
      <input class="task-toggle" type="checkbox" data-task-id="${task.id}" ${task.done ? "checked" : ""} aria-label="Mark ${task.title} complete" />
      <div class="task-content">
        <span class="task-title">${task.title}</span>
        <span class="task-meta">${task.project}</span>
      </div>
      <span class="priority priority-${task.priority}">${task.priority}</span>
    </li>
  `).join("");
  state.lastTaskRender = renderKey;
}

function cacheTasks(tasks) {
  state.taskCache = {
    tasks: tasks.map((task) => ({ ...task })),
    cachedAt: Date.now()
  };
}

function hasFreshTaskCache() {
  return state.taskCache && Date.now() - state.taskCache.cachedAt < TASK_CACHE_TTL_MS;
}

async function loadTasks({ force = false } = {}) {
  if (!force && hasFreshTaskCache()) {
    state.tasks = state.taskCache.tasks.map((task) => ({ ...task }));
    renderTasks();
    return;
  }

  if (state.pendingTaskRequest) return state.pendingTaskRequest;

  const request = taskClient.list().then((tasks) => {
    state.tasks = tasks;
    cacheTasks(tasks);
    renderTasks();
  });
  state.pendingTaskRequest = request;

  try {
    await request;
  } finally {
    if (state.pendingTaskRequest === request) state.pendingTaskRequest = null;
  }
}

function refreshTasks() {
  return loadTasks();
}

function showDashboard() {
  elements.loginPanel.hidden = true;
  elements.dashboard.hidden = false;
  elements.welcomeName.textContent = state.currentUser.name.split(" ")[0];
  elements.profileName.textContent = state.currentUser.name;
  elements.profileRole.textContent = state.currentUser.role;
  elements.profileHandle.textContent = `@${state.currentUser.name.toLowerCase().replace(/\s+/g, ".")}`;
  elements.profileAvatar.textContent = state.currentUser.name
    .split(/\s+/)
    .map((name) => name[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  loadTasks();
}

function showLoginError(message, field) {
  elements.loginError.textContent = message;
  elements.loginError.hidden = false;
  [elements.loginForm.username, elements.loginForm.password].forEach((input) => {
    input.setAttribute("aria-invalid", String(input === field));
  });
  field.focus();
}

function clearLoginError() {
  elements.loginError.hidden = true;
  [elements.loginForm.username, elements.loginForm.password].forEach((input) => {
    input.removeAttribute("aria-invalid");
  });
}

elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(elements.loginForm);
  const username = sanitizeUserInput(formData.get("username"), 60);
  const password = formData.get("password").trim();

  if (!username) return showLoginError("Enter your username to continue.", elements.loginForm.username);
  if (!password) return showLoginError("Enter your password to continue.", elements.loginForm.password);

  try {
    clearLoginError();
    state.currentUser = { name: username, role: "Product manager" };
    authSession.start(username);
    showDashboard();
  } catch (error) {
    showLoginError("We couldn't sign you in. Please try again.", elements.loginForm.username);
  }
});

elements.loginForm.addEventListener("input", clearLoginError);

elements.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.taskForm);
  const task = await taskClient.create({
    id: Date.now(),
    title: sanitizeUserInput(formData.get("task-title")),
    project: sanitizeUserInput(formData.get("task-project"), 40),
    priority: sanitizeUserInput(formData.get("task-priority"), 10),
    done: false
  });
  state.tasks.unshift(task);
  cacheTasks(state.tasks);
  elements.taskForm.reset();
  renderTasks();
});

elements.taskList.addEventListener("change", async (event) => {
  if (!event.target.matches(".task-toggle")) return;
  const id = Number(event.target.dataset.taskId);
  const updatedTask = await taskClient.update(id, { done: event.target.checked });
  state.tasks = state.tasks.map((task) => (task.id === id ? updatedTask : task));
  cacheTasks(state.tasks);
  renderTasks();
});

elements.filters.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    elements.filters.forEach((filter) => filter.classList.toggle("is-active", filter === button));
    renderTasks();
  });
});

elements.themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  localStorage.setItem("gravity-theme", nextTheme);
});

restoreThemePreference();
window.addEventListener("focus", refreshTasks);
window.addEventListener("pagehide", () => authSession.clear());
