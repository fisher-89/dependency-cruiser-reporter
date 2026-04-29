import { getUsers } from "../services/userService.js";

export function renderAdminPanel() {
  const users = getUsers();
  return `<div>Admin Panel (${users.length} users)</div>`;
}

export function checkPermissions(userId) {
  return userId === "admin";
}
