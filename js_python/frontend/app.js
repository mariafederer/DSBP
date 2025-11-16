// // API Configuration
// const API_BASE = "";
// let token = localStorage.getItem("kanban_token");
// let currentUser = null;
// let allUsers = [];
// let allProjects = [];
// let currentProject = null;
// let allTasks = [];
// let currentTask = null;
// let userSelectorCallback = null;
// let selectedUserIds = [];
// let projectCreationUserIds = [];
// let taskCreationAssigneeIds = [];
// let projectSettingsUserIds = [];
// let dependencyMapData = null;
// let dependencyDataLoaded = false;
// let notifications = [];
// let notificationsLoaded = false;

// // DOM Elements
// const currentUsernameEl = document.getElementById("current-username");
// const logoutBtn = document.getElementById("logout-btn");
// const projectsList = document.getElementById("projects-list");
// const btnAddProject = document.getElementById("btn-add-project");
// const btnSelectUser = document.getElementById("btn-select-user");
// const btnAddTask = document.getElementById("btn-add-task");
// const tabs = document.querySelectorAll(".tab");
// const taskboardView = document.getElementById("taskboard-view");
// const dashboardView = document.getElementById("dashboard-view");
// const dependencyView = document.getElementById("dependency-view");
// const notificationsView = document.getElementById("notifications-view");
// const projectOverviewName = document.getElementById("project-overview-name");
// const projectOverviewDescription = document.getElementById("project-overview-description");
// const projectOverviewVisibility = document.getElementById("project-overview-visibility");
// const projectOverviewOwner = document.getElementById("project-overview-owner");
// const projectSettingsForm = document.getElementById("form-project-settings");
// const projectSettingsNameInput = document.getElementById("project-settings-name");
// const projectSettingsDescriptionInput = document.getElementById("project-settings-description");
// const projectSettingsVisibilitySelect = document.getElementById("project-settings-visibility");
// const projectSettingsUsersWrapper = document.getElementById("project-settings-users-wrapper");
// const projectSettingsUsersContainer = document.getElementById("project-settings-users");
// const projectSettingsMessage = document.getElementById("project-settings-message");
// const btnProjectSettingsUsers = document.getElementById("btn-project-settings-users");
// const notificationsList = document.getElementById("notifications-list");
// const btnRefreshNotifications = document.getElementById("btn-refresh-notifications");
// const dependencyChainsContainer = document.getElementById("dependency-chains");
// const dependencyConvergenceContainer = document.getElementById("dependency-convergences");
// const dependencyEdgesContainer = document.getElementById("dependency-edges");
// const dependencyDependentSelect = document.getElementById("dependency-dependent");
// const dependencyDependsOnSelect = document.getElementById("dependency-depends-on");
// const dependencyStatusText = document.getElementById("dependency-status-text");

// // Modals
// const modalCreateProject = document.getElementById("modal-create-project");
// const modalUserSelector = document.getElementById("modal-user-selector");
// const modalAddTask = document.getElementById("modal-add-task");
// const taskDetailPanel = document.getElementById("task-detail-panel");

// // API Request Helper
// async function apiRequest(path, options = {}) {
//   const headers = options.headers || {};
//   if (token) {
//     headers["Authorization"] = `Bearer ${token}`;
//   }
//   if (!(options.body instanceof FormData)) {
//     headers["Content-Type"] = "application/json";
//   }

//   const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

//   if (!response.ok) {
//     if (response.status === 401) {
//       logoutUser();
//       throw new Error("Session expired. Please log in again.");
//     }
//     const text = await response.text();
//     let message = text;
//     try {
//       const json = JSON.parse(text);
//       message = json.detail || text;
//     } catch (e) {
//       // ignore
//     }
//     throw new Error(message || "Request failed");
//   }

//   if (response.status === 204) {
//     return null;
//   }

//   return response.json();
// }

// // Authentication
// function redirectToLogin() {
//   window.location.href = "/login";
// }

// function logoutUser() {
//   token = null;
//   currentUser = null;
//   localStorage.removeItem("kanban_token");
//   redirectToLogin();
// }

// // Initialize App
// async function initializeApp() {
//   if (!token) {
//     redirectToLogin();
//     return;
//   }

//   try {
//     currentUser = await apiRequest("/users/me");
//     allUsers = await apiRequest("/users");

//     if (currentUsernameEl) {
//       currentUsernameEl.textContent = currentUser.username;
//     }

//     await loadProjects();
//     showTabView("dashboard");

//     // Select first project by default
//     if (allProjects.length > 0) {
//       selectProject(allProjects[0].id);
//     }
//   } catch (error) {
//     console.error("Failed to initialize app:", error);
//     alert(error.message);
//   }
// }

// // Load Projects
// async function loadProjects() {
//   try {
//     allProjects = await apiRequest("/projects");
//     renderProjects();
//     renderDashboardProjectInfo();
//     populateProjectSettingsForm();
//   } catch (error) {
//     console.error("Failed to load projects:", error);
//   }
// }

// // Render Projects
// function renderProjects() {
//   if (!projectsList) return;

//   projectsList.innerHTML = "";

//   allProjects.forEach((project) => {
//     const li = document.createElement("li");
//     li.className = "project-item";
//     if (currentProject && currentProject.id === project.id) {
//       li.classList.add("active");
//     }

//     li.innerHTML = `
//       <div class="project-icon"></div>
//       <span>${escapeHtml(project.name)}</span>
//     `;

//     li.addEventListener("click", () => selectProject(project.id));
//     projectsList.appendChild(li);
//   });
// }

// function formatVisibilityLabel(value) {
//   if (!value) return "Unknown";
//   if (value === "all") return "All users";
//   if (value === "private") return "Private";
//   if (value === "selected") return "Selected users";
//   return value;
// }

// function renderDashboardProjectInfo() {
//   if (!projectOverviewName) return;

//   if (!currentProject) {
//     projectOverviewName.textContent = "Select a project";
//     if (projectOverviewDescription) {
//       projectOverviewDescription.textContent = "Choose a project from the sidebar to view details.";
//     }
//     if (projectOverviewVisibility) {
//       projectOverviewVisibility.textContent = "Visibility: --";
//     }
//     if (projectOverviewOwner) {
//       projectOverviewOwner.textContent = "Owner: --";
//     }
//     return;
//   }

//   projectOverviewName.textContent = currentProject.name;
//   if (projectOverviewDescription) {
//     projectOverviewDescription.textContent = currentProject.description || "No description provided.";
//   }
//   if (projectOverviewVisibility) {
//     projectOverviewVisibility.textContent = `Visibility: ${formatVisibilityLabel(currentProject.visibility)}`;
//   }
//   if (projectOverviewOwner) {
//     const owner = allUsers.find((user) => user.id === currentProject.owner_id);
//     const ownerName = owner ? owner.username : `User #${currentProject.owner_id}`;
//     projectOverviewOwner.textContent = `Owner: ${ownerName}`;
//   }
// }

// // Select Project
// async function selectProject(projectId) {
//   currentProject = allProjects.find((p) => p.id === projectId);
//   if (!currentProject) return;

//   renderProjects(); // Update active state
//   await loadTasks(projectId);
//   renderDashboardProjectInfo();
//   populateProjectSettingsForm();
// }

// // Load Tasks
// async function loadTasks(projectId) {
//   try {
//     allTasks = await apiRequest(`/projects/${projectId}/tasks`);
//     renderTaskBoard();
//   } catch (error) {
//     console.error("Failed to load tasks:", error);
//   }
// }

// // Render Task Board
// function renderTaskBoard() {
//   const statuses = ["new_task", "scheduled", "in_progress", "completed"];

//   statuses.forEach((status) => {
//     const container = document.querySelector(`.tasks-container[data-status="${status}"]`);
//     const countEl = document.querySelector(`.task-count[data-status="${status}"]`);

//     if (!container) return;

//     const tasks = allTasks.filter((task) => task.status === status);

//     // Update count
//     if (countEl) {
//       countEl.textContent = tasks.length;
//     }

//     // Clear container
//     container.innerHTML = "";

//     // Render tasks
//     tasks.forEach((task) => {
//       const taskCard = createTaskCard(task);
//       container.appendChild(taskCard);
//     });
//   });
// }

// // Create Task Card
// function createTaskCard(task) {
//   const card = document.createElement("div");
//   card.className = "task-card";
//   card.dataset.taskId = task.id;

//   // Get first assignee for avatar
//   const firstAssignee = task.assignees && task.assignees[0];
//   const avatarInitials = firstAssignee
//     ? getInitials(firstAssignee.username)
//     : "?";
//   const avatarColor = firstAssignee
//     ? `color-${firstAssignee.id % 8}`
//     : "color-0";

//   // Format due date
//   let dueDateHtml = "";
//   if (task.due_date) {
//     const dueDate = new Date(task.due_date);
//     const now = new Date();
//     const isOverdue = dueDate < now && task.status !== "completed";
//     const dueDateStr = formatDate(dueDate);

//     dueDateHtml = `
//       <div class="task-card-due ${isOverdue ? "overdue" : ""}">
//         ${dueDateStr}
//       </div>
//     `;
//   }

//   card.innerHTML = `
//     <div class="task-card-header">
//       <div class="task-avatar ${avatarColor}">${avatarInitials}</div>
//       <div class="task-card-title">${escapeHtml(task.title)}</div>
//     </div>
//     ${dueDateHtml}
//   `;

//   card.addEventListener("click", () => openTaskDetail(task.id));

//   return card;
// }

// // Open Task Detail Panel
// async function openTaskDetail(taskId) {
//   currentTask = allTasks.find((t) => t.id === taskId);
//   if (!currentTask) return;

//   // Load comments
//   try {
//     const comments = await apiRequest(`/tasks/${taskId}/comments`);
//     currentTask.comments = comments;
//   } catch (error) {
//     console.error("Failed to load comments:", error);
//     currentTask.comments = [];
//   }

//   renderTaskDetail();
//   taskDetailPanel.classList.remove("hidden");
//   taskDetailPanel.classList.add("visible");
// }

// // Render Task Detail
// function renderTaskDetail() {
//   if (!currentTask) return;

//   // Title
//   const titleInput = document.getElementById("task-title-input");
//   if (titleInput) {
//     titleInput.value = currentTask.title;
//   }

//   // Status
//   const statusSelect = document.getElementById("task-status-select");
//   if (statusSelect) {
//     statusSelect.value = currentTask.status;
//   }

//   // Due Date
//   const dueDateInput = document.getElementById("task-due-date");
//   if (dueDateInput) {
//     dueDateInput.value = currentTask.due_date
//       ? new Date(currentTask.due_date).toISOString().split("T")[0]
//       : "";
//   }

//   // Assignees
//   const assigneesList = document.getElementById("task-assignees");
//   if (assigneesList) {
//     assigneesList.innerHTML = "";
//     if (currentTask.assignees && currentTask.assignees.length > 0) {
//       currentTask.assignees.forEach((assignee) => {
//         const badge = createAssigneeBadge(assignee);
//         assigneesList.appendChild(badge);
//       });
//     }
//   }

