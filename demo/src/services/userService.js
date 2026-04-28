import { generateId } from "../utils/helpers.js";
import { isValidEmail } from "../utils/validators.js";

const users = [];

export function createUser(name, email) {
  if (!isValidEmail(email)) {
    throw new Error("Invalid email");
  }
  const user = { id: generateId(), name, email };
  users.push(user);
  return user;
}

export function getUsers() {
  return [...users];
}
