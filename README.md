# Notebook Task Manager

A modern offline Chrome Extension for managing task lists, due dates, notes, URL references, priorities, reminders, backups, and progress.

Author: **Sablu Hasan**  
Portfolio: <https://sablu-hasan.vercel.app/>  
Version: **1.0.0**  
License: **MIT**

## Features

- Unlimited task lists with list management.
- Create, edit, delete, pin, favorite, complete, and reorder tasks.
- Due date and time with live remaining-time display and overdue highlighting.
- Sort by pending, completed, due time, recently created, and manual order.
- Instant search across titles, descriptions, tags, notes, and URLs.
- Dedicated notes and comments per task with edit/delete.
- Unlimited reference URLs with favicons and clickable new-tab opening.
- Chrome notifications before deadlines and again when overdue.
- Dashboard for total, completed, pending, overdue, and today's tasks.
- Light and dark modes.
- Import/export JSON backups.
- Keyboard shortcuts in popup:
  - `Ctrl+N`: focus new task title
  - `/`: focus search
  - `Esc`: close the task editor

## Install in Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder: `note-book`.
5. Pin **Notebook Task Manager** from the extensions menu.

## Project Structure

```text
src/
  assets/icons/
  background/
  components/
  options/
  popup/
  services/
  storage/
  styles/
  utils/
manifest.json
README.md
```

## Data and Privacy

All task data is stored locally with the Chrome Storage API. The extension does not use an external database or send task data to a server.

## Backup and Restore

Use **Export JSON** in the popup or options page to download a complete backup. Use **Import JSON** to restore a previously exported backup.
