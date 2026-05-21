import { generateId } from "../utils/helpers.js";
import { useAuth } from "./useAuth.js";

export function useNotification() {
  const notifications = [];

  return {
    notify(message, type = "info") {
      notifications.push({ id: generateId(), message, type, timestamp: Date.now() });
    },
    dismiss(id) {
      const idx = notifications.findIndex((n) => n.id === id);
      if (idx !== -1) notifications.splice(idx, 1);
    },
    getAll() {
      return [...notifications];
    },
    getVisible() {
      const auth = useAuth();
      if (!auth.isAuthenticated()) return [];
      return notifications.filter((n) => n.type !== "debug");
    },
  };
}
