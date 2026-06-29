import { loadState, saveState, updateState } from "../storage/store.js";
import { createTask, parseTags, priorityRank, searchableText } from "../services/tasks.js";
import { exportBackup, importBackup } from "../services/backup.js";
import { applyTheme, toggleTheme } from "../services/theme.js";
import { statCard } from "../components/statCard.js";
import { formatDateTime, formatRemaining, getDeadline, isOverdue, isToday, now, uid } from "../utils/time.js";
import { faviconFor, hostLabel, normalizeUrl } from "../utils/url.js";

let state = await loadState();
let activeTaskId = null;
let showAllCompleted = false;

const COMPLETED_PREVIEW_LIMIT = 3;
const PROJECT_ALERT_MS = 60 * 60 * 60 * 1000;

const $ = (selector) => document.querySelector(selector);

const elements = {
  dashboard: $("#dashboard"),
  progressLabel: $("#progressLabel"),
  progressFill: $("#progressFill"),
  themeToggle: $("#themeToggle"),
  searchInput: $("#searchInput"),
  taskTypeSelect: $("#taskTypeSelect"),
  listSelect: $("#listSelect"),
  sortSelect: $("#sortSelect"),
  dateFilter: $("#dateFilter"),
  customDateFilter: $("#customDateFilter"),
  addListBtn: $("#addListBtn"),
  deleteListBtn: $("#deleteListBtn"),
  addTaskToggle: $("#addTaskToggle"),
  taskForm: $("#taskForm"),
  cancelTaskBtn: $("#cancelTaskBtn"),
  taskTitle: $("#taskTitle"),
  taskDate: $("#taskDate"),
  taskTime: $("#taskTime"),
  taskPriority: $("#taskPriority"),
  taskReminder: $("#taskReminder"),
  customReminder: $("#customReminder"),
  taskDescription: $("#taskDescription"),
  taskUrlTitle: $("#taskUrlTitle"),
  taskUrl: $("#taskUrl"),
  taskTags: $("#taskTags"),
  taskColor: $("#taskColor"),
  taskList: $("#taskList"),
  exportBtn: $("#exportBtn"),
  importInput: $("#importInput"),
  taskDialog: $("#taskDialog"),
  editForm: $("#editForm"),
  editTitle: $("#editTitle"),
  editDescription: $("#editDescription"),
  editDate: $("#editDate"),
  editTime: $("#editTime"),
  editTaskType: $("#editTaskType"),
  editStatus: $("#editStatus"),
  editPriority: $("#editPriority"),
  editColor: $("#editColor"),
  editTags: $("#editTags"),
  completionPanel: $("#completionPanel"),
  editCompletionPreset: $("#editCompletionPreset"),
  editCompletionComment: $("#editCompletionComment"),
  commentsList: $("#commentsList"),
  newComment: $("#newComment"),
  addCommentBtn: $("#addCommentBtn"),
  urlsList: $("#urlsList"),
  newUrlTitle: $("#newUrlTitle"),
  newUrl: $("#newUrl"),
  addUrlBtn: $("#addUrlBtn")
};

applyTheme(state.theme);
render();
setInterval(renderTasks, 30000);

elements.themeToggle.addEventListener("click", async () => {
  state.theme = await toggleTheme(state.theme);
});

elements.searchInput.addEventListener("input", renderTasks);
elements.taskTypeSelect.addEventListener("change", async () => {
  state.selectedTaskType = elements.taskTypeSelect.value;
  showAllCompleted = false;
  closeTaskForm();
  state = await saveState(state);
  render();
});
elements.sortSelect.addEventListener("change", renderTasks);
elements.dateFilter.addEventListener("change", () => {
  elements.customDateFilter.classList.toggle("hidden", elements.dateFilter.value !== "custom");
  showAllCompleted = false;
  renderTasks();
});
elements.customDateFilter.addEventListener("change", renderTasks);

elements.editStatus.addEventListener("change", syncCompletionFields);
elements.editCompletionPreset.addEventListener("change", syncCompletionFields);

