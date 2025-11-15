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
const visibilitySelect = document.getElementById("project-visibility");
const shareUsersWrapper = document.getElementById("share-users-wrapper");
const shareUserOptions = document.getElementById("share-user-options");

let availableUsers = [];

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
  if (appSection) {
    appSection.classList.remove("hidden");
  }
  if (userInfo) {
    userInfo.classList.remove("hidden");
  }
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
  if (appSection) {
    appSection.classList.add("hidden");
  }
  if (userInfo) {
    userInfo.classList.add("hidden");
  }
  redirectToLogin();
}

function formatVisibility(value) {
  switch (value) {
    case "all":
      return "All users";
    case "private":
      return "Private";
    case "selected":
      return "Selected users";
    default:
      return value;
  }
}

function renderShareUserOptions(container, selectedUsernames = [], prefix = "share") {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  const selectedSet = new Set(selectedUsernames);
  const collaborators = availableUsers.filter((user) => !currentUser || user.id !== currentUser.id);

  if (!collaborators.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-note";
    emptyMessage.textContent = "No other users available yet.";
    container.appendChild(emptyMessage);
    return;
  }

  collaborators.forEach((user) => {
    const optionId = `${prefix}-user-${user.id}`;
    const label = document.createElement("label");
    label.className = "share-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = user.username;
    input.id = optionId;
    if (selectedSet.has(user.username)) {
      input.checked = true;
    }

    const nameSpan = document.createElement("span");
    nameSpan.textContent = user.username;

    label.appendChild(input);
    label.appendChild(nameSpan);
    container.appendChild(label);
  });
}

function collectCheckedUsernames(container) {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function updateShareVisibilityControls() {
  if (!shareUsersWrapper || !visibilitySelect) {
    return;
  }
  const shouldShow = visibilitySelect.value === "selected";
  shareUsersWrapper.classList.toggle("hidden", !shouldShow);
}

async function loadCurrentUser() {
  const user = await apiRequest("/users/me");
  currentUser = user;
  if (currentUsernameEl) {
    currentUsernameEl.textContent = user.username;
  }
}

async function loadAllUsers() {
  const users = await apiRequest("/users");
  availableUsers = Array.isArray(users) ? users : [];
  if (shareUserOptions) {
    renderShareUserOptions(shareUserOptions);
  }
}

async function loadProjects() {
  const projects = await apiRequest("/projects");
  if (!projectsContainer) {
    return;
  }
  projectsContainer.innerHTML = "";
  projects.forEach((project) => {
    const projectEl = renderProject(project);
    projectsContainer.appendChild(projectEl);
    const tasksSection = projectEl.querySelector(".tasks");
    if (tasksSection) {
      loadTasks(project.id, tasksSection);
    }
  });
}

async function loadTasks(projectId, container) {
  if (!container) {
    return;
  }
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
    const locationBits = [];
    if (notification.project_name) {
      locationBits.push(`Project: ${notification.project_name}`);
    }
    if (notification.task_title) {
      locationBits.push(`Task: ${notification.task_title}`);
    }
    const locationText = locationBits.length ? ` (${locationBits.join(" · ")})` : "";
    li.textContent = `${new Date(notification.created_at).toLocaleString()}: ${notification.message}${locationText}`;
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

  const canManage = currentUser && project.owner_id === currentUser.id;

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
  if (canManage) {
    header.appendChild(deleteBtn);
  }

  const description = document.createElement("p");
  description.textContent = project.description || "No description";

  const meta = document.createElement("div");
  meta.className = "project-meta";
  const visibilityBadge = document.createElement("span");
  visibilityBadge.className = `visibility-badge visibility-${project.visibility}`;
  visibilityBadge.textContent = formatVisibility(project.visibility);
  meta.appendChild(visibilityBadge);

  if (project.visibility === "selected") {
    const collaborators = document.createElement("p");
    collaborators.className = "shared-users";
    if (Array.isArray(project.shared_users) && project.shared_users.length) {
      const names = project.shared_users.map((user) => user.username).join(", ");
      collaborators.textContent = `Shared with: ${names}`;
    } else {
      collaborators.textContent = "Shared with: (none yet)";
    }
    meta.appendChild(collaborators);
  }

  if (canManage) {
    const accessForm = document.createElement("form");
    accessForm.className = "access-form";

    const accessLabel = document.createElement("label");
    accessLabel.textContent = "Visibility";
    accessLabel.htmlFor = `visibility-${project.id}`;

    const accessSelect = document.createElement("select");
    accessSelect.id = `visibility-${project.id}`;
    accessSelect.innerHTML = `
      <option value="all">All users</option>
      <option value="private">Private</option>
      <option value="selected">Selected users</option>
    `;
    accessSelect.value = project.visibility;

    const shareContainer = document.createElement("div");
    shareContainer.className = "share-checkboxes";
    renderShareUserOptions(
      shareContainer,
      Array.isArray(project.shared_users) ? project.shared_users.map((user) => user.username) : [],
      `project-${project.id}`,
    );
    shareContainer.classList.toggle("hidden", accessSelect.value !== "selected");

    const helpText = document.createElement("p");
    helpText.className = "help-text";
    helpText.textContent = "Select collaborators to grant access.";
    helpText.classList.toggle("hidden", accessSelect.value !== "selected");

    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.textContent = "Save access";

    accessForm.appendChild(accessLabel);
    accessForm.appendChild(accessSelect);
    accessForm.appendChild(helpText);
    accessForm.appendChild(shareContainer);
    accessForm.appendChild(saveBtn);

    accessSelect.addEventListener("change", () => {
      shareContainer.classList.toggle("hidden", accessSelect.value !== "selected");
      helpText.classList.toggle("hidden", accessSelect.value !== "selected");
    });

    accessForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = { visibility: accessSelect.value };
      if (accessSelect.value === "selected") {
        payload.shared_usernames = collectCheckedUsernames(shareContainer);
      }
      try {
        await apiRequest(`/projects/${project.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } catch (error) {
        alert(error.message || "Unable to update project");
        return;
      }
      await loadProjects();
    });

    meta.appendChild(accessForm);
  }

  const tasksContainer = document.createElement("div");
  tasksContainer.className = "tasks";

  projectEl.appendChild(header);
  projectEl.appendChild(description);
  projectEl.appendChild(meta);
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
  const nameInput = document.getElementById("project-name");
  const descriptionInput = document.getElementById("project-description");
  const name = nameInput ? nameInput.value.trim() : "";
  const description = descriptionInput ? descriptionInput.value.trim() : "";
  const visibility = visibilitySelect ? visibilitySelect.value : "all";
  const shared_usernames =
    visibility === "selected" ? collectCheckedUsernames(shareUserOptions) : [];
  try {
    await apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify({ name, description, visibility, shared_usernames }),
    });
  } catch (error) {
    alert(error.message || "Unable to create project");
    return;
  }
  event.target.reset();
  updateShareVisibilityControls();
  if (shareUserOptions) {
    shareUserOptions
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => {
        input.checked = false;
      });
  }
  await loadProjects();
}

async function initializeApp() {
  await loadCurrentUser();
  await loadAllUsers();
  updateShareVisibilityControls();
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

if (logoutBtn) {
  logoutBtn.addEventListener("click", (event) => {
    event.preventDefault();
    logoutUser();
  });
}

if (projectForm) {
  projectForm.addEventListener("submit", createProject);
}

if (visibilitySelect) {
  visibilitySelect.addEventListener("change", updateShareVisibilityControls);
}
