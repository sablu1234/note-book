import { loadState, saveState } from "../storage/store.js";
import { getDeadline, formatDateTime } from "../utils/time.js";

const CHECK_ALARM = "notebook-task-check";
const PROJECT_ALERT_MS = 60 * 60 * 60 * 1000;

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(CHECK_ALARM, { periodInMinutes: 1 });
  await syncReminderAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(CHECK_ALARM, { periodInMinutes: 1 });
  await syncReminderAlarms();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "STATE_UPDATED") syncReminderAlarms();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CHECK_ALARM) {
    await syncReminderAlarms();
    await notifyOverdueTasks();
    return;
  }
  if (alarm.name.startsWith("task-reminder:")) {
    await notifyTask(alarm.name.replace("task-reminder:", ""), "reminder");
  }
  if (alarm.name.startsWith("project-alert:")) {
    await notifyTask(alarm.name.replace("project-alert:", ""), "project-alert");
  }
});

async function syncReminderAlarms() {
  const state = await loadState();
  const alarms = await chrome.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith("task-reminder:"))
      .map((alarm) => chrome.alarms.clear(alarm.name))
  );
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith("project-alert:"))
      .map((alarm) => chrome.alarms.clear(alarm.name))
  );

  const at = Date.now();
  for (const task of state.tasks) {
    const deadline = getDeadline(task);
    if (!deadline || task.completed || !task.reminderMinutes) continue;
    const reminderTime = deadline.getTime() - Number(task.reminderMinutes) * 60000;
    if (reminderTime > at && !task.remindedAt) {
      await chrome.alarms.create(`task-reminder:${task.id}`, { when: reminderTime });
    }
  }

  for (const task of state.tasks) {
    const deadline = getDeadline(task);
    if (!deadline || task.completed || task.type !== "project" || !isActiveProjectStatus(task.projectStatus) || task.projectAlertNotifiedAt) continue;
    const alertTime = deadline.getTime() - PROJECT_ALERT_MS;
    if (alertTime > at) {
      await chrome.alarms.create(`project-alert:${task.id}`, { when: alertTime });
    }
  }
}

async function notifyTask(taskId, mode) {
  const state = await loadState();
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || task.completed) return;

  const title =
    mode === "overdue"
      ? "Task is overdue"
      : mode === "project-alert"
        ? "Running project red alert"
        : "Task reminder";
  const message =
    mode === "overdue"
      ? `${task.title} was due ${formatDateTime(task)}`
      : mode === "project-alert"
        ? `${task.title} has 2 days 12 hours or less before deadline`
      : `${task.title} is due ${formatDateTime(task)}`;

  await chrome.notifications.create(`notebook-${mode}-${task.id}-${Date.now()}`, {
    type: "basic",
    iconUrl: "src/assets/icons/icon-128.png",
    title,
    message,
    priority: 2
  });

  if (mode === "reminder") task.remindedAt = Date.now();
  if (mode === "overdue") task.overdueNotifiedAt = Date.now();
  if (mode === "project-alert") task.projectAlertNotifiedAt = Date.now();
  await saveState(state);
}

async function notifyOverdueTasks() {
  const state = await loadState();
  const at = Date.now();
  let changed = false;

  for (const task of state.tasks) {
    const deadline = getDeadline(task);
    if (!deadline || task.completed || task.overdueNotifiedAt) continue;
    if (deadline.getTime() <= at) {
      await chrome.notifications.create(`notebook-overdue-${task.id}-${at}`, {
        type: "basic",
        iconUrl: "src/assets/icons/icon-128.png",
        title: "Task is overdue",
        message: `${task.title} was due ${formatDateTime(task)}`,
        priority: 2
      });
      task.overdueNotifiedAt = at;
      changed = true;
    }
  }

  for (const task of state.tasks) {
    const deadline = getDeadline(task);
    if (!deadline || task.completed || task.type !== "project" || !isActiveProjectStatus(task.projectStatus) || task.projectAlertNotifiedAt) continue;
    const remaining = deadline.getTime() - at;
    if (remaining <= PROJECT_ALERT_MS) {
      await chrome.notifications.create(`notebook-project-alert-${task.id}-${at}`, {
        type: "basic",
        iconUrl: "src/assets/icons/icon-128.png",
        title: "Running project red alert",
        message: `${task.title} has 2 days 12 hours or less before deadline`,
        priority: 2
      });
      task.projectAlertNotifiedAt = at;
      changed = true;
    }
  }

  if (changed) await saveState(state);
}

function isActiveProjectStatus(status) {
  return !["delivered", "cancel", "completed"].includes(status);
}
