import { formatDate } from "../utils/helpers.js";
import { getUsers } from "../services/userService.js";

export function renderUserList() {
  const users = getUsers();
  return users.map((u) => `${u.name} (${formatDate(new Date())})`).join(", ");
}
