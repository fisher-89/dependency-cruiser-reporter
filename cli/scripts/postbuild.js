#!/usr/bin/env node
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const cliPath = new URL("../dist/bin/cli.js", import.meta.url);
const content = readFileSync(cliPath, "utf8");

if (!content.startsWith("#!/usr/bin/env node")) {
  writeFileSync(cliPath, "#!/usr/bin/env node\n" + content);
}

chmodSync(cliPath, 0o755);
console.log("Added shebang to dist/bin/cli.js");