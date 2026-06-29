import { uid, now } from "../utils/time.js";

export function createTask(input) {
  return {
    id: uid("task"),
    listId: input.listId,
    title: input.title.trim(),
    description: input.description.trim(),
    dueDate: input.dueDate,
    dueTime: input.dueTime,
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
    remindedAt: 0,
    overdueNotifiedAt: 0,
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
    task.priority,
    task.tags.join(" "),
    ...task.comments.map((comment) => comment.body),
    ...task.urls.flatMap((url) => [url.title, url.href])
  ]
    .join(" ")
    .toLowerCase();
}
