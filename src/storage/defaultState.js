import { uid, now } from "../utils/time.js";

export function createDefaultState() {
  const inboxId = uid("list");
  return {
    version: 1,
    theme: "light",
    selectedListId: inboxId,
    selectedProfileName: "Default Profile",
    profiles: ["Default Profile"],
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
