import { listStaticSites } from "../../../src/v1/index.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

console.log("=== Sample 04: List All Caddy Static Sites ===");
console.log("Scans Caddy configuration for file_server routes.\n");

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleSource = resolve(__dirname, "../../caddy.sample.json");

const sites = listStaticSites(sampleSource);
console.log(`Found ${sites.length} static site(s):`);

sites.forEach((s, idx) => {
  console.log(`  ${idx + 1}. ${s.domain} ➔ ${s.docRoot} (route: ${s.routeIndex})`);
});