elements.listSelect.addEventListener("change", async () => {
  state.selectedListId = elements.listSelect.value;
  showAllCompleted = false;
  state = await saveState(state);
  render();
});

elements.addListBtn.addEventListener("click", async () => {
  const name = prompt("List name");
  if (!name?.trim()) return;
  const list = { id: uid("list"), name: name.trim(), createdAt: now() };
  state.lists.push(list);
  state.selectedListId = list.id;
  state = await saveState(state);
  render();
});

elements.deleteListBtn.addEventListener("click", async () => {
  if (state.lists.length === 1) {
    alert("Keep at least one list.");
    return;
  }
  const list = currentList();
  if (!confirm(`Delete "${list.name}" and all tasks inside it?`)) return;
  state.tasks = state.tasks.filter((task) => task.listId !== list.id);
  state.lists = state.lists.filter((item) => item.id !== list.id);
  state.selectedListId = state.lists[0].id;
  state = await saveState(state);
  render();
});

elements.taskReminder.addEventListener("change", () => {
  elements.customReminder.classList.toggle("hidden", elements.taskReminder.value !== "custom");
});

elements.addTaskToggle.addEventListener("click", () => {
  openTaskForm();
});

elements.cancelTaskBtn.addEventListener("click", () => {
  closeTaskForm();
});

elements.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const reminderMinutes =
    elements.taskReminder.value === "custom" ? elements.customReminder.value : elements.taskReminder.value;
  const initialUrl = elements.taskUrl.value.trim();
  const normalizedInitialUrl = initialUrl ? normalizeUrl(initialUrl) : "";

  if (initialUrl && !normalizedInitialUrl) {
    alert("Enter a valid reference URL.");
    elements.taskUrl.focus();
    return;
  }

  if (state.selectedTaskType === "project" && (!elements.taskDate.value || !elements.taskTime.value)) {
    alert("Running Project needs a deadline date and time.");
    (!elements.taskDate.value ? elements.taskDate : elements.taskTime).focus();
    return;
  }

  const task = createTask({
    listId: state.selectedListId,
    type: state.selectedTaskType,
    title: elements.taskTitle.value,
    description: elements.taskDescription.value,
    dueDate: elements.taskDate.value,
    dueTime: elements.taskTime.value,
    priority: elements.taskPriority.value,
    reminderMinutes,
    tags: elements.taskTags.value,
    color: elements.taskColor.value,
    order: nextOrder()
  });

  if (normalizedInitialUrl) {
    task.urls.push({
      id: uid("url"),
      title: elements.taskUrlTitle.value.trim() || hostLabel(normalizedInitialUrl),
      href: normalizedInitialUrl,
      createdAt: now(),
      updatedAt: now()
    });
  }

  state.tasks.push(task);
  state = await saveState(state);
  elements.taskForm.reset();
  elements.taskColor.value = "#4f8cff";
  elements.customReminder.classList.add("hidden");
  closeTaskForm();
  render();
});

elements.exportBtn.addEventListener("click", exportBackup);
elements.importInput.addEventListener("change", async () => {
  const file = elements.importInput.files[0];
  if (!file) return;
  state = await importBackup(file);
  elements.importInput.value = "";
  render();
});

elements.editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const task = findActiveTask();
  if (!task) return;
  const nextCompleted = elements.editStatus.value === "completed";
  const completionComment = getEditedCompletionComment();
  if (elements.editTaskType.value === "project" && (!elements.editDate.value || !elements.editTime.value)) {
    alert("Running Project needs a deadline date and time.");
    (!elements.editDate.value ? elements.editDate : elements.editTime).focus();
    return;
  }

  Object.assign(task, {
    title: elements.editTitle.value.trim(),
    description: elements.editDescription.value.trim(),
    dueDate: elements.editDate.value,
    dueTime: elements.editTime.value,
    type: elements.editTaskType.value,
    completed: nextCompleted,
    completedAt: nextCompleted ? task.completedAt || now() : 0,
    completionComment: nextCompleted ? completionComment : "",
    priority: elements.editPriority.value,
    color: elements.editColor.value,
    tags: parseTags(elements.editTags.value),
    updatedAt: now(),
    remindedAt: 0,
    overdueNotifiedAt: 0,
    projectAlertNotifiedAt: 0
  });
  state = await saveState(state);
  elements.taskDialog.close();
  activeTaskId = null;
  render();
});

