import { generateId } from "../utils/helpers.js";
import { isNotEmpty } from "../utils/validators.js";
import { getUsers } from "./userService.js";
import { createToken, revokeToken } from "./tokenService.js";

const authLog = [];

export function login(email) {
  if (!isNotEmpty(email)) {
    throw new Error("Email is required");
  }
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user) {
    throw new Error("User not found");
  }
  const token = createToken(user.id);
  authLog.push({ action: "login", userId: user.id });
  return { token: token.value, userId: user.id };
}

export function logout(tokenValue) {
  revokeToken(tokenValue);
  authLog.push({ action: "logout" });
}

export function getUserById(userId) {
  const users = getUsers();
  return users.find((u) => u.id === userId) || null;
}
