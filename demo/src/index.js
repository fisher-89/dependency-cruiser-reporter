import { createUser } from "./services/userService.js";
import { login, logout } from "./services/authService.js";
import { renderUserList } from "./components/userList.js";

createUser("Alice", "alice@example.com");
createUser("Bob", "bob@example.com");

const session = login("alice@example.com");
console.log("Session:", session.token);

console.log("Users:", renderUserList());

logout(session.token);