elements.addCommentBtn.addEventListener("click", async () => {
  const task = findActiveTask();
  const body = elements.newComment.value.trim();
  if (!task || !body) return;
  task.comments.push({ id: uid("comment"), body, createdAt: now(), updatedAt: now() });
  elements.newComment.value = "";
  state = await saveState(state);
  renderEditorCollections(task);
  renderTasks();
});

elements.addUrlBtn.addEventListener("click", async () => {
  const task = findActiveTask();
  const href = normalizeUrl(elements.newUrl.value);
  if (!task || !href) {
    alert("Enter a valid URL.");
    return;
  }
  task.urls.push({
    id: uid("url"),
    title: elements.newUrlTitle.value.trim() || hostLabel(href),
    href,
    createdAt: now(),
    updatedAt: now()
  });
  elements.newUrlTitle.value = "";
  elements.newUrl.value = "";
  state = await saveState(state);
  renderEditorCollections(task);
  renderTasks();
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    openTaskForm();
  }
  if (event.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    event.preventDefault();
    elements.searchInput.focus();
  }
  if (event.key === "Escape" && elements.taskDialog.open) elements.taskDialog.close();
});

function render() {
  renderTaskType();
  renderLists();
  renderDashboard();
  renderTasks();
}

function renderTaskType() {
  state.selectedTaskType = state.selectedTaskType || "daily";
  elements.taskTypeSelect.value = state.selectedTaskType;
  elements.addTaskToggle.querySelector("strong").textContent =
    state.selectedTaskType === "project" ? "Add Running Project" : "Add New Task";
  elements.taskTitle.placeholder =
    state.selectedTaskType === "project" ? "New project title" : "New task title";
}

function openTaskForm() {
  elements.taskForm.classList.remove("is-collapsed");
  elements.addTaskToggle.setAttribute("aria-expanded", "true");
  elements.taskTitle.focus();
}

function closeTaskForm() {
  elements.taskForm.reset();
  elements.taskColor.value = "#4f8cff";
  elements.customReminder.classList.add("hidden");
  elements.taskForm.classList.add("is-collapsed");
  elements.addTaskToggle.setAttribute("aria-expanded", "false");
}

function renderLists() {
  elements.listSelect.innerHTML = state.lists
    .map((list) => `<option value="${list.id}" ${list.id === state.selectedListId ? "selected" : ""}>${escapeHtml(list.name)}</option>`)
    .join("");
}

function renderDashboard() {
  const scopedTasks = tasksForCurrentType();
  const total = scopedTasks.length;
  const completed = scopedTasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const overdue = scopedTasks.filter((task) => isOverdue(task)).length;
  const today = scopedTasks.filter((task) => isToday(task)).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  elements.dashboard.innerHTML = [
    ["Total", total],
    ["Done", completed],
    ["Pending", pending],
    ["Overdue", overdue],
    ["Today", today]
  ]
    .map(([label, value]) => statCard(label, value))
    .join("");
  elements.progressLabel.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
}

function renderTasks() {
  const tasks = filteredTasks();
  if (!tasks.length) {
    elements.taskList.innerHTML = `<div class="empty-state">No tasks found.</div>`;
    renderDashboard();
    return;
  }

  const visibleTasks = visibleTaskSlice(tasks);
  elements.taskList.innerHTML = [
    ...visibleTasks.map(taskTemplate),
    completedToggleTemplate(tasks)
  ].join("");
  bindTaskActions();
  renderDashboard();
}

