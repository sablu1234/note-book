export function now() {
  return Date.now();
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getDeadline(task) {
  if (!task.dueDate || !task.dueTime) return null;
  const value = new Date(`${task.dueDate}T${task.dueTime}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function isOverdue(task, at = new Date()) {
  const deadline = getDeadline(task);
  return Boolean(deadline && !task.completed && deadline.getTime() < at.getTime());
}

export function isToday(task, at = new Date()) {
  const deadline = getDeadline(task);
  if (!deadline) return false;
  return deadline.toDateString() === at.toDateString();
}

export function formatRemaining(task) {
  const deadline = getDeadline(task);
  if (!deadline) return "No deadline";
  const diff = deadline.getTime() - Date.now();
  const absolute = Math.abs(diff);
  const minutes = Math.floor(absolute / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  let text = "";

  if (days > 0) text = `${days}d ${hours % 24}h`;
  else if (hours > 0) text = `${hours}h ${minutes % 60}m`;
  else text = `${Math.max(0, minutes)}m`;

  return diff < 0 ? `Overdue by ${text}` : `${text} left`;
}

export function formatDateTime(task) {
  const deadline = getDeadline(task);
  if (!deadline) return "No due time";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(deadline);
}