//   // Comments
//   const commentsList = document.getElementById("comments-list");
//   const commentsCount = document.getElementById("comments-count");
//   if (commentsList) {
//     commentsList.innerHTML = "";
//     if (currentTask.comments && currentTask.comments.length > 0) {
//       currentTask.comments.forEach((comment) => {
//         const commentEl = createCommentElement(comment);
//         commentsList.appendChild(commentEl);
//       });
//     }
//   }
//   if (commentsCount) {
//     commentsCount.textContent = (currentTask.comments || []).length;
//   }
// }

// // Create Assignee Badge
// function createAssigneeBadge(assignee) {
//   const badge = document.createElement("div");
//   badge.className = "assignee-badge";

//   const avatar = document.createElement("div");
//   avatar.className = `assignee-avatar color-${assignee.id % 8}`;
//   avatar.textContent = getInitials(assignee.username);

//   const name = document.createElement("span");
//   name.textContent = assignee.username;

//   const removeBtn = document.createElement("button");
//   removeBtn.className = "btn-remove-assignee";
//   removeBtn.innerHTML = "&times;";
//   removeBtn.addEventListener("click", () => removeAssignee(assignee.id));

//   badge.appendChild(avatar);
//   badge.appendChild(name);
//   badge.appendChild(removeBtn);

//   return badge;
// }

// // Remove Assignee
// async function removeAssignee(userId) {
//   if (!currentTask) return;

//   try {
//     const newAssigneeIds = currentTask.assignees
//       .filter((a) => a.id !== userId)
//       .map((a) => a.id);

//     const updated = await apiRequest(`/tasks/${currentTask.id}`, {
//       method: "PATCH",
//       body: JSON.stringify({ assignee_ids: newAssigneeIds }),
//     });

//     currentTask = updated;
//     await loadTasks(currentProject.id);
//     renderTaskDetail();
//   } catch (error) {
//     alert("Failed to remove assignee: " + error.message);
//   }
// }

// // Create Comment Element
// function createCommentElement(comment) {
//   const div = document.createElement("div");
//   div.className = "comment-item";

//   const timeAgo = getTimeAgo(new Date(comment.created_at));

//   div.innerHTML = `
//     <div class="comment-avatar color-${comment.author.id % 8}">
//       ${getInitials(comment.author.username)}
//     </div>
//     <div class="comment-content">
//       <div class="comment-meta">
//         <span class="comment-author">${escapeHtml(comment.author.username)}</span>
//         <span class="comment-time">${timeAgo}</span>
//       </div>
//       <div class="comment-text">${escapeHtml(comment.content)}</div>
//     </div>
//   `;

//   return div;
// }

// // Close Task Detail Panel
// function closeTaskDetail() {
//   taskDetailPanel.classList.remove("visible");
//   taskDetailPanel.classList.add("hidden");
//   currentTask = null;
// }

// // Update Task Title
// async function updateTaskTitle() {
//   if (!currentTask) return;

//   const titleInput = document.getElementById("task-title-input");
//   const newTitle = titleInput.value.trim();

//   if (!newTitle || newTitle === currentTask.title) return;

//   try {
//     const updated = await apiRequest(`/tasks/${currentTask.id}`, {
//       method: "PATCH",
//       body: JSON.stringify({ title: newTitle }),
//     });

//     currentTask = updated;
//     await loadTasks(currentProject.id);
//   } catch (error) {
//     alert("Failed to update task title: " + error.message);
//   }
// }

// // Update Task Status
// async function updateTaskStatus(newStatus) {
//   if (!currentTask) return;

//   try {
//     const updated = await apiRequest(`/tasks/${currentTask.id}`, {
//       method: "PATCH",
//       body: JSON.stringify({ status: newStatus }),
//     });

//     currentTask = updated;
//     await loadTasks(currentProject.id);
//     renderTaskDetail();
//   } catch (error) {
//     alert("Failed to update task status: " + error.message);
//   }
// }

// // Update Task Due Date
// async function updateTaskDueDate(dueDate) {
//   if (!currentTask) return;

//   try {
//     const updated = await apiRequest(`/tasks/${currentTask.id}`, {
//       method: "PATCH",
//       body: JSON.stringify({ due_date: dueDate || null }),
//     });

//     currentTask = updated;
//     await loadTasks(currentProject.id);
//   } catch (error) {
//     alert("Failed to update task due date: " + error.message);
//   }
// }

// // Delete Task
// async function deleteTask() {
//   if (!currentTask) return;

//   if (!confirm("Are you sure you want to delete this task?")) return;

//   try {
//     await apiRequest(`/tasks/${currentTask.id}`, { method: "DELETE" });
//     await loadTasks(currentProject.id);
//     dependencyDataLoaded = false;
//     closeTaskDetail();
//   } catch (error) {
//     alert("Failed to delete task: " + error.message);
//   }
// }

// // Add Comment
// async function addComment(content) {
//   if (!currentTask || !content.trim()) return;

//   try {
//     await apiRequest("/comments", {
//       method: "POST",
//       body: JSON.stringify({
//         task_id: currentTask.id,
//         content: content.trim(),
//       }),
//     });

//     // Reload comments
//     const comments = await apiRequest(`/tasks/${currentTask.id}/comments`);
//     currentTask.comments = comments;
//     renderTaskDetail();

//     // Clear input
//     const commentInput = document.getElementById("comment-input");
//     if (commentInput) {
//       commentInput.value = "";
//     }
//   } catch (error) {
//     alert("Failed to add comment: " + error.message);
//   }
// }

// // Show Modal
// function showModal(modal) {
//   modal.classList.remove("hidden");
// }

// // Hide Modal
// function hideModal(modal) {
//   modal.classList.add("hidden");
//   if (modal === modalUserSelector) {
//     userSelectorCallback = null;
//     selectedUserIds = [];
//   }
// }

// // Open User Selector
// function openUserSelector(callback, multiSelect = true, preselectedIds = []) {
//   userSelectorCallback = callback;
//   selectedUserIds = [...preselectedIds];

//   renderUserList(multiSelect);
//   showModal(modalUserSelector);
// }

// // Render User List
// function renderUserList(multiSelect) {
//   const userList = document.getElementById("user-list");
//   if (!userList) return;

//   userList.innerHTML = "";

//   // Add "All Users" option if multi-select
//   if (multiSelect) {
//     const allUsersItem = document.createElement("div");
//     allUsersItem.className = "user-item all-users";
//     allUsersItem.innerHTML = `
//       <div class="user-item-avatar color-0">AL</div>
//       <div class="user-item-info">
//         <div class="user-item-name">All Users</div>
//         <div class="user-item-email">Select all users in the list</div>
//       </div>
//       <input type="checkbox" class="user-item-checkbox" id="user-all" />
//     `;

//     const checkbox = allUsersItem.querySelector("#user-all");
//     checkbox.addEventListener("change", () => {
//       if (checkbox.checked) {
//         selectedUserIds = allUsers.map((u) => u.id);
//       } else {
//         selectedUserIds = [];
//       }
//       renderUserList(multiSelect);
//     });

//     userList.appendChild(allUsersItem);
//   }

//   // Add individual users
//   allUsers.forEach((user) => {
//     const item = document.createElement("div");
//     item.className = "user-item";

//     const isChecked = selectedUserIds.includes(user.id);

//     item.innerHTML = `
//       <div class="user-item-avatar color-${user.id % 8}">
//         ${getInitials(user.username)}
//       </div>
//       <div class="user-item-info">
//         <div class="user-item-name">${escapeHtml(user.username)}</div>
//         <div class="user-item-email">${escapeHtml(user.email)}</div>
//       </div>
//       <input type="checkbox" class="user-item-checkbox" ${isChecked ? "checked" : ""} />
//     `;

//     const checkbox = item.querySelector(".user-item-checkbox");
//     checkbox.addEventListener("change", () => {
//       if (checkbox.checked) {
//         if (multiSelect) {
//           if (!selectedUserIds.includes(user.id)) {
//             selectedUserIds.push(user.id);
//           }
//         } else {
//           selectedUserIds = [user.id];
//         }
//       } else {
//         selectedUserIds = selectedUserIds.filter((id) => id !== user.id);
//       }

//       if (!multiSelect) {
//         // Close modal immediately for single select
//         if (userSelectorCallback) {
//           userSelectorCallback(selectedUserIds);
//         }
//         hideModal(modalUserSelector);
//       }
//     });

//     userList.appendChild(item);
//   });
// }

// // Create Project
// async function createProject(formData) {
//   try {
//     const name = formData.get("name");
//     const description = formData.get("description");
//     const visibility = formData.get("visibility");

//     const payload = {
//       name,
//       description: description || "",
//       visibility,
//       shared_usernames: [],
//     };

//     if (visibility === "selected" && projectCreationUserIds.length > 0) {
//       const selectedUsers = allUsers.filter((u) => projectCreationUserIds.includes(u.id));
//       payload.shared_usernames = selectedUsers.map((u) => u.username);
//     }

//     await apiRequest("/projects", {
//       method: "POST",
//       body: JSON.stringify(payload),
//     });

//     await loadProjects();
//     hideModal(modalCreateProject);

//     // Reset form
//     document.getElementById("form-create-project").reset();
//     projectCreationUserIds = [];
//     selectedUserIds = [];
//     updateSelectedUsers("selected-project-users", projectCreationUserIds);
//   } catch (error) {
//     alert("Failed to create project: " + error.message);
//   }
// }

// // Create Task
// async function createTask(formData) {
//   if (!currentProject) {
//     alert("Please select a project first");
//     return;
//   }

//   try {
//     const title = formData.get("title");
//     const description = formData.get("description");
//     const status = formData.get("status");
//     const dueDate = formData.get("due_date");

//     const payload = {
//       project_id: currentProject.id,
//       title,
//       description: description || "",
//       status,
//       due_date: dueDate || null,
//       assignee_ids: taskCreationAssigneeIds,
//     };

//     await apiRequest("/tasks", {
//       method: "POST",
//       body: JSON.stringify(payload),
//     });

//     await loadTasks(currentProject.id);
//     dependencyDataLoaded = false;
//     hideModal(modalAddTask);

//     // Reset form
//     document.getElementById("form-add-task").reset();
//     taskCreationAssigneeIds = [];
//     selectedUserIds = [];
//     updateSelectedUsers("selected-task-assignees", taskCreationAssigneeIds);
//   } catch (error) {
//     alert("Failed to create task: " + error.message);
//   }
// }

// // Update Selected Users Display
// function updateSelectedUsers(containerId, userIds = []) {
//   const container = document.getElementById(containerId);
//   if (!container) return;

//   container.innerHTML = "";

//   if (!userIds || userIds.length === 0) {
//     container.innerHTML = '<span style="color: #94a3b8; font-size: 13px;">No users selected</span>';
//     return;
//   }

//   userIds.forEach((userId) => {
//     const user = allUsers.find((u) => u.id === userId);
//     if (!user) return;

//     const badge = document.createElement("div");
//     badge.className = "assignee-badge";

//     const avatar = document.createElement("div");
//     avatar.className = `assignee-avatar color-${user.id % 8}`;
//     avatar.textContent = getInitials(user.username);

//     const name = document.createElement("span");
//     name.textContent = user.username;

//     badge.appendChild(avatar);
//     badge.appendChild(name);
//     container.appendChild(badge);
//   });
// }