function visibleTaskSlice(tasks) {
  const completed = tasks.filter((task) => task.completed);
  if (showAllCompleted || completed.length <= COMPLETED_PREVIEW_LIMIT) return tasks;

  let completedSeen = 0;
  return tasks.filter((task) => {
    if (!task.completed) return true;
    completedSeen += 1;
    return completedSeen <= COMPLETED_PREVIEW_LIMIT;
  });
}

function completedToggleTemplate(tasks) {
  const completedCount = tasks.filter((task) => task.completed).length;
  const hiddenCount = Math.max(0, completedCount - COMPLETED_PREVIEW_LIMIT);
  if (!hiddenCount) return "";

  const label = showAllCompleted ? "Show Less Completed" : `See More Completed (${hiddenCount})`;
  const detail = showAllCompleted ? `${completedCount} completed tasks visible` : `${hiddenCount} completed tasks hidden`;

  return `
    <button class="see-more-button" type="button" data-action="toggle-completed">
      <span>${label}</span>
      <small>${detail}</small>
    </button>
  `;
}

function taskTemplate(task) {
  const overdue = isOverdue(task);
  const projectAlert = isProjectAlert(task);
  const classes = [
    "task-card",
    overdue ? "is-overdue" : "",
    projectAlert ? "is-project-alert" : "",
    task.completed ? "is-complete" : ""
  ].join(" ");
  const tags = task.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const urls = task.urls
    .slice(0, 3)
    .map((url) => `<img src="${faviconFor(url.href)}" alt="" title="${escapeHtml(url.title)}">`)
    .join("");

  return `
    <article class="${classes}" draggable="true" data-id="${task.id}" style="--label:${task.color}">
      <div class="task-strip"></div>
      <div class="task-main">
        <div class="task-title-row">
          <label class="check-wrap">
            <input type="checkbox" data-action="complete" ${task.completed ? "checked" : ""}>
            <span></span>
          </label>
          <button class="task-title" data-action="edit">${escapeHtml(task.title)}</button>
          <button class="mini-button ${task.pinned ? "active" : ""}" data-action="pin" title="Pin">⌃</button>
          <button class="mini-button ${task.favorite ? "active" : ""}" data-action="favorite" title="Favorite">★</button>
        </div>
        <p>${escapeHtml(task.description || "No description")}</p>
        ${task.completed && task.completionComment ? `<p class="completion-note">${escapeHtml(task.completionComment)}</p>` : ""}
        <div class="task-meta">
          <span class="type-pill ${task.type === "project" ? "project" : "daily"}">${task.type === "project" ? "project" : "daily"}</span>
          <span class="priority ${task.priority}">${task.priority}</span>
          <span>${formatDateTime(task)}</span>
          <span class="${overdue ? "danger-text" : ""}">${formatRemaining(task)}</span>
          ${projectAlert ? `<span class="red-alert">Red alert</span>` : ""}
        </div>
        <div class="tag-row">${tags}</div>
        <div class="url-icons">${urls}</div>
      </div>
      <div class="task-actions">
        <button class="mini-button" data-action="edit" title="Edit">✎</button>
        <button class="mini-button danger" data-action="delete" title="Delete">×</button>
      </div>
    </article>
  `;
}

