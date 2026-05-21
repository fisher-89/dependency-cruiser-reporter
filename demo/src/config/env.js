import { APP_NAME, VERSION } from "./defaults.js";

export function getEnv() {
  return { appName: APP_NAME, version: VERSION, nodeEnv: "development" };
}

export function isProduction() {
  return false;
}
