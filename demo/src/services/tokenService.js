import { generateId } from "../utils/helpers.js";
import { isNotEmpty } from "../utils/validators.js";
import { validateSession } from "./sessionService.js";

const tokens = [];

export function createToken(userId) {
  if (!isNotEmpty(userId)) {
    throw new Error("User ID is required");
  }
  validateSession(userId);
  const token = { value: generateId(), userId, createdAt: new Date() };
  tokens.push(token);
  return token;
}

export function revokeToken(tokenValue) {
  const index = tokens.findIndex((t) => t.value === tokenValue);
  if (index !== -1) {
    tokens.splice(index, 1);
  }
}