function bindTaskActions() {
  elements.taskList.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", () => card.classList.add("dragging"));
    card.addEventListener("dragend", async () => {
      card.classList.remove("dragging");
      await persistOrderFromDom();
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      const dragging = elements.taskList.querySelector(".dragging");
      if (!dragging || dragging === card) return;
      const offset = event.clientY - card.getBoundingClientRect().top;
      elements.taskList.insertBefore(dragging, offset > card.offsetHeight / 2 ? card.nextSibling : card);
    });
  });

  elements.taskList.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      if (event.currentTarget.dataset.action === "toggle-completed") {
        showAllCompleted = !showAllCompleted;
        renderTasks();
        return;
      }

      const card = event.target.closest(".task-card");
      if (!card) return;
      const task = state.tasks.find((item) => item.id === card.dataset.id);
      const action = event.currentTarget.dataset.action;
      if (!task) return;
      if (action === "complete") {
        const shouldComplete = event.currentTarget.checked;
        setCompletionState(task, shouldComplete);
      }
      if (action === "pin") task.pinned = !task.pinned;
      if (action === "favorite") task.favorite = !task.favorite;
      if (action === "delete") {
        if (!confirm(`Delete "${task.title}"?`)) return;
        state.tasks = state.tasks.filter((item) => item.id !== task.id);
      }
      if (action === "edit") {
        openEditor(task.id);
        return;
      }
      task.updatedAt = now();
      state = await saveState(state);
      render();
    });
  });
}

function openEditor(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  activeTaskId = taskId;
  elements.editTitle.value = task.title;
  elements.editDescription.value = task.description;
  elements.editDate.value = task.dueDate;
  elements.editTime.value = task.dueTime;
  elements.editTaskType.value = task.type || "daily";
  elements.editStatus.value = task.completed ? "completed" : "pending";
  elements.editPriority.value = task.priority;
  elements.editColor.value = task.color;
  elements.editTags.value = task.tags.join(", ");
  setCompletionEditorValue(task.completionComment);
  syncCompletionFields();
  renderEditorCollections(task);
  elements.taskDialog.showModal();
  elements.editTitle.focus();
}

function renderEditorCollections(task) {
  elements.commentsList.innerHTML = task.comments.length
    ? task.comments.map((comment) => commentTemplate(comment)).join("")
    : `<div class="subtle-empty">No notes yet.</div>`;
  elements.urlsList.innerHTML = task.urls.length
    ? task.urls.map((url) => urlTemplate(url)).join("")
    : `<div class="subtle-empty">No links yet.</div>`;

  elements.commentsList.querySelectorAll("[data-comment]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.comment;
      if (button.dataset.action === "delete") task.comments = task.comments.filter((comment) => comment.id !== id);
      if (button.dataset.action === "edit") {
        const comment = task.comments.find((item) => item.id === id);
        const next = prompt("Edit note", comment.body);
        if (next?.trim()) {
          comment.body = next.trim();
          comment.updatedAt = now();
        }
      }
      state = await saveState(state);
      renderEditorCollections(task);
      renderTasks();
    });
  });

  elements.urlsList.querySelectorAll("[data-url]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.url;
      const link = task.urls.find((item) => item.id === id);
      if (button.dataset.action === "open") await chrome.tabs.create({ url: link.href });
      if (button.dataset.action === "delete") task.urls = task.urls.filter((url) => url.id !== id);
      if (button.dataset.action === "edit") {
        const next = prompt("Edit URL", link.href);
        const normalized = normalizeUrl(next || "");
        if (normalized) {
          link.href = normalized;
          link.title = prompt("Edit label", link.title)?.trim() || hostLabel(normalized);
          link.updatedAt = now();
        }
      }
      state = await saveState(state);
      renderEditorCollections(task);
      renderTasks();
    });
  });
}

function commentTemplate(comment) {
  return `
    <article class="collection-row">
      <p>${escapeHtml(comment.body)}</p>
      <div>
        <button class="mini-button" type="button" data-action="edit" data-comment="${comment.id}">✎</button>
        <button class="mini-button danger" type="button" data-action="delete" data-comment="${comment.id}">×</button>
      </div>
    </article>
  `;
}

function urlTemplate(url) {
  return `
    <article class="collection-row url-item">
      <button class="link-button" type="button" data-action="open" data-url="${url.id}">
        <img src="${faviconFor(url.href)}" alt="">
        <span>${escapeHtml(url.title || hostLabel(url.href))}</span>
      </button>
      <div>
        <button class="mini-button" type="button" data-action="edit" data-url="${url.id}">✎</button>
        <button class="mini-button danger" type="button" data-action="delete" data-url="${url.id}">×</button>
      </div>
    </article>
  `;
}