// // Utility Functions
// function escapeHtml(text) {
//   const map = {
//     "&": "&amp;",
//     "<": "&lt;",
//     ">": "&gt;",
//     '"': "&quot;",
//     "'": "&#039;",
//   };
//   return String(text).replace(/[&<>"']/g, (m) => map[m]);
// }

// function getInitials(name) {
//   return name
//     .split(" ")
//     .map((n) => n[0])
//     .join("")
//     .toUpperCase()
//     .slice(0, 2);
// }

// function formatDate(date) {
//   const now = new Date();
//   const diff = date - now;
//   const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

//   if (days === 0) return "Today";
//   if (days === 1) return "Tomorrow";
//   if (days === -1) return "Yesterday";
//   if (days > 1) return `${days} days left`;
//   if (days < -1) return `${Math.abs(days)} days ago`;

//   return date.toLocaleDateString();
// }

// function getTimeAgo(date) {
//   const seconds = Math.floor((new Date() - date) / 1000);

//   let interval = seconds / 31536000;
//   if (interval > 1) return Math.floor(interval) + " years ago";

//   interval = seconds / 2592000;
//   if (interval > 1) return Math.floor(interval) + " months ago";

//   interval = seconds / 86400;
//   if (interval > 1) return Math.floor(interval) + " days ago";

//   interval = seconds / 3600;
//   if (interval > 1) return Math.floor(interval) + " hours ago";

//   interval = seconds / 60;
//   if (interval > 1) return Math.floor(interval) + " minutes ago";

//   return "just now";
// }

// // Event Listeners
// if (logoutBtn) {
//   logoutBtn.addEventListener("click", logoutUser);
// }

// if (btnAddProject) {
//   btnAddProject.addEventListener("click", () => {
//     selectedUserIds = [...projectCreationUserIds];
//     updateSelectedUsers("selected-project-users", projectCreationUserIds);
//     showModal(modalCreateProject);
//   });
// }

// function populateProjectSettingsForm() {
//   if (!projectSettingsForm) return;

//   if (!currentProject) {
//     projectSettingsForm.reset();
//     projectSettingsUserIds = [];
//     updateSelectedUsers("project-settings-users", projectSettingsUserIds);
//     if (projectSettingsUsersWrapper) {
//       projectSettingsUsersWrapper.classList.add("hidden");
//     }
//     if (projectSettingsMessage) {
//       projectSettingsMessage.textContent = "Select a project to edit its settings.";
//     }
//     Array.from(projectSettingsForm.querySelectorAll("input, textarea, select, button"))
//       .forEach((el) => {
//         el.disabled = true;
//       });
//     return;
//   }

//   if (projectSettingsNameInput) {
//     projectSettingsNameInput.value = currentProject.name;
//   }
//   if (projectSettingsDescriptionInput) {
//     projectSettingsDescriptionInput.value = currentProject.description || "";
//   }
//   if (projectSettingsVisibilitySelect) {
//     projectSettingsVisibilitySelect.value = currentProject.visibility;
//   }

//   const isOwner = currentUser && currentProject.owner_id === currentUser.id;
//   const shouldShowUsers = currentProject.visibility === "selected";
//   if (projectSettingsUsersWrapper) {
//     if (shouldShowUsers) {
//       projectSettingsUsersWrapper.classList.remove("hidden");
//     } else {
//       projectSettingsUsersWrapper.classList.add("hidden");
//     }
//   }

//   projectSettingsUserIds = (currentProject.shared_users || []).map((user) => user.id);
//   updateSelectedUsers("project-settings-users", projectSettingsUserIds);

//   Array.from(projectSettingsForm.querySelectorAll("input, textarea, select, button"))
//     .forEach((el) => {
//       el.disabled = !isOwner && el.type !== "button";
//       if (!isOwner && el.tagName === "BUTTON") {
//         el.disabled = true;
//       }
//     });

//   if (projectSettingsMessage) {
//     projectSettingsMessage.textContent = isOwner
//       ? "Update the project visibility or sharing at any time."
//       : "Only the project owner can update visibility settings.";
//   }
// }

// async function handleProjectSettingsSubmit(event) {
//   event.preventDefault();
//   if (!currentProject) {
//     alert("Select a project before updating settings.");
//     return;
//   }
//   if (!currentUser || currentProject.owner_id !== currentUser.id) {
//     alert("Only the project owner can update visibility settings.");
//     return;
//   }

//   const name = projectSettingsNameInput ? projectSettingsNameInput.value.trim() : currentProject.name;
//   const description = projectSettingsDescriptionInput
//     ? projectSettingsDescriptionInput.value.trim()
//     : currentProject.description || "";
//   const visibility = projectSettingsVisibilitySelect
//     ? projectSettingsVisibilitySelect.value
//     : currentProject.visibility;

//   const payload = {
//     name: name || currentProject.name,
//     description,
//     visibility,
//     shared_usernames: [],
//   };

//   if (visibility === "selected" && projectSettingsUserIds.length > 0) {
//     const selectedUsers = allUsers.filter((user) => projectSettingsUserIds.includes(user.id));
//     payload.shared_usernames = selectedUsers.map((user) => user.username);
//   }

//   try {
//     const projectId = currentProject.id;
//     await apiRequest(`/projects/${projectId}`, {
//       method: "PATCH",
//       body: JSON.stringify(payload),
//     });
//     dependencyDataLoaded = false;
//     await loadProjects();
//     await selectProject(projectId);
//     if (projectSettingsMessage) {
//       projectSettingsMessage.textContent = "Project settings updated successfully.";
//     }
//   } catch (error) {
//     alert("Failed to update project: " + error.message);
//   }
// }

// async function loadDependencyData(force = false) {
//   if (dependencyDataLoaded && !force) {
//     renderDependencyView();
//     return;
//   }
//   try {
//     dependencyMapData = await apiRequest("/dependency-map");
//     dependencyDataLoaded = true;
//     renderDependencyView();
//   } catch (error) {
//     dependencyDataLoaded = false;
//     if (dependencyStatusText) {
//       dependencyStatusText.textContent = error.message;
//     }
//   }
// }

// function buildDependencyTaskLabel(task) {
//   return `${task.title} (${task.project_name})`;
// }

// function renderDependencyView() {
//   if (!dependencyView) return;

//   const hasTasks = dependencyMapData && dependencyMapData.tasks && dependencyMapData.tasks.length > 0;
//   if (!hasTasks) {
//     if (dependencyDependentSelect) {
//       dependencyDependentSelect.innerHTML = '<option value="">No tasks available</option>';
//       dependencyDependentSelect.disabled = true;
//     }
//     if (dependencyDependsOnSelect) {
//       dependencyDependsOnSelect.innerHTML = '<option value="">No tasks available</option>';
//       dependencyDependsOnSelect.disabled = true;
//     }
//     if (dependencyStatusText) {
//       dependencyStatusText.textContent = "Create tasks to start building the dependency map.";
//     }
//     if (dependencyChainsContainer) dependencyChainsContainer.innerHTML = "";
//     if (dependencyConvergenceContainer) dependencyConvergenceContainer.innerHTML = "";
//     if (dependencyEdgesContainer) dependencyEdgesContainer.innerHTML = "";
//     return;
//   }

//   const tasks = [...dependencyMapData.tasks].sort((a, b) => {
//     if (a.project_name.toLowerCase() === b.project_name.toLowerCase()) {
//       return a.title.localeCompare(b.title);
//     }
//     return a.project_name.localeCompare(b.project_name);
//   });

//   if (dependencyDependentSelect && dependencyDependsOnSelect) {
//     const optionsHtml = tasks
//       .map((task) => `<option value="${task.id}">${escapeHtml(buildDependencyTaskLabel(task))}</option>`)
//       .join("");
//     dependencyDependentSelect.innerHTML = `<option value="">Dependent task...</option>${optionsHtml}`;
//     dependencyDependsOnSelect.innerHTML = `<option value="">Depends on...</option>${optionsHtml}`;
//     dependencyDependentSelect.disabled = false;
//     dependencyDependsOnSelect.disabled = false;
//   }

//   if (dependencyStatusText) {
//     dependencyStatusText.textContent = dependencyMapData.edges.length === 0
//       ? "No dependencies defined yet."
//       : "";
//   }

//   if (dependencyChainsContainer) {
//     dependencyChainsContainer.innerHTML = "";
//     if (dependencyMapData.chains.length === 0) {
//       dependencyChainsContainer.innerHTML = "<p>No linear chains detected.</p>";
//     } else {
//       dependencyMapData.chains.forEach((chain) => {
//         const card = document.createElement("div");
//         card.className = "dependency-card";
//         card.textContent = chain.tasks
//           .map((task) => buildDependencyTaskLabel(task))
//           .join(" → ");
//         dependencyChainsContainer.appendChild(card);
//       });
//     }
//   }

//   if (dependencyConvergenceContainer) {
//     dependencyConvergenceContainer.innerHTML = "";
//     if (dependencyMapData.convergences.length === 0) {
//       dependencyConvergenceContainer.innerHTML = "<p>No converging dependencies detected.</p>";
//     } else {
//       dependencyMapData.convergences.forEach((group) => {
//         const card = document.createElement("div");
//         card.className = "dependency-card";
//         const sources = group.sources.map((task) => buildDependencyTaskLabel(task)).join(", ");
//         card.textContent = `${sources} → ${buildDependencyTaskLabel(group.target)}`;
//         dependencyConvergenceContainer.appendChild(card);
//       });
//     }
//   }

//   if (dependencyEdgesContainer) {
//     dependencyEdgesContainer.innerHTML = "";
//     if (dependencyMapData.edges.length === 0) {
//       dependencyEdgesContainer.innerHTML = "<p>No direct dependencies defined.</p>";
//     } else {
//       dependencyMapData.edges.forEach((edge) => {
//         const row = document.createElement("div");
//         row.className = "dependency-edge-row";
//         row.innerHTML = `
//           <span>${escapeHtml(buildDependencyTaskLabel(edge.depends_on))} → ${escapeHtml(
//           buildDependencyTaskLabel(edge.dependent)
//         )}</span>
//           <button class="btn-secondary btn-small" data-dependency-id="${edge.id}">Remove</button>
//         `;
//         const btn = row.querySelector("button");
//         btn.addEventListener("click", () => deleteDependencyLink(edge.id));
//         dependencyEdgesContainer.appendChild(row);
//       });
//     }
//   }
// }

// async function handleAddDependency(event) {
//   event.preventDefault();
//   if (!dependencyDependentSelect || !dependencyDependsOnSelect) return;

//   const dependentId = parseInt(dependencyDependentSelect.value, 10);
//   const dependsOnId = parseInt(dependencyDependsOnSelect.value, 10);

//   if (!dependentId || !dependsOnId) {
//     alert("Please select both tasks to create a dependency.");
//     return;
//   }
//   if (dependentId === dependsOnId) {
//     alert("A task cannot depend on itself.");
//     return;
//   }

//   try {
//     await apiRequest("/task-dependencies", {
//       method: "POST",
//       body: JSON.stringify({
//         dependent_task_id: dependentId,
//         depends_on_task_id: dependsOnId,
//       }),
//     });
//     if (dependencyStatusText) {
//       dependencyStatusText.textContent = "Dependency created.";
//     }
//     await loadDependencyData(true);
//     event.target.reset();
//   } catch (error) {
//     alert("Failed to create dependency: " + error.message);
//   }
// }

