import { createUser } from "./services/userService.js";
import { login, logout } from "./services/authService.js";
import { renderUserList } from "./components/userList.js";
import { renderAdminPanel } from "./components/adminPanel.js";
import { createRepository } from "./data/repository.js";
import { revalidate } from "./data/cache.js";
import { useAuth } from "./hooks/useAuth.js";
import { useData } from "./hooks/useData.js";
import { getConfig } from "./config/index.js";
import { setUserAction, clearUserAction, setErrorAction } from "./store/actions.js";
import { subscribe, getState } from "./store/reducer.js";
import { applyMiddleware } from "./store/middleware.js";
import { generateReport, formatReport } from "./services/reportService.js";

console.log("Config:", getConfig());

createUser("Alice", "alice@example.com");
createUser("Bob", "bob@example.com");

const session = login("alice@example.com");
console.log("Session:", session.token);

setUserAction({ id: session.userId, email: "alice@example.com" });

console.log("Users:", renderUserList());
console.log("Admin:", renderAdminPanel());

const userRepo = createRepository("users");
console.log("Repository:", userRepo.findAll());

const auth = useAuth();
console.log("Authenticated:", auth.authenticate("alice@example.com", "secret"));

applyMiddleware((action) => {
  console.log("[MW]", action);
  return action;
});

subscribe((state) => console.log("State update:", state));

const dataHook = useData(async () => ({ items: [1, 2, 3] }));
dataHook.refresh().then(() => console.log("Data:", dataHook.getData()));

const report = generateReport("summary");
console.log("Report:", formatReport(report));

revalidate("req:users");

clearUserAction();
setErrorAction("none");
console.log("Final state:", getState());

logout(session.token);
