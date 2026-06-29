import { loadState } from "../storage/store.js";
import { exportBackup, importBackup } from "../services/backup.js";
import { applyTheme, toggleTheme } from "../services/theme.js";

let state = await loadState();
const themeToggle = document.querySelector("#themeToggle");
const exportBtn = document.querySelector("#exportBtn");
const importInput = document.querySelector("#importInput");

applyTheme(state.theme);

themeToggle.addEventListener("click", async () => {
  state.theme = await toggleTheme(state.theme);
});

exportBtn.addEventListener("click", exportBackup);

importInput.addEventListener("change", async () => {
  const file = importInput.files[0];
  if (!file) return;
  state = await importBackup(file);
  importInput.value = "";
  alert("Backup restored successfully.");
});
