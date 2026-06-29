import { createDefaultState } from "./defaultState.js";

const STORAGE_KEY = "notebookTaskManager";

function chromeStorage() {
  return chrome.storage.local;
}

export async function loadState() {
  const result = await chromeStorage().get(STORAGE_KEY);
  const state = result[STORAGE_KEY] || createDefaultState();
  return sanitizeState(state);
}

export async function saveState(state) {
  const sanitized = sanitizeState(state);
  await chromeStorage().set({ [STORAGE_KEY]: sanitized });
  await chrome.runtime.sendMessage({ type: "STATE_UPDATED" }).catch(() => {});
  return sanitized;
}

export async function updateState(updater) {
  const current = await loadState();
  const next = await updater(structuredClone(current));
  return saveState(next);
}

export async function replaceState(nextState) {
  return saveState(nextState);
}

export function sanitizeState(state) {
  const fallback = createDefaultState();
  const lists = Array.isArray(state.lists) && state.lists.length ? state.lists : fallback.lists;
  const listIds = new Set(lists.map((list) => list.id));
  const profiles = normalizeProfiles(state.profiles || fallback.profiles);
  const selectedListId = listIds.has(state.selectedListId) ? state.selectedListId : lists[0].id;
  const selectedProfileName = profiles.includes(state.selectedProfileName) ? state.selectedProfileName : profiles[0];

  return {
    version: 1,
    theme: state.theme === "dark" ? "dark" : "light",
    selectedListId,
    selectedTaskType: ["daily", "project"].includes(state.selectedTaskType) ? state.selectedTaskType : "daily",
    selectedProfileName,
    profiles,
    lists: lists.map((list) => ({
      id: String(list.id),
      name: String(list.name || "Untitled List"),
      createdAt: Number(list.createdAt || Date.now())
    })),
    tasks: Array.isArray(state.tasks)
      ? state.tasks
          .filter((task) => task && listIds.has(task.listId))
          .map((task, index) => ({
            id: String(task.id),
            listId: String(task.listId),
            title: String(task.title || "Untitled Task"),
            description: String(task.description || ""),
            dueDate: String(task.dueDate || ""),
            dueTime: String(task.dueTime || ""),
            type: ["daily", "project"].includes(task.type) ? task.type : "daily",
            profileName: profiles.includes(task.profileName) ? task.profileName : selectedProfileName,
            projectPrice: Number.isFinite(Number(task.projectPrice)) ? Math.max(0, Number(task.projectPrice)) : 0,
            projectStatus: ["wip", "delivered", "revision", "cancel", "completed", "first-up-done"].includes(task.projectStatus)
              ? task.projectStatus
              : task.completed && task.type === "project"
                ? "completed"
                : "wip",
            completed: Boolean(task.completed),
            pinned: Boolean(task.pinned),
            favorite: Boolean(task.favorite),
            priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
            tags: Array.isArray(task.tags) ? task.tags.map(String) : [],
            color: /^#[0-9a-f]{6}$/i.test(task.color || "") ? task.color : "#4f8cff",
            reminderMinutes: Number(task.reminderMinutes || 0),
            order: Number.isFinite(task.order) ? task.order : index,
            createdAt: Number(task.createdAt || Date.now()),
            updatedAt: Number(task.updatedAt || Date.now()),
            completedAt: Number(task.completedAt || 0),
            completionComment: String(task.completionComment || ""),
            deliveredAt: Number(task.deliveredAt || (task.projectStatus === "delivered" ? task.updatedAt || task.createdAt || Date.now() : 0)),
            remindedAt: Number(task.remindedAt || 0),
            overdueNotifiedAt: Number(task.overdueNotifiedAt || 0),
            projectAlertNotifiedAt: Number(task.projectAlertNotifiedAt || 0),
            statusComments: Array.isArray(task.statusComments)
              ? task.statusComments.map((comment) => ({
                  id: String(comment.id || ""),
                  status: String(comment.status || ""),
                  body: String(comment.body || ""),
                  createdAt: Number(comment.createdAt || Date.now())
                }))
              : [],
            comments: Array.isArray(task.comments) ? task.comments : [],
            urls: Array.isArray(task.urls) ? task.urls : []
          }))
      : []
  };
}

function normalizeProfiles(value) {
  const profiles = Array.isArray(value)
    ? value.map((profile) => String(profile || "").trim()).filter(Boolean)
    : [];
  return [...new Set(profiles)].length ? [...new Set(profiles)] : ["Default Profile"];
}
