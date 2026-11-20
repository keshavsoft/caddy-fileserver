import { checkStaticSite } from "../../../src/v1/index.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

console.log("=== Sample 02: Check Static File Server Subdomain ===");
console.log("Audits both the Ubuntu filesystem and Caddy JSON configuration.\n");

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleSource = resolve(__dirname, "../../caddy.sample.json");

const result = checkStaticSite("cli.keshavsoft.com", {
  configPath: sampleSource,
  root: "/usr/share/cli.keshavsoft.com"
});

console.log(`Domain:          ${result.domain}`);
console.log(`[Filesystem]`);
console.log(`  Root Path:     ${result.filesystem.rootPath}`);
console.log(`  Folder Exists: ${result.filesystem.exists}`);
console.log(`  index.html:    ${result.filesystem.hasIndexHtml}`);
console.log(`[Caddy JSON]`);
console.log(`  Config Path:   ${result.caddy.configPath}`);
console.log(`  Route Exists:  ${result.caddy.exists}`);
console.log(`  Handler:       ${result.caddy.handler}`);
console.log(`  Target Root:   ${result.caddy.configuredRoot}`);