// async function deleteDependencyLink(dependencyId) {
//   if (!confirm("Remove this dependency?")) return;
//   try {
//     await apiRequest(`/task-dependencies/${dependencyId}`, { method: "DELETE" });
//     if (dependencyStatusText) {
//       dependencyStatusText.textContent = "Dependency removed.";
//     }
//     await loadDependencyData(true);
//   } catch (error) {
//     alert("Failed to remove dependency: " + error.message);
//   }
// }

// async function loadNotifications(force = false) {
//   if (notificationsLoaded && !force) {
//     renderNotifications();
//     return;
//   }
//   try {
//     notifications = await apiRequest("/notifications");
//     notificationsLoaded = true;
//     renderNotifications();
//   } catch (error) {
//     notificationsLoaded = false;
//     if (notificationsList) {
//       notificationsList.innerHTML = `<li class="notification-item">${escapeHtml(error.message)}</li>`;
//     }
//   }
// }

// function renderNotifications() {
//   if (!notificationsList) return;
//   notificationsList.innerHTML = "";

//   if (!notifications || notifications.length === 0) {
//     const empty = document.createElement("li");
//     empty.className = "notification-item empty";
//     empty.textContent = "You're all caught up!";
//     notificationsList.appendChild(empty);
//     return;
//   }

//   notifications.forEach((notification) => {
//     const item = document.createElement("li");
//     item.className = "notification-item";
//     if (!notification.read) {
//       item.classList.add("unread");
//     }

//     const locationBits = [];
//     if (notification.project_name) {
//       locationBits.push(notification.project_name);
//     }
//     if (notification.task_title) {
//       locationBits.push(notification.task_title);
//     }
//     const location = locationBits.length > 0 ? ` • ${locationBits.join(" → ")}` : "";

//     item.innerHTML = `
//       <div>
//         <p class="notification-message">${escapeHtml(notification.message)}${escapeHtml(location)}</p>
//         <span class="notification-time">${new Date(notification.created_at).toLocaleString()}</span>
//       </div>
//     `;

//     if (!notification.read) {
//       const btn = document.createElement("button");
//       btn.className = "btn-secondary btn-small";
//       btn.textContent = "Mark as read";
//       btn.addEventListener("click", () => markNotificationRead(notification.id));
//       item.appendChild(btn);
//     }

//     notificationsList.appendChild(item);
//   });
// }

// async function markNotificationRead(notificationId) {
//   try {
//     const updated = await apiRequest(`/notifications/${notificationId}/read`, {
//       method: "POST",
//     });
//     notifications = notifications.map((n) => (n.id === notificationId ? updated : n));
//     renderNotifications();
//   } catch (error) {
//     alert("Failed to update notification: " + error.message);
//   }
// }

// if (btnAddTask) {
//   btnAddTask.addEventListener("click", () => {
//     if (!currentProject) {
//       alert("Please select a project first");
//       return;
//     }
//     selectedUserIds = [...taskCreationAssigneeIds];
//     updateSelectedUsers("selected-task-assignees", taskCreationAssigneeIds);
//     showModal(modalAddTask);
//   });
// }

// function showTabView(tabName) {
//   const views = [taskboardView, dashboardView, dependencyView, notificationsView];
//   views.forEach((view) => {
//     if (view) {
//       view.classList.add("hidden");
//     }
//   });

//   if (tabName === "taskboard" && taskboardView) {
//     taskboardView.classList.remove("hidden");
//   } else if (tabName === "dashboard" && dashboardView) {
//     dashboardView.classList.remove("hidden");
//   } else if (tabName === "dependency" && dependencyView) {
//     dependencyView.classList.remove("hidden");
//     loadDependencyData(true);
//   } else if (tabName === "notifications" && notificationsView) {
//     notificationsView.classList.remove("hidden");
//     loadNotifications(true);
//   }
// }

// // Tab Navigation
// tabs.forEach((tab) => {
//   tab.addEventListener("click", () => {
//     const tabName = tab.dataset.tab;

//     tabs.forEach((t) => t.classList.remove("active"));
//     tab.classList.add("active");

//     showTabView(tabName);
//   });
// });

// // Modal Close Buttons
// document.querySelectorAll(".btn-close, .modal-cancel").forEach((btn) => {
//   btn.addEventListener("click", () => {
//     hideModal(modalCreateProject);
//     hideModal(modalUserSelector);
//     hideModal(modalAddTask);
//   });
// });

// // Close modal on background click
// document.querySelectorAll(".modal").forEach((modal) => {
//   modal.addEventListener("click", (e) => {
//     if (e.target === modal) {
//       hideModal(modal);
//     }
//   });
// });

// // Create Project Form
// const formCreateProject = document.getElementById("form-create-project");
// if (formCreateProject) {
//   formCreateProject.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const formData = new FormData(formCreateProject);
//     await createProject(formData);
//   });

//   // Visibility change
//   const visibilitySelect = document.getElementById("project-visibility");
//   const usersWrapper = document.getElementById("project-users-wrapper");
//   if (visibilitySelect && usersWrapper) {
//     visibilitySelect.addEventListener("change", () => {
//       if (visibilitySelect.value === "selected") {
//         usersWrapper.classList.remove("hidden");
//       } else {
//         usersWrapper.classList.add("hidden");
//       }
//     });
//   }

//   // Select users button
//   const btnSelectProjectUsers = document.getElementById("btn-select-project-users");
//   if (btnSelectProjectUsers) {
//     btnSelectProjectUsers.addEventListener("click", () => {
//       openUserSelector((userIds) => {
//         projectCreationUserIds = userIds;
//         updateSelectedUsers("selected-project-users", projectCreationUserIds);
//       }, true, projectCreationUserIds);
//     });
//   }
// }

// // Add Task Form
// const formAddTask = document.getElementById("form-add-task");
// if (formAddTask) {
//   formAddTask.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const formData = new FormData(formAddTask);
//     await createTask(formData);
//   });

//   // Select assignees button
//   const btnSelectTaskAssignees = document.getElementById("btn-select-task-assignees");
//   if (btnSelectTaskAssignees) {
//     btnSelectTaskAssignees.addEventListener("click", () => {
//       openUserSelector((userIds) => {
//         taskCreationAssigneeIds = userIds;
//         updateSelectedUsers("selected-task-assignees", taskCreationAssigneeIds);
//       }, true, taskCreationAssigneeIds);
//     });
//   }
// }

// if (projectSettingsForm) {
//   projectSettingsForm.addEventListener("submit", handleProjectSettingsSubmit);
// }

// if (projectSettingsVisibilitySelect && projectSettingsUsersWrapper) {
//   projectSettingsVisibilitySelect.addEventListener("change", () => {
//     if (projectSettingsVisibilitySelect.value === "selected") {
//       projectSettingsUsersWrapper.classList.remove("hidden");
//     } else {
//       projectSettingsUsersWrapper.classList.add("hidden");
//     }
//   });
// }

// if (btnProjectSettingsUsers) {
//   btnProjectSettingsUsers.addEventListener("click", () => {
//     if (!currentProject || !currentUser || currentProject.owner_id !== currentUser.id) return;
//     openUserSelector((userIds) => {
//       projectSettingsUserIds = userIds;
//       updateSelectedUsers("project-settings-users", projectSettingsUserIds);
//     }, true, projectSettingsUserIds);
//   });
// }

// const formAddDependency = document.getElementById("form-add-dependency");
// if (formAddDependency) {
//   formAddDependency.addEventListener("submit", handleAddDependency);
// }

// if (btnRefreshNotifications) {
//   btnRefreshNotifications.addEventListener("click", () => loadNotifications(true));
// }

// const btnUserSelectorApply = document.getElementById("btn-user-selector-apply");
// if (btnUserSelectorApply) {
//   btnUserSelectorApply.addEventListener("click", () => {
//     if (userSelectorCallback) {
//       userSelectorCallback([...selectedUserIds]);
//     }
//     hideModal(modalUserSelector);
//   });
// }

// const btnUserSelectorCancel = document.getElementById("btn-user-selector-cancel");
// if (btnUserSelectorCancel) {
//   btnUserSelectorCancel.addEventListener("click", () => {
//     hideModal(modalUserSelector);
//   });
// }

// // Task Detail Panel Events
// const btnClosePanel = document.getElementById("btn-close-panel");
// if (btnClosePanel) {
//   btnClosePanel.addEventListener("click", closeTaskDetail);
// }

// const taskTitleInput = document.getElementById("task-title-input");
// if (taskTitleInput) {
//   taskTitleInput.addEventListener("blur", updateTaskTitle);
//   taskTitleInput.addEventListener("keypress", (e) => {
//     if (e.key === "Enter") {
//       e.preventDefault();
//       taskTitleInput.blur();
//     }
//   });
// }

// const taskStatusSelect = document.getElementById("task-status-select");
// if (taskStatusSelect) {
//   taskStatusSelect.addEventListener("change", () => {
//     updateTaskStatus(taskStatusSelect.value);
//   });
// }

// const taskDueDateInput = document.getElementById("task-due-date");
// if (taskDueDateInput) {
//   taskDueDateInput.addEventListener("change", () => {
//     updateTaskDueDate(taskDueDateInput.value);
//   });
// }

// const btnDeleteTask = document.getElementById("btn-delete-task");
// if (btnDeleteTask) {
//   btnDeleteTask.addEventListener("click", deleteTask);
// }

// const btnAddAssignee = document.getElementById("btn-add-assignee");
// if (btnAddAssignee) {
//   btnAddAssignee.addEventListener("click", () => {
//     if (!currentTask) return;

//     const currentAssigneeIds = currentTask.assignees.map((a) => a.id);
//     openUserSelector(async (userIds) => {
//       try {
//         const updated = await apiRequest(`/tasks/${currentTask.id}`, {
//           method: "PATCH",
//           body: JSON.stringify({ assignee_ids: userIds }),
//         });

//         currentTask = updated;
//         await loadTasks(currentProject.id);
//         renderTaskDetail();
//       } catch (error) {
//         alert("Failed to update assignees: " + error.message);
//       }
//     }, true, currentAssigneeIds);
//   });
// }

// // Add Comment Form
// const formAddComment = document.getElementById("form-add-comment");
// if (formAddComment) {
//   formAddComment.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const commentInput = document.getElementById("comment-input");
//     if (commentInput) {
//       await addComment(commentInput.value);
//     }
//   });
// }

// // User Search in Modal
// const userSearchInput = document.getElementById("user-search");
// if (userSearchInput) {
//   userSearchInput.addEventListener("input", () => {
//     const query = userSearchInput.value.toLowerCase();
//     const userItems = document.querySelectorAll(".user-item:not(.all-users)");

//     userItems.forEach((item) => {
//       const name = item.querySelector(".user-item-name").textContent.toLowerCase();
//       const email = item.querySelector(".user-item-email").textContent.toLowerCase();

//       if (name.includes(query) || email.includes(query)) {
//         item.style.display = "flex";
//       } else {
//         item.style.display = "none";
//       }
//     });
//   });
// }

// // Initialize on load
// initializeApp();


