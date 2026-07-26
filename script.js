const TaskApiV1 = {
  endpoint: "/api/v1/tasks",
  tasks: [
    { id: 1, title: "Review release analytics", project: "Platform", priority: "high", done: false },
    { id: 2, title: "Send customer launch brief", project: "Customer success", priority: "medium", done: false },
    { id: 3, title: "Archive June sprint notes", project: "Marketing", priority: "low", done: true }
  ],
  fetchTasks() {
    return Promise.resolve(this.tasks.map((task) => ({ ...task })));
  },
  createTask(task) {
    this.tasks.unshift(task);
    return Promise.resolve({ ...task });
  },
  updateTask(id, updates) {
    const task = this.tasks.find((item) => item.id === id);
    Object.assign(task, updates);
    return Promise.resolve({ ...task });
  }
};

const state = {
  currentUser: null,
  tasks: [],
  filter: "all",
  taskCache: null,
  lastTaskRender: null
};

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
  state.taskCache = tasks.map((task) => ({ ...task }));
}

async function loadTasks() {
  if (state.taskCache) {
    state.tasks = state.taskCache.map((task) => ({ ...task }));
    renderTasks();
    return;
  }

  state.tasks = await TaskApiV1.fetchTasks();
  cacheTasks(state.tasks);
  renderTasks();
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
  const username = formData.get("username").trim();
  const password = formData.get("password").trim();

  if (!username) return showLoginError("Enter your username to continue.", elements.loginForm.username);
  if (!password) return showLoginError("Enter your password to continue.", elements.loginForm.password);

  try {
    clearLoginError();
    state.currentUser = { name: username, role: "Product manager" };
    showDashboard();
  } catch (error) {
    showLoginError("We couldn't sign you in. Please try again.", elements.loginForm.username);
  }
});

elements.loginForm.addEventListener("input", clearLoginError);

elements.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.taskForm);
  const task = await TaskApiV1.createTask({
    id: Date.now(),
    title: formData.get("task-title"),
    project: formData.get("task-project"),
    priority: formData.get("task-priority"),
    done: false
  });
  state.tasks.unshift(task);
  elements.taskForm.reset();
  renderTasks();
});

elements.taskList.addEventListener("change", async (event) => {
  if (!event.target.matches(".task-toggle")) return;
  const id = Number(event.target.dataset.taskId);
  const updatedTask = await TaskApiV1.updateTask(id, { done: event.target.checked });
  state.tasks = state.tasks.map((task) => (task.id === id ? updatedTask : task));
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
