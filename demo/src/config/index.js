import { getEnv, isProduction } from "./env.js";
import { APP_NAME, VERSION } from "./defaults.js";

export function getConfig() {
  return { ...getEnv(), debug: !isProduction() };
}

export { APP_NAME, VERSION };