// API Configuration
const API_BASE = "";
let token = localStorage.getItem("kanban_token");
let currentUser = null;
let allUsers = [];
let allProjects = [];
let currentProject = null;
let allTasks = [];
let currentTask = null;
let userSelectorCallback = null;
let selectedUserIds = [];
let projectCreationUserIds = [];
let taskCreationAssigneeIds = [];
let projectSettingsUserIds = [];
let dependencyMapData = null;
let dependencyDataLoaded = false;
let notifications = [];
let notificationsLoaded = false;

// DOM Elements
const currentUsernameEl = document.getElementById("current-username");
const currentUserIcon = document.getElementById("current-user-icon"); // Added this
const logoutBtn = document.getElementById("logout-btn");
const projectsList = document.getElementById("projects-list");
const btnAddProject = document.getElementById("btn-add-project");
const btnSelectUser = document.getElementById("btn-select-user");
const btnAddTask = document.getElementById("btn-add-task");
const tabs = document.querySelectorAll(".tab");
const taskboardView = document.getElementById("taskboard-view");
const dashboardView = document.getElementById("dashboard-view");
const dependencyView = document.getElementById("dependency-view");
const notificationsView = document.getElementById("notifications-view");
const projectOverviewName = document.getElementById("project-overview-name");
const projectOverviewDescription = document.getElementById("project-overview-description");
const projectOverviewVisibility = document.getElementById("project-overview-visibility");
const projectOverviewOwner = document.getElementById("project-overview-owner");
const projectSettingsForm = document.getElementById("form-project-settings");
const projectSettingsNameInput = document.getElementById("project-settings-name");
const projectSettingsDescriptionInput = document.getElementById("project-settings-description");
const projectSettingsVisibilitySelect = document.getElementById("project-settings-visibility");
const projectSettingsUsersWrapper = document.getElementById("project-settings-users-wrapper");
const projectSettingsUsersContainer = document.getElementById("project-settings-users");
const projectSettingsMessage = document.getElementById("project-settings-message");
const btnProjectSettingsUsers = document.getElementById("btn-project-settings-users");
const notificationsList = document.getElementById("notifications-list");
const btnRefreshNotifications = document.getElementById("btn-refresh-notifications");
const dependencyChainsContainer = document.getElementById("dependency-chains");
const dependencyConvergenceContainer = document.getElementById("dependency-convergences");
const dependencyEdgesContainer = document.getElementById("dependency-edges");
const dependencyDependentSelect = document.getElementById("dependency-dependent");
const dependencyDependsOnSelect = document.getElementById("dependency-depends-on");
const dependencyStatusText = document.getElementById("dependency-status-text");
const btnSaveSettings = document.getElementById("btn-save-settings"); // Added this

// Modals
const modalCreateProject = document.getElementById("modal-create-project");
const modalUserSelector = document.getElementById("modal-user-selector");
const modalAddTask = document.getElementById("modal-add-task");
const taskDetailPanel = document.getElementById("task-detail-panel");

// API Request Helper
async function apiRequest(path, options = {}) {
  const headers = options.headers || {};
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
    const text = await response.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.detail || text;
    } catch (e) {
      // ignore
    }
    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Authentication
function redirectToLogin() {
  window.location.href = "/login";
}

function logoutUser() {
  token = null;
  currentUser = null;
  localStorage.removeItem("kanban_token");
  redirectToLogin();
}

// Initialize App
async function initializeApp() {
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    currentUser = await apiRequest("/users/me");
    allUsers = await apiRequest("/users");

    if (currentUsernameEl) {
      currentUsernameEl.textContent = currentUser.username;
    }
    // Update user icon
    if (currentUserIcon) {
        currentUserIcon.textContent = getInitials(currentUser.username);
        currentUserIcon.className = `user-icon color-${currentUser.id % 8}`;
    }


    await loadProjects();
    showTabView("dashboard");

    // Select first project by default
    if (allProjects.length > 0) {
      selectProject(allProjects[0].id);
    } else {
        // Handle no projects
        renderDashboardProjectInfo();
        populateProjectSettingsForm();
    }
  } catch (error) {
    console.error("Failed to initialize app:", error);
    if (error.message.includes("Session expired")) {
        alert(error.message);
    }
  }
}

// Load Projects
async function loadProjects() {
  try {
    allProjects = await apiRequest("/projects");
    renderProjects();
    renderDashboardProjectInfo();
    populateProjectSettingsForm();
  } catch (error) {
    console.error("Failed to load projects:", error);
  }
}

// Render Projects
function renderProjects() {
  if (!projectsList) return;

  projectsList.innerHTML = "";
  
  // Color logic for project icons
  const colors = ["#6366f1", "#f97316", "#ec4899", "#10b981", "#06b6d4", "#eab308"];

  allProjects.forEach((project, index) => {
    const li = document.createElement("li");
    li.className = "project-item";
    if (currentProject && currentProject.id === project.id) {
      li.classList.add("active");
    }

    const color = colors[index % colors.length];

    li.innerHTML = `
      <div class="project-icon" style="background-color: ${color}"></div>
      <span>${escapeHtml(project.name)}</span>
    `;

    li.addEventListener("click", () => selectProject(project.id));
    projectsList.appendChild(li);
  });
}

function formatVisibilityLabel(value) {
  if (!value) return "Unknown";
  if (value === "all") return "All users";
  if (value === "private") return "Private";
  if (value === "selected") return "Selected users";
  return value;
}

function renderDashboardProjectInfo() {
  if (!projectOverviewName) return;

  if (!currentProject) {
    projectOverviewName.textContent = "Select a project";
    if (projectOverviewDescription) {
      projectOverviewDescription.textContent = "Choose a project from the sidebar to view details.";
    }
    if (projectOverviewVisibility) {
      projectOverviewVisibility.textContent = "Visibility: --";
    }
    if (projectOverviewOwner) {
      projectOverviewOwner.textContent = "Owner: --";
    }
    return;
  }

  projectOverviewName.textContent = currentProject.name;
  if (projectOverviewDescription) {
    projectOverviewDescription.textContent = currentProject.description || "No description provided.";
  }
  if (projectOverviewVisibility) {
    projectOverviewVisibility.textContent = `Visibility: ${formatVisibilityLabel(currentProject.visibility)}`;
  }
  if (projectOverviewOwner) {
    const owner = allUsers.find((user) => user.id === currentProject.owner_id);
    const ownerName = owner ? owner.username : `User #${currentProject.owner_id}`;
    projectOverviewOwner.textContent = `Owner: ${ownerName}`;
  }
}

// Select Project
async function selectProject(projectId) {
  currentProject = allProjects.find((p) => p.id === projectId);
  if (!currentProject) return;

  renderProjects(); // Update active state
  await loadTasks(projectId);
  renderDashboardProjectInfo();
  populateProjectSettingsForm();
  
  // If taskboard is active, re-render it
  if (taskboardView && !taskboardView.classList.contains("hidden")) {
      renderTaskBoard();
  }
}

// Load Tasks
async function loadTasks(projectId) {
  try {
    allTasks = await apiRequest(`/projects/${projectId}/tasks`);
    renderTaskBoard();
  } catch (error) {
    console.error("Failed to load tasks:", error);
  }
}

// Render Task Board
function renderTaskBoard() {
  const statuses = ["new_task", "scheduled", "in_progress", "completed"];

  statuses.forEach((status) => {
    const container = document.querySelector(`.tasks-container[data-status="${status}"]`);
    const countEl = document.querySelector(`.task-count[data-status="${status}"]`);

    if (!container) return;

    const tasks = allTasks.filter((task) => task.status === status);

    // Update count
    if (countEl) {
      countEl.textContent = tasks.length;
    }

    // Clear container
    container.innerHTML = "";

    // Render tasks
    tasks.forEach((task) => {
      const taskCard = createTaskCard(task);
      container.appendChild(taskCard);
    });
  });
}

// Create Task Card
function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  card.dataset.taskId = task.id;

  // Get first assignee for avatar
  const firstAssignee = task.assignees && task.assignees[0];
  const avatarInitials = firstAssignee
    ? getInitials(firstAssignee.username)
    : "?";
  const avatarColor = firstAssignee
    ? `color-${firstAssignee.id % 8}`
    : "color-0";

  // Format due date
  let dueDateHtml = "";
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    now.setHours(0,0,0,0); // Compare dates only
    const isOverdue = dueDate < now && task.status !== "completed";
    const dueDateStr = formatDate(dueDate);

    dueDateHtml = `
      <div class="task-card-due ${isOverdue ? "overdue" : ""}">
        📅 ${dueDateStr}
      </div>
    `;
  }

  card.innerHTML = `
    <div class="task-card-header">
      <div class="task-avatar ${avatarColor}">${avatarInitials}</div>
      <div class="task-card-title">${escapeHtml(task.title)}</div>
    </div>
    ${dueDateHtml}
  `;

  card.addEventListener("click", () => openTaskDetail(task.id));

  return card;
}

// Open Task Detail Panel
async function openTaskDetail(taskId) {
  currentTask = allTasks.find((t) => t.id === taskId);
  if (!currentTask) return;

  // Load comments
  try {
    const comments = await apiRequest(`/tasks/${taskId}/comments`);
    currentTask.comments = comments;
  } catch (error) {
    console.error("Failed to load comments:", error);
    currentTask.comments = [];
  }

  renderTaskDetail();
  taskDetailPanel.classList.remove("hidden");
  taskDetailPanel.classList.add("visible");
}

// Render Task Detail
function renderTaskDetail() {
  if (!currentTask) return;

  // Title
  const titleInput = document.getElementById("task-title-input");
  if (titleInput) {
    titleInput.value = currentTask.title;
  }

  // Status
  const statusSelect = document.getElementById("task-status-select");
  if (statusSelect) {
    statusSelect.value = currentTask.status;
  }

  // Due Date
  const dueDateInput = document.getElementById("task-due-date");
  if (dueDateInput) {
    dueDateInput.value = currentTask.due_date
      ? new Date(currentTask.due_date).toISOString().split("T")[0]
      : "";
  }

  // Assignees
  const assigneesList = document.getElementById("task-assignees");
  if (assigneesList) {
    assigneesList.innerHTML = "";
    if (currentTask.assignees && currentTask.assignees.length > 0) {
      currentTask.assignees.forEach((assignee) => {
        const badge = createAssigneeBadge(assignee);
        assigneesList.appendChild(badge);
      });
    }
  }

  // Comments
  const commentsList = document.getElementById("comments-list");
  const commentsCount = document.getElementById("comments-count");
  if (commentsList) {
    commentsList.innerHTML = "";
    if (currentTask.comments && currentTask.comments.length > 0) {
      currentTask.comments.forEach((comment) => {
        const commentEl = createCommentElement(comment);
        commentsList.appendChild(commentEl);
      });
    }
  }
  if (commentsCount) {
    commentsCount.textContent = (currentTask.comments || []).length;
  }
}

// Create Assignee Badge
function createAssigneeBadge(assignee) {
  const badge = document.createElement("div");
  badge.className = "assignee-badge";

  const avatar = document.createElement("div");
  avatar.className = `assignee-avatar color-${assignee.id % 8}`;
  avatar.textContent = getInitials(assignee.username);

  const name = document.createElement("span");
  name.textContent = assignee.username;

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn-remove-assignee";
  removeBtn.innerHTML = "&times;";
  removeBtn.addEventListener("click", () => removeAssignee(assignee.id));

  badge.appendChild(avatar);
  badge.appendChild(name);
  badge.appendChild(removeBtn);

  return badge;
}

