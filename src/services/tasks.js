import { uid, now } from "../utils/time.js";

export function createTask(input) {
  return {
    id: uid("task"),
    listId: input.listId,
    title: input.title.trim(),
    description: input.description.trim(),
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    type: input.type || "daily",
    profileName: input.profileName || "Default Profile",
    projectPrice: Number(input.projectPrice || 0),
    projectStatus: input.projectStatus || "wip",
    completed: false,
    pinned: false,
    favorite: false,
    priority: input.priority,
    tags: parseTags(input.tags),
    color: input.color,
    reminderMinutes: Number(input.reminderMinutes || 0),
    order: input.order || 0,
    createdAt: now(),
    updatedAt: now(),
    completedAt: 0,
    completionComment: "",
    deliveredAt: 0,
    remindedAt: 0,
    overdueNotifiedAt: 0,
    projectAlertNotifiedAt: 0,
    statusComments: [],
    comments: [],
    urls: []
  };
}

export function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function priorityRank(priority) {
  return { high: 3, medium: 2, low: 1 }[priority] || 2;
}

export function searchableText(task) {
  return [
    task.title,
    task.description,
    task.type,
    task.profileName,
    task.projectPrice,
    task.projectStatus,
    task.priority,
    ...((task.statusComments || []).flatMap((comment) => [comment.status, comment.body])),
    task.tags.join(" "),
    ...task.comments.map((comment) => comment.body),
    ...task.urls.flatMap((url) => [url.title, url.href])
  ]
    .join(" ")
    .toLowerCase();
}
