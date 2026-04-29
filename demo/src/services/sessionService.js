import { generateId } from "../utils/helpers.js";
import { isNotEmpty } from "../utils/validators.js";
import { getUserById } from "./authService.js";

const sessions = [];

export function validateSession(userId) {
  if (!isNotEmpty(userId)) {
    throw new Error("User ID is required");
  }
  const user = getUserById(userId);
  return user !== null;
}

export function createSession(userId) {
  const id = generateId();
  const session = { id, userId, startedAt: new Date() };
  sessions.push(session);
  return session;
}

export function destroySession(sessionId) {
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index !== -1) {
    sessions.splice(index, 1);
  }
}