// Remove Assignee
async function removeAssignee(userId) {
  if (!currentTask) return;

  try {
    const newAssigneeIds = currentTask.assignees
      .filter((a) => a.id !== userId)
      .map((a) => a.id);

    const updated = await apiRequest(`/tasks/${currentTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ assignee_ids: newAssigneeIds }),
    });

    // Update task in local list
    allTasks = allTasks.map(t => t.id === updated.id ? updated : t);
    currentTask = updated;
    
    renderTaskBoard();
    renderTaskDetail();
  } catch (error) {
    alert("Failed to remove assignee: " + error.message);
  }
}

// Create Comment Element
function createCommentElement(comment) {
  const div = document.createElement("div");
  div.className = "comment-item";

  const timeAgo = getTimeAgo(new Date(comment.created_at));

  div.innerHTML = `
    <div class="comment-avatar color-${comment.author.id % 8}">
      ${getInitials(comment.author.username)}
    </div>
    <div class="comment-content">
      <div class="comment-meta">
        <span class="comment-author">${escapeHtml(comment.author.username)}</span>
        <span class="comment-time">${timeAgo}</span>
      </div>
      <div class="comment-text">${escapeHtml(comment.content)}</div>
    </div>
  `;

  return div;
}

// Close Task Detail Panel
function closeTaskDetail() {
  taskDetailPanel.classList.remove("visible");
  taskDetailPanel.classList.add("hidden");
  currentTask = null;
}

// Update Task Title
async function updateTaskTitle() {
  if (!currentTask) return;

  const titleInput = document.getElementById("task-title-input");
  const newTitle = titleInput.value.trim();

  if (!newTitle || newTitle === currentTask.title) {
    titleInput.value = currentTask.title; // Revert if empty
    return;
  }

  try {
    const updated = await apiRequest(`/tasks/${currentTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: newTitle }),
    });

    // Update task in local list
    allTasks = allTasks.map(t => t.id === updated.id ? updated : t);
    currentTask = updated;

    renderTaskBoard();
  } catch (error) {
    alert("Failed to update task title: " + error.message);
    titleInput.value = currentTask.title; // Revert on error
  }
}

// Update Task Status
async function updateTaskStatus(newStatus) {
  if (!currentTask) return;

  try {
    const updated = await apiRequest(`/tasks/${currentTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });

    // Update task in local list
    allTasks = allTasks.map(t => t.id === updated.id ? updated : t);
    currentTask = updated;
    
    renderTaskBoard();
    renderTaskDetail();
  } catch (error)
  {
    alert("Failed to update task status: " + error.message);
    // Revert select
    const statusSelect = document.getElementById("task-status-select");
    if (statusSelect) {
        statusSelect.value = currentTask.status;
    }
  }
}

// Update Task Due Date
async function updateTaskDueDate(dueDate) {
  if (!currentTask) return;

  try {
    const updated = await apiRequest(`/tasks/${currentTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ due_date: dueDate || null }),
    });

    // Update task in local list
    allTasks = allTasks.map(t => t.id === updated.id ? updated : t);
    currentTask = updated;

    renderTaskBoard();
  } catch (error) {
    alert("Failed to update task due date: " + error.message);
  }
}

// Delete Task
async function deleteTask() {
  if (!currentTask) return;

  if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;

  try {
    await apiRequest(`/tasks/${currentTask.id}`, { method: "DELETE" });
    
    // Remove from local list
    allTasks = allTasks.filter(t => t.id !== currentTask.id);
    
    renderTaskBoard();
    dependencyDataLoaded = false; // Dependencies will change
    closeTaskDetail();
  } catch (error) {
    alert("Failed to delete task: " + error.message);
  }
}

// Add Comment
async function addComment(content) {
  if (!currentTask || !content.trim()) return;

  try {
    await apiRequest("/comments", {
      method: "POST",
      body: JSON.stringify({
        task_id: currentTask.id,
        content: content.trim(),
      }),
    });

    // Reload comments
    const comments = await apiRequest(`/tasks/${currentTask.id}/comments`);
    currentTask.comments = comments;
    renderTaskDetail();

    // Clear input
    const commentInput = document.getElementById("comment-input");
    if (commentInput) {
      commentInput.value = "";
    }
  } catch (error) {
    alert("Failed to add comment: " + error.message);
  }
}

// Show Modal
function showModal(modal) {
  modal.classList.remove("hidden");
}

// Hide Modal
function hideModal(modal) {
  modal.classList.add("hidden");
  if (modal === modalUserSelector) {
    userSelectorCallback = null;
    selectedUserIds = [];
  }
}

// Open User Selector
function openUserSelector(callback, multiSelect = true, preselectedIds = []) {
  userSelectorCallback = callback;
  selectedUserIds = [...preselectedIds];

  const applyButton = document.getElementById('btn-user-selector-apply');
  if (applyButton) {
      applyButton.style.display = multiSelect ? 'inline-block' : 'none';
  }

  renderUserList(multiSelect);
  showModal(modalUserSelector);
}

// Render User List
function renderUserList(multiSelect) {
  const userList = document.getElementById("user-list");
  if (!userList) return;

  userList.innerHTML = "";

  // Add "All Users" option if multi-select
  if (multiSelect) {
    const allUsersItem = document.createElement("div");
    allUsersItem.className = "user-item all-users";
    allUsersItem.innerHTML = `
      <div class="user-item-avatar color-0">AL</div>
      <div class="user-item-info">
        <div class="user-item-name">All Users</div>
        <div class="user-item-email">Select all users in the list</div>
      </div>
      <input type="checkbox" class="user-item-checkbox" id="user-all" />
    `;

    const checkbox = allUsersItem.querySelector("#user-all");
    const allIds = allUsers.map(u => u.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedUserIds.includes(id));
    
    if (allSelected) {
        checkbox.checked = true;
    }

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedUserIds = [...new Set([...selectedUserIds, ...allUsers.map((u) => u.id)])];
      } else {
        selectedUserIds = []; // Deselect all
      }
      renderUserList(multiSelect); // Re-render to update checks
    });

    userList.appendChild(allUsersItem);
  }

  // Add individual users
  allUsers.forEach((user) => {
    const item = document.createElement("div");
    item.className = "user-item";
    item.dataset.userId = user.id;

    const isChecked = selectedUserIds.includes(user.id);

    item.innerHTML = `
      <div class="user-item-avatar color-${user.id % 8}">
        ${getInitials(user.username)}
      </div>
      <div class="user-item-info">
        <div class="user-item-name">${escapeHtml(user.username)}</div>
        <div class="user-item-email">${escapeHtml(user.email)}</div>
      </div>
      <input type="checkbox" class="user-item-checkbox" ${isChecked ? "checked" : ""} />
    `;

    const checkbox = item.querySelector(".user-item-checkbox");
    
    const toggleUser = () => {
        if (checkbox.checked) {
            if (multiSelect) {
                if (!selectedUserIds.includes(user.id)) {
                    selectedUserIds.push(user.id);
                }
            } else {
                selectedUserIds = [user.id];
            }
        } else {
            selectedUserIds = selectedUserIds.filter((id) => id !== user.id);
        }

        if (!multiSelect) {
            // Close modal immediately for single select
            if (userSelectorCallback) {
                userSelectorCallback(selectedUserIds);
            }
            hideModal(modalUserSelector);
        } else {
            // Update "All Users" checkbox state if it exists
            const allCheckbox = document.getElementById('user-all');
            if (allCheckbox) {
                const allIds = allUsers.map(u => u.id);
                const allSelected = allIds.length > 0 && allIds.every(id => selectedUserIds.includes(id));
                allCheckbox.checked = allSelected;
            }
        }
    };

    checkbox.addEventListener("change", toggleUser);
    item.addEventListener("click", (e) => {
        if (e.target.tagName !== "INPUT") {
            checkbox.checked = !checkbox.checked;
            toggleUser();
        }
    });

    userList.appendChild(item);
  });
}

// Create Project
async function createProject(formData) {
  try {
    const name = formData.get("name");
    const description = formData.get("description");
    const visibility = formData.get("visibility");

    const payload = {
      name,
      description: description || "",
      visibility,
      shared_usernames: [],
    };

    if (visibility === "selected" && projectCreationUserIds.length > 0) {
      const selectedUsers = allUsers.filter((u) => projectCreationUserIds.includes(u.id));
      payload.shared_usernames = selectedUsers.map((u) => u.username);
    }

    const newProject = await apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await loadProjects();
    hideModal(modalCreateProject);
    
    // Select the new project
    selectProject(newProject.id);
    showTabView('dashboard');

    // Reset form
    document.getElementById("form-create-project").reset();
    projectCreationUserIds = [];
    selectedUserIds = [];
    updateSelectedUsers("selected-project-users", projectCreationUserIds);
  } catch (error) {
    alert("Failed to create project: " + error.message);
  }
}

// Create Task
async function createTask(formData) {
  if (!currentProject) {
    alert("Please select a project first");
    return;
  }

  try {
    const title = formData.get("title");
    const description = formData.get("description");
    const status = formData.get("status");
    const dueDate = formData.get("due_date");

    const payload = {
      project_id: currentProject.id,
      title,
      description: description || "",
      status,
      due_date: dueDate || null,
      assignee_ids: taskCreationAssigneeIds,
    };

    await apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await loadTasks(currentProject.id);
    dependencyDataLoaded = false;
    hideModal(modalAddTask);

    // Reset form
    document.getElementById("form-add-task").reset();
    taskCreationAssigneeIds = [];
    selectedUserIds = [];
    updateSelectedUsers("selected-task-assignees", taskCreationAssigneeIds);
  } catch (error) {
    alert("Failed to create task: " + error.message);
  }
}

// Update Selected Users Display
function updateSelectedUsers(containerId, userIds = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (!userIds || userIds.length === 0) {
    container.innerHTML = '<span style="color: #94a3b8; font-size: 13px;">No users selected</span>';
    return;
  }

  userIds.forEach((userId) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;

    const badge = document.createElement("div");
    badge.className = "assignee-badge";

    const avatar = document.createElement("div");
    avatar.className = `assignee-avatar color-${user.id % 8}`;
    avatar.textContent = getInitials(user.username);

    const name = document.createElement("span");
    name.textContent = user.username;

    badge.appendChild(avatar);
    badge.appendChild(name);
    container.appendChild(badge);
  });
}

