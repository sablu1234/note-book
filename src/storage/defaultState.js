import { uid, now } from "../utils/time.js";

export function createDefaultState() {
  const inboxId = uid("list");
  return {
    version: 1,
    theme: "light",
    selectedListId: inboxId,
    lists: [
      {
        id: inboxId,
        name: "Inbox",
        createdAt: now()
      }
    ],
    tasks: []
  };
}
