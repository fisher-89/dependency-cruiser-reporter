import { generateId } from "../utils/helpers.js";
import { isNotEmpty } from "../utils/validators.js";
import { getUsers } from "./userService.js";

const sessions = [];

export function login(email) {
  if (!isNotEmpty(email)) {
    throw new Error("Email is required");
  }
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user) {
    throw new Error("User not found");
  }
  const session = { token: generateId(), userId: user.id };
  sessions.push(session);
  return session;
}

export function logout(token) {
  const index = sessions.findIndex((s) => s.token === token);
  if (index !== -1) {
    sessions.splice(index, 1);
  }
}