// Utility Functions
function escapeHtml(text) {
  if (text === null || typeof text === 'undefined') {
    return "";
  }
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function getInitials(name) {
    if (!name) return "?";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}


function formatDate(date) {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  
  // Clear time part of d for accurate date comparison
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  
  const diff = d - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days > 1 && days < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  if (days > 0) return `in ${days} days`;
  if (days < -1) return `${Math.abs(days)} days ago`;

  // Default for past dates or far future
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return "just now";
}

// Event Listeners
if (logoutBtn) {
  logoutBtn.addEventListener("click", logoutUser);
}

if (btnAddProject) {
  btnAddProject.addEventListener("click", () => {
    projectCreationUserIds = []; // Start fresh
    selectedUserIds = [];
    updateSelectedUsers("selected-project-users", projectCreationUserIds);
    // Reset form
    document.getElementById("form-create-project").reset();
    document.getElementById("project-users-wrapper").classList.add("hidden");
    
    showModal(modalCreateProject);
  });
}

function populateProjectSettingsForm() {
  if (!projectSettingsForm) return;

  if (!currentProject) {
    projectSettingsForm.reset();
    projectSettingsUserIds = [];
    updateSelectedUsers("project-settings-users", projectSettingsUserIds);
    if (projectSettingsUsersWrapper) {
      projectSettingsUsersWrapper.classList.add("hidden");
    }
    if (projectSettingsMessage) {
      projectSettingsMessage.textContent = "Select a project to edit its settings.";
      projectSettingsMessage.style.color = "";
    }
    Array.from(projectSettingsForm.querySelectorAll("input, textarea, select, button"))
      .forEach((el) => {
        el.disabled = true;
      });
    return;
  }

  if (projectSettingsNameInput) {
    projectSettingsNameInput.value = currentProject.name;
  }
  if (projectSettingsDescriptionInput) {
    projectSettingsDescriptionInput.value = currentProject.description || "";
  }
  if (projectSettingsVisibilitySelect) {
    projectSettingsVisibilitySelect.value = currentProject.visibility;
  }

  const isOwner = currentUser && currentProject.owner_id === currentUser.id;
  const shouldShowUsers = projectSettingsVisibilitySelect.value === "selected";
  if (projectSettingsUsersWrapper) {
    if (shouldShowUsers) {
      projectSettingsUsersWrapper.classList.remove("hidden");
    } else {
      projectSettingsUsersWrapper.classList.add("hidden");
    }
  }

  projectSettingsUserIds = (currentProject.shared_users || []).map((user) => user.id);
  updateSelectedUsers("project-settings-users", projectSettingsUserIds);

  Array.from(projectSettingsForm.querySelectorAll("input, textarea, select, button"))
    .forEach((el) => {
      el.disabled = !isOwner;
    });

  if (projectSettingsMessage) {
    projectSettingsMessage.textContent = isOwner
      ? "Update the project settings."
      : "Only the project owner can update settings.";
    projectSettingsMessage.style.color = "";
  }
}

async function handleProjectSettingsSubmit(event) {
  event.preventDefault();
  if (!currentProject) {
    alert("Select a project before updating settings.");
    return;
  }
  if (!currentUser || currentProject.owner_id !== currentUser.id) {
    alert("Only the project owner can update settings.");
    return;
  }

  const name = projectSettingsNameInput ? projectSettingsNameInput.value.trim() : currentProject.name;
  const description = projectSettingsDescriptionInput
    ? projectSettingsDescriptionInput.value.trim()
    : currentProject.description || "";
  const visibility = projectSettingsVisibilitySelect
    ? projectSettingsVisibilitySelect.value
    : currentProject.visibility;

  const payload = {
    name: name || currentProject.name,
    description,
    visibility,
    shared_usernames: [],
  };

  if (visibility === "selected" && projectSettingsUserIds.length > 0) {
    const selectedUsers = allUsers.filter((user) => projectSettingsUserIds.includes(user.id));
    payload.shared_usernames = selectedUsers.map((user) => user.username);
  }

  try {
    const projectId = currentProject.id;
    await apiRequest(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    dependencyDataLoaded = false;
    await loadProjects();
    
    // Reselect current project to get updated data
    currentProject = allProjects.find(p => p.id === projectId);
    
    populateProjectSettingsForm(); // Re-populate with fresh data
    renderDashboardProjectInfo(); // Update dashboard card
    
    if (projectSettingsMessage) {
      projectSettingsMessage.textContent = "Project settings updated successfully.";
      projectSettingsMessage.style.color = "#10b981"; // Green
    }
  } catch (error) {
    alert("Failed to update project: " + error.message);
    if (projectSettingsMessage) {
      projectSettingsMessage.textContent = "Failed to update: " + error.message;
      projectSettingsMessage.style.color = "#ef4444"; // Red
    }
  }
}

async function loadDependencyData(force = false) {
  if (dependencyDataLoaded && !force) {
    renderDependencyView();
    return;
  }
  try {
    dependencyMapData = await apiRequest("/dependency-map");
    dependencyDataLoaded = true;
    renderDependencyView();
  } catch (error) {
    dependencyDataLoaded = false;
    if (dependencyStatusText) {
      dependencyStatusText.textContent = error.message;
    }
  }
}

function buildDependencyTaskLabel(task) {
  return `${task.title} (${task.project_name})`;
}

function renderDependencyView() {
  if (!dependencyView) return;

  const hasTasks = dependencyMapData && dependencyMapData.tasks && dependencyMapData.tasks.length > 0;
  if (!hasTasks) {
    if (dependencyDependentSelect) {
      dependencyDependentSelect.innerHTML = '<option value="">No tasks available</option>';
      dependencyDependentSelect.disabled = true;
    }
    if (dependencyDependsOnSelect) {
      dependencyDependsOnSelect.innerHTML = '<option value="">No tasks available</option>';
      dependencyDependsOnSelect.disabled = true;
    }
    if (dependencyStatusText) {
      dependencyStatusText.textContent = "Create tasks to start building the dependency map.";
    }
    if (dependencyChainsContainer) dependencyChainsContainer.innerHTML = "<p>No tasks available.</p>";
    if (dependencyConvergenceContainer) dependencyConvergenceContainer.innerHTML = "<p>No tasks available.</p>";
    if (dependencyEdgesContainer) dependencyEdgesContainer.innerHTML = "<p>No tasks available.</p>";
    
    // Clear graph
    renderVisGraph(null);
    return;
  }

  const tasks = [...dependencyMapData.tasks].sort((a, b) => {
    if (a.project_name.toLowerCase() === b.project_name.toLowerCase()) {
      return a.title.localeCompare(b.title);
    }
    return a.project_name.localeCompare(b.project_name);
  });

  if (dependencyDependentSelect && dependencyDependsOnSelect) {
    const optionsHtml = tasks
      .map((task) => `<option value="${task.id}">${escapeHtml(buildDependencyTaskLabel(task))}</option>`)
      .join("");
    dependencyDependentSelect.innerHTML = `<option value="">Dependent task...</option>${optionsHtml}`;
    dependencyDependsOnSelect.innerHTML = `<option value="">Depends on...</option>${optionsHtml}`;
    dependencyDependentSelect.disabled = false;
    dependencyDependsOnSelect.disabled = false;
  }

  if (dependencyStatusText) {
    dependencyStatusText.textContent = dependencyMapData.edges.length === 0
      ? "No dependencies defined yet."
      : "";
  }

  if (dependencyChainsContainer) {
    dependencyChainsContainer.innerHTML = "";
    if (dependencyMapData.chains.length === 0) {
      dependencyChainsContainer.innerHTML = "<p>No linear chains detected.</p>";
    } else {
      dependencyMapData.chains.forEach((chain) => {
        const card = document.createElement("div");
        card.className = "dependency-card";
        card.textContent = chain.tasks
          .map((task) => buildDependencyTaskLabel(task))
          .join(" → ");
        dependencyChainsContainer.appendChild(card);
      });
    }
  }

  if (dependencyConvergenceContainer) {
    dependencyConvergenceContainer.innerHTML = "";
    if (dependencyMapData.convergences.length === 0) {
      dependencyConvergenceContainer.innerHTML = "<p>No converging dependencies detected.</p>";
    } else {
      dependencyMapData.convergences.forEach((group) => {
        const card = document.createElement("div");
        card.className = "dependency-card";
        const sources = group.sources.map((task) => buildDependencyTaskLabel(task)).join(", ");
        card.textContent = `${sources} → ${buildDependencyTaskLabel(group.target)}`;
        dependencyConvergenceContainer.appendChild(card);
      });
    }
  }

  if (dependencyEdgesContainer) {
    dependencyEdgesContainer.innerHTML = "";
    if (dependencyMapData.edges.length === 0) {
      dependencyEdgesContainer.innerHTML = "<p>No direct dependencies defined.</p>";
    } else {
      dependencyMapData.edges.forEach((edge) => {
        const row = document.createElement("div");
        row.className = "dependency-edge-row";
        row.innerHTML = `
          <span>${escapeHtml(buildDependencyTaskLabel(edge.depends_on))} → ${escapeHtml(
          buildDependencyTaskLabel(edge.dependent)
        )}</span>
          <button class="btn-secondary btn-small" data-dependency-id="${edge.id}">Remove</button>
        `;
        const btn = row.querySelector("button");
        btn.addEventListener("click", () => deleteDependencyLink(edge.id));
        dependencyEdgesContainer.appendChild(row);
      });
    }
  }
  
  // ADDED: Render the visual graph
  renderVisGraph(dependencyMapData);
}

// ADDED: New function to render the vis.js graph
function renderVisGraph(data) {
  const container = document.getElementById("vis-graph-container");
  if (!container) return;

  if (!data || !data.tasks || data.tasks.length === 0) {
    container.innerHTML = "<p style='padding: 20px; text-align: center; color: #94a3b8;'>No tasks to display in graph.</p>";
    return;
  }

  // 1. Create nodes
  const nodes = new vis.DataSet(
    data.tasks.map(task => ({
      id: task.id,
      label: `${task.title}\n(${task.project_name})`,
      group: task.project_id, // Group nodes by project
    }))
  );

  // 2. Create edges
  const edges = new vis.DataSet(
    data.edges.map(edge => ({
      from: edge.depends_on.id,
      to: edge.dependent.id,
      arrows: "to",
    }))
  );

  // 3. Provide the data
  const graphData = {
    nodes: nodes,
    edges: edges,
  };

  // 4. Define options
  const options = {
    layout: {
      hierarchical: {
        direction: "LR", // Left-to-Right
        sortMethod: "directed",
        levelSeparation: 200,
        nodeSpacing: 100,
      },
    },
    edges: {
      smooth: {
        type: 'cubicBezier',
        forceDirection: 'horizontal',
        roundness: 0.4
      },
      color: {
          color: '#848484',
          highlight: '#6366f1',
          hover: '#6366f1'
      }
    },
    nodes: {
      shape: 'box',
      margin: 10,
      widthConstraint: {
          maximum: 200,
      },
      font: {
        size: 12,
        face: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      },
      borderWidth: 1,
      color: {
          border: '#e2e8f0',
          background: '#ffffff',
          highlight: {
              border: '#6366f1',
              background: '#eef2ff'
          }
      }
    },
    physics: {
      enabled: false, // Disable physics for faster hierarchical layout
    },
    interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true
    }
  };

  // 5. Initialize the Network
  const network = new vis.Network(container, graphData, options);
}


async function handleAddDependency(event) {
  event.preventDefault();
  if (!dependencyDependentSelect || !dependencyDependsOnSelect) return;

  const dependentId = parseInt(dependencyDependentSelect.value, 10);
  const dependsOnId = parseInt(dependencyDependsOnSelect.value, 10);

  if (!dependentId || !dependsOnId) {
    alert("Please select both tasks to create a dependency.");
    return;
  }
  if (dependentId === dependsOnId) {
    alert("A task cannot depend on itself.");
    return;
  }

  try {
    await apiRequest("/task-dependencies", {
      method: "POST",
      body: JSON.stringify({
        dependent_task_id: dependentId,
        depends_on_task_id: dependsOnId,
      }),
    });
    if (dependencyStatusText) {
      dependencyStatusText.textContent = "Dependency created.";
    }
    await loadDependencyData(true);
    event.target.reset();
  } catch (error) {
    alert("Failed to create dependency: " + error.message);
  }
}

async function deleteDependencyLink(dependencyId) {
  if (!confirm("Remove this dependency?")) return;
  try {
    await apiRequest(`/task-dependencies/${dependencyId}`, { method: "DELETE" });
    if (dependencyStatusText) {
      dependencyStatusText.textContent = "Dependency removed.";
    }
    await loadDependencyData(true);
  } catch (error) {
    alert("Failed to remove dependency: " + error.message);
  }
}

async function loadNotifications(force = false) {
  if (notificationsLoaded && !force) {
    renderNotifications();
    return;
  }
  try {
    notifications = await apiRequest("/notifications");
    notificationsLoaded = true;
    renderNotifications();
  } catch (error) {
    notificationsLoaded = false;
    if (notificationsList) {
      notificationsList.innerHTML = `<li class="notification-item">${escapeHtml(error.message)}</li>`;
    }
  }
}

function renderNotifications() {
  if (!notificationsList) return;
  notificationsList.innerHTML = "";

  if (!notifications || notifications.length === 0) {
    const empty = document.createElement("li");
    empty.className = "notification-item empty";
    empty.textContent = "You're all caught up!";
    notificationsList.appendChild(empty);
    return;
  }

  notifications.forEach((notification) => {
    const item = document.createElement("li");
    item.className = "notification-item";
    if (!notification.read) {
      item.classList.add("unread");
    }
    
    // Add data attributes for linking
    if (notification.task_id) {
        item.dataset.taskId = notification.task_id;
    }
    if (notification.project_id) {
        item.dataset.projectId = notification.project_id;
    }

    const locationBits = [];
    if (notification.project_name) {
      locationBits.push(notification.project_name);
    }
    if (notification.task_title) {
      locationBits.push(notification.task_title);
    }
    const location = locationBits.length > 0 ? ` • ${locationBits.join(" → ")}` : "";

    item.innerHTML = `
      <div>
        <p class="notification-message">${escapeHtml(notification.message)}${escapeHtml(location)}</p>
        <span class="notification-time">${new Date(notification.created_at).toLocaleString()}</span>
      </div>
    `;

    if (!notification.read) {
      const btn = document.createElement("button");
      btn.className = "btn-secondary btn-small";
      btn.textContent = "Mark as read";
      btn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent click bleed
          markNotificationRead(notification.id);
      });
      item.appendChild(btn);
    }

    notificationsList.appendChild(item);
  });
}

