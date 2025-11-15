const API_BASE = "";
let token = localStorage.getItem("kanban_token");
let currentUser = null;

const appSection = document.getElementById("app-section");
const userInfo = document.getElementById("user-info");
const currentUsernameEl = document.getElementById("current-username");
const projectsContainer = document.getElementById("projects-container");
const notificationsList = document.getElementById("notifications-list");
const notificationCountEl = document.getElementById("notification-count");
const logoutBtn = document.getElementById("logout-btn");
const projectForm = document.getElementById("project-form");

async function apiRequest(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) {
      logoutUser();
      throw new Error("Session expired. Please log in again.");
    }
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function showApp() {
  appSection?.classList.remove("hidden");
  userInfo?.classList.remove("hidden");
}

function redirectToLogin() {
  window.location.href = "/login";
}

function logoutUser() {
  token = null;
  currentUser = null;
  localStorage.removeItem("kanban_token");
  if (currentUsernameEl) currentUsernameEl.textContent = "";
  if (projectsContainer) projectsContainer.innerHTML = "";
  if (notificationsList) notificationsList.innerHTML = "";
  if (notificationCountEl) {
    notificationCountEl.textContent = "0";
    notificationCountEl.classList.add("hidden");
  }
  appSection?.classList.add("hidden");
  userInfo?.classList.add("hidden");
  redirectToLogin();
}

async function loadCurrentUser() {
  const user = await apiRequest("/users/me");
  currentUser = user;
  currentUsernameEl.textContent = user.username;
}

async function loadProjects() {
  const projects = await apiRequest("/projects");
  projectsContainer.innerHTML = "";
  projects.forEach((project) => {
    const projectEl = renderProject(project);
    projectsContainer.appendChild(projectEl);
    loadTasks(project.id, projectEl.querySelector(".tasks"));
  });
}

async function loadTasks(projectId, container) {
  container.innerHTML = "Loading...";
  const tasks = await apiRequest(`/projects/${projectId}/tasks`);
  container.innerHTML = "";
  tasks.forEach((task) => {
    container.appendChild(renderTask(task, projectId));
  });
  container.appendChild(renderTaskForm(projectId));
}

async function loadNotifications() {
  if (!notificationsList) return;
  const notifications = await apiRequest("/notifications");
  notificationsList.innerHTML = "";
  if (notificationCountEl) {
    notificationCountEl.textContent = notifications.length;
    if (notifications.length === 0) {
      notificationCountEl.classList.add("hidden");
    } else {
      notificationCountEl.classList.remove("hidden");
    }
  }
  if (!notifications.length) {
    const empty = document.createElement("li");
    empty.textContent = "No notifications";
    notificationsList.appendChild(empty);
    return;
  }
  notifications.forEach((notification) => {
    const li = document.createElement("li");
    li.className = `notification ${notification.read ? "read" : ""}`;
    li.textContent = `${new Date(notification.created_at).toLocaleString()}: ${notification.message}`;
    li.addEventListener("click", async () => {
      if (!notification.read) {
        const updated = await apiRequest(`/notifications/${notification.id}/read`, {
          method: "POST",
        });
        notification.read = updated.read;
        li.classList.add("read");
      }
    });
    notificationsList.appendChild(li);
  });
}

function renderProject(project) {
  const projectEl = document.createElement("div");
  projectEl.className = "project";

  const header = document.createElement("div");
  header.className = "project-header";
  const title = document.createElement("h3");
  title.textContent = project.name;
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    if (confirm("Delete this project?")) {
      await apiRequest(`/projects/${project.id}`, { method: "DELETE" });
      await loadProjects();
    }
  });
  header.appendChild(title);
  header.appendChild(deleteBtn);

  const description = document.createElement("p");
  description.textContent = project.description || "No description";

  const tasksContainer = document.createElement("div");
  tasksContainer.className = "tasks";

  projectEl.appendChild(header);
  projectEl.appendChild(description);
  projectEl.appendChild(tasksContainer);

  return projectEl;
}

