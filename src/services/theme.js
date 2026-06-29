import { updateState } from "../storage/store.js";

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

export async function toggleTheme(currentTheme) {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  await updateState((state) => {
    state.theme = nextTheme;
    return state;
  });
  applyTheme(nextTheme);
  return nextTheme;
}