async function markNotificationRead(notificationId) {
  try {
    const updated = await apiRequest(`/notifications/${notificationId}/read`, {
      method: "POST",
    });
    notifications = notifications.map((n) => (n.id === notificationId ? updated : n));
    renderNotifications();
  } catch (error) {
    alert("Failed to update notification: " + error.message);
  }
}

if (btnAddTask) {
  btnAddTask.addEventListener("click", () => {
    if (!currentProject) {
      alert("Please select a project first");
      return;
    }
    // Reset form
    document.getElementById("form-add-task").reset();
    
    // Set default status
    const statusSelect = document.getElementById("new-task-status");
    if (statusSelect) {
        statusSelect.value = "new_task";
    }

    taskCreationAssigneeIds = [];
    selectedUserIds = [];
    updateSelectedUsers("selected-task-assignees", taskCreationAssigneeIds);
    
    showModal(modalAddTask);
  });
}

function showTabView(tabName) {
  const views = [taskboardView, dashboardView, dependencyView, notificationsView];
  views.forEach((view) => {
    if (view) {
      view.classList.add("hidden");
    }
  });

  if (tabName === "taskboard" && taskboardView) {
    taskboardView.classList.remove("hidden");
    if (!currentProject) {
        taskboardView.innerHTML = '<p style="padding: 40px; text-align: center; color: #94a3b8;">Please select a project to see tasks.</p>'
    } else {
        renderTaskBoard(); // Ensure board is rendered
    }
  } else if (tabName === "dashboard" && dashboardView) {
    dashboardView.classList.remove("hidden");
  } else if (tabName === "dependency" && dependencyView) {
    dependencyView.classList.remove("hidden");
    loadDependencyData(true); // Always refresh
  } else if (tabName === "notifications" && notificationsView) {
    notificationsView.classList.remove("hidden");
    loadNotifications(true); // Always refresh
  }
  
  // Update active tab
   tabs.forEach((t) => {
       if (t.dataset.tab === tabName) {
           t.classList.add("active");
       } else {
           t.classList.remove("active");
       }
   });
}

// Tab Navigation
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;
    showTabView(tabName);
  });
});

// Modal Close Buttons
document.querySelectorAll(".btn-close, .modal-cancel").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modal = btn.closest(".modal");
    if (modal) {
        hideModal(modal);
    }
  });
});

// Close modal on background click
document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      hideModal(modal);
    }
  });
});

// Create Project Form
const formCreateProject = document.getElementById("form-create-project");
if (formCreateProject) {
  formCreateProject.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(formCreateProject);
    await createProject(formData);
  });

  // Visibility change
  const visibilitySelect = document.getElementById("project-visibility");
  const usersWrapper = document.getElementById("project-users-wrapper");
  if (visibilitySelect && usersWrapper) {
    visibilitySelect.addEventListener("change", () => {
      if (visibilitySelect.value === "selected") {
        usersWrapper.classList.remove("hidden");
      } else {
        usersWrapper.classList.add("hidden");
      }
    });
  }

  // Select users button
  const btnSelectProjectUsers = document.getElementById("btn-select-project-users");
  if (btnSelectProjectUsers) {
    btnSelectProjectUsers.addEventListener("click", () => {
      openUserSelector((userIds) => {
        projectCreationUserIds = userIds;
        updateSelectedUsers("selected-project-users", projectCreationUserIds);
      }, true, projectCreationUserIds);
    });
  }
}

// Add Task Form
const formAddTask = document.getElementById("form-add-task");
if (formAddTask) {
  formAddTask.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(formAddTask);
    await createTask(formData);
  });

  // Select assignees button
  const btnSelectTaskAssignees = document.getElementById("btn-select-task-assignees");
  if (btnSelectTaskAssignees) {
    btnSelectTaskAssignees.addEventListener("click", () => {
      openUserSelector((userIds) => {
        taskCreationAssigneeIds = userIds;
        updateSelectedUsers("selected-task-assignees", taskCreationAssigneeIds);
      }, true, taskCreationAssigneeIds);
    });
  }
}

if (projectSettingsForm) {
  projectSettingsForm.addEventListener("submit", handleProjectSettingsSubmit);
}

if (projectSettingsVisibilitySelect && projectSettingsUsersWrapper) {
  projectSettingsVisibilitySelect.addEventListener("change", () => {
    const shouldShow = projectSettingsVisibilitySelect.value === "selected";
    if (shouldShow) {
      projectSettingsUsersWrapper.classList.remove("hidden");
    } else {
      projectSettingsUsersWrapper.classList.add("hidden");
    }
  });
}

if (btnProjectSettingsUsers) {
  btnProjectSettingsUsers.addEventListener("click", () => {
    if (!currentProject || !currentUser || currentProject.owner_id !== currentUser.id) return;
    openUserSelector((userIds) => {
      projectSettingsUserIds = userIds;
      updateSelectedUsers("project-settings-users", projectSettingsUserIds);
    }, true, projectSettingsUserIds);
  });
}

const formAddDependency = document.getElementById("form-add-dependency");
if (formAddDependency) {
  formAddDependency.addEventListener("submit", handleAddDependency);
}

if (btnRefreshNotifications) {
  btnRefreshNotifications.addEventListener("click", () => loadNotifications(true));
}

const btnUserSelectorApply = document.getElementById("btn-user-selector-apply");
if (btnUserSelectorApply) {
  btnUserSelectorApply.addEventListener("click", () => {
    if (userSelectorCallback) {
      userSelectorCallback([...selectedUserIds]);
    }
    hideModal(modalUserSelector);
  });
}

const btnUserSelectorCancel = document.getElementById("btn-user-selector-cancel");
if (btnUserSelectorCancel) {
  btnUserSelectorCancel.addEventListener("click", () => {
    hideModal(modalUserSelector);
  });
}

// Task Detail Panel Events
const btnClosePanel = document.getElementById("btn-close-panel");
if (btnClosePanel) {
  btnClosePanel.addEventListener("click", closeTaskDetail);
}

const taskTitleInput = document.getElementById("task-title-input");
if (taskTitleInput) {
  taskTitleInput.addEventListener("blur", updateTaskTitle);
  taskTitleInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      taskTitleInput.blur();
    }
  });
}

const taskStatusSelect = document.getElementById("task-status-select");
if (taskStatusSelect) {
  taskStatusSelect.addEventListener("change", () => {
    updateTaskStatus(taskStatusSelect.value);
  });
}

const taskDueDateInput = document.getElementById("task-due-date");
if (taskDueDateInput) {
  taskDueDateInput.addEventListener("change", () => {
    updateTaskDueDate(taskDueDateInput.value);
  });
}

const btnDeleteTask = document.getElementById("btn-delete-task");
if (btnDeleteTask) {
  btnDeleteTask.addEventListener("click", deleteTask);
}

const btnAddAssignee = document.getElementById("btn-add-assignee");
if (btnAddAssignee) {
  btnAddAssignee.addEventListener("click", () => {
    if (!currentTask) return;

    const currentAssigneeIds = currentTask.assignees.map((a) => a.id);
    openUserSelector(async (userIds) => {
      try {
        const updated = await apiRequest(`/tasks/${currentTask.id}`, {
          method: "PATCH",
          body: JSON.stringify({ assignee_ids: userIds }),
        });

        // Update task in local list
        allTasks = allTasks.map(t => t.id === updated.id ? updated : t);
        currentTask = updated;
        
        renderTaskBoard();
        renderTaskDetail();
      } catch (error) {
        alert("Failed to update assignees: " + error.message);
      }
    }, true, currentAssigneeIds);
  });
}

// Add Comment Form
const formAddComment = document.getElementById("form-add-comment");
if (formAddComment) {
  formAddComment.addEventListener("submit", async (e) => {
    e.preventDefault();
    const commentInput = document.getElementById("comment-input");
    if (commentInput) {
      await addComment(commentInput.value);
    }
  });
}

// User Search in Modal
const userSearchInput = document.getElementById("user-search");
if (userSearchInput) {
  userSearchInput.addEventListener("input", () => {
    const query = userSearchInput.value.toLowerCase();
    const userItems = document.querySelectorAll("#user-list .user-item:not(.all-users)");

    userItems.forEach((item) => {
      const name = item.querySelector(".user-item-name").textContent.toLowerCase();
      const email = item.querySelector(".user-item-email").textContent.toLowerCase();

      if (name.includes(query) || email.includes(query)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  });
}

// Initialize on load
initializeApp();