function filteredTasks() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const listTasks = tasksForCurrentType();
  const dateMatched = listTasks.filter(matchesDateFilter);
  const matched = query ? dateMatched.filter((task) => searchableText(task).includes(query)) : dateMatched;
  return matched.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    if (elements.sortSelect.value === "pending") return Number(a.completed) - Number(b.completed) || recentSort(a, b);
    if (elements.sortSelect.value === "completed") return Number(b.completed) - Number(a.completed) || recentSort(a, b);
    if (elements.sortSelect.value === "due") return deadlineSort(a, b);
    if (elements.sortSelect.value === "recent") return b.createdAt - a.createdAt;
    const priority = priorityRank(b.priority) - priorityRank(a.priority);
    return recentSort(a, b) || priority || a.order - b.order;
  });
}

function tasksForCurrentType() {
  const selectedType = state.selectedTaskType || "daily";
  return state.tasks.filter((task) => task.listId === state.selectedListId && (task.type || "daily") === selectedType);
}

function isProjectAlert(task) {
  if ((task.type || "daily") !== "project" || task.completed) return false;
  const deadline = getDeadline(task);
  if (!deadline) return false;
  return deadline.getTime() - Date.now() <= PROJECT_ALERT_MS;
}

function recentSort(a, b) {
  return b.createdAt - a.createdAt;
}

function matchesDateFilter(task) {
  const filter = elements.dateFilter.value;
  if (filter === "all") return true;
  if (filter === "today") return isToday(task);
  if (filter === "overdue") return isOverdue(task);
  if (filter === "nodate") return !task.dueDate;
  if (filter === "upcoming") {
    const deadline = getDeadline(task);
    return Boolean(deadline && !task.completed && deadline.getTime() >= Date.now());
  }
  if (filter === "custom") {
    return Boolean(elements.customDateFilter.value && task.dueDate === elements.customDateFilter.value);
  }
  return true;
}

function deadlineSort(a, b) {
  const aTime = getDeadline(a)?.getTime() || Number.MAX_SAFE_INTEGER;
  const bTime = getDeadline(b)?.getTime() || Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

async function persistOrderFromDom() {
  const ids = [...elements.taskList.querySelectorAll(".task-card")].map((card) => card.dataset.id);
  ids.forEach((id, index) => {
    const task = state.tasks.find((item) => item.id === id);
    if (task) task.order = index;
  });
  state = await saveState(state);
  renderTasks();
}

function nextOrder() {
  return state.tasks.filter((task) => task.listId === state.selectedListId).length;
}

function currentList() {
  return state.lists.find((list) => list.id === state.selectedListId) || state.lists[0];
}

function findActiveTask() {
  return state.tasks.find((task) => task.id === activeTaskId);
}

function setCompletionState(task, completed) {
  task.completed = completed;
  task.completedAt = completed ? now() : 0;
  task.completionComment = completed ? getCompletionComment() : "";
}

function getCompletionComment() {
  const comment = prompt("Completion comment", "Completed");
  return comment?.trim() || "Completed";
}

function setCompletionEditorValue(value) {
  const presets = [...elements.editCompletionPreset.options].map((option) => option.value);
  if (!value || presets.includes(value)) {
    elements.editCompletionPreset.value = value || "Completed";
    elements.editCompletionComment.value = "";
    return;
  }

  elements.editCompletionPreset.value = "custom";
  elements.editCompletionComment.value = value;
}

function getEditedCompletionComment() {
  if (elements.editCompletionPreset.value === "custom") {
    return elements.editCompletionComment.value.trim() || "Completed";
  }

  return elements.editCompletionPreset.value;
}

function syncCompletionFields() {
  const completed = elements.editStatus.value === "completed";
  elements.completionPanel.classList.toggle("hidden", !completed);
  elements.editCompletionComment.classList.toggle("hidden", elements.editCompletionPreset.value !== "custom");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