function renderTask(task, projectId) {
  const template = document.getElementById("task-template");
  const fragment = template.content.cloneNode(true);
  const wrapper = fragment.querySelector(".task");

  const titleEl = fragment.querySelector(".task-title");
  const descriptionEl = fragment.querySelector(".task-description");
  const statusSelect = fragment.querySelector(".task-status");
  const deleteBtn = fragment.querySelector(".delete-task");
  const commentList = fragment.querySelector(".comment-list");
  const commentForm = fragment.querySelector(".comment-form");
  const commentContent = fragment.querySelector(".comment-content");

  titleEl.textContent = task.title;
  descriptionEl.textContent = task.description || "No description";
  statusSelect.value = task.status;

  statusSelect.addEventListener("change", async () => {
    await apiRequest(`/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: statusSelect.value }),
    });
  });

  deleteBtn.addEventListener("click", async () => {
    if (confirm("Delete this task?")) {
      await apiRequest(`/tasks/${task.id}`, { method: "DELETE" });
      await loadTasks(projectId, wrapper.parentElement);
    }
  });

  loadComments(task.id, commentList);

  commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await apiRequest("/comments", {
      method: "POST",
      body: JSON.stringify({
        task_id: task.id,
        content: commentContent.value,
      }),
    });
    commentContent.value = "";
    await loadComments(task.id, commentList);
    await loadNotifications();
  });

  return fragment;
}

function renderTaskForm(projectId) {
  const form = document.createElement("form");
  form.className = "card";
  form.innerHTML = `
    <h4>Create Task</h4>
    <input type="text" name="title" placeholder="Task title" required />
    <textarea name="description" placeholder="Description"></textarea>
    <select name="status">
      <option value="todo">To Do</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
    </select>
    <button type="submit">Add Task</button>
  `;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    await apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        title: formData.get("title"),
        description: formData.get("description"),
        status: formData.get("status"),
      }),
    });
    form.reset();
    await loadProjects();
  });
  return form;
}

async function loadComments(taskId, container) {
  container.innerHTML = "Loading comments...";
  const comments = await apiRequest(`/tasks/${taskId}/comments`);
  container.innerHTML = "";
  comments.forEach((comment) => {
    container.appendChild(renderComment(comment, taskId));
  });
}

function renderComment(comment, taskId) {
  const commentEl = document.createElement("div");
  commentEl.className = `comment ${comment.solved ? "solved" : ""}`;
  commentEl.innerHTML = `
    <div class="meta">${comment.author.username} • ${new Date(comment.created_at).toLocaleString()}</div>
    <div class="content">${escapeHtml(comment.content)}</div>
  `;

  if (!comment.solved) {
    const actions = document.createElement("div");
    actions.className = "comment-actions";
    const solveBtn = document.createElement("button");
    solveBtn.type = "button";
    solveBtn.textContent = "Mark solved";
    solveBtn.addEventListener("click", async () => {
      await apiRequest(`/comments/${comment.id}/solve`, { method: "POST" });
      await loadComments(taskId, commentEl.parentElement);
      await loadNotifications();
    });
    actions.appendChild(solveBtn);
    commentEl.appendChild(actions);
  }

  const repliesContainer = document.createElement("div");
  repliesContainer.className = "comment-replies";
  comment.replies.forEach((reply) => {
    repliesContainer.appendChild(renderComment(reply, taskId));
  });

  const replyForm = document.createElement("form");
  replyForm.className = "comment-form";
  replyForm.innerHTML = `
    <textarea class="comment-content" placeholder="Reply" required></textarea>
    <button type="submit">Reply</button>
  `;
  replyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const textarea = replyForm.querySelector(".comment-content");
    await apiRequest("/comments", {
      method: "POST",
      body: JSON.stringify({
        task_id: taskId,
        content: textarea.value,
        parent_id: comment.id,
      }),
    });
    textarea.value = "";
    await loadComments(taskId, commentEl.parentElement);
    await loadNotifications();
  });

  commentEl.appendChild(repliesContainer);
  commentEl.appendChild(replyForm);

  return commentEl;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

async function createProject(event) {
  event.preventDefault();
  const name = document.getElementById("project-name").value.trim();
  const description = document.getElementById("project-description").value.trim();
  await apiRequest("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
  event.target.reset();
  await loadProjects();
}

async function initializeApp() {
  await loadCurrentUser();
  await loadProjects();
  await loadNotifications();
}

if (!token) {
  redirectToLogin();
} else {
  initializeApp()
    .then(() => {
      showApp();
    })
    .catch(() => {
      logoutUser();
    });
}

logoutBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  logoutUser();
});

projectForm?.addEventListener("submit", createProject);
