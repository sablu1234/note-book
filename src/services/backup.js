import { loadState, replaceState, sanitizeState } from "../storage/store.js";

export async function exportBackup() {
  const state = await loadState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `notebook-task-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const next = sanitizeState(parsed);
  await replaceState(next);
  return next;
}
