import { initStaticSite } from "../../../src/v1/index.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, unlinkSync, rmSync, existsSync } from "node:fs";

console.log("=== Sample 01: Initialize Static File Server Subdomain ===");
console.log("Provisions directory, starter index.html, and Caddy JSON file_server route.\n");

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleSource = resolve(__dirname, "../../caddy.sample.json");
const tempConfigFile = resolve(__dirname, "caddy.temp.json");
const tempDocRoot = resolve(__dirname, "demo-public-html");

copyFileSync(sampleSource, tempConfigFile);

async function main() {
  const result = await initStaticSite({
    domain: "call.keshavsoft.com",
    root: tempDocRoot,
    configPath: tempConfigFile,
    reload: false,
    probe: false,
    xml: true
  });

  console.log("✅ Static Site Successfully Initialized!");
  console.log(`Domain:        ${result.domain}`);
  console.log(`Document Root: ${result.rootPath}`);
  console.log(`Files Created: ${result.filesCreated.join(", ")}`);
  console.log(`Route Index:   ${result.routeIndex}`);
  console.log(`Backup File:   ${result.backupFile}`);
  console.log("\nGenerated Caddy Route Block:");
  console.log(JSON.stringify(result.newRoute, null, 2));

  // Cleanup temporary demo files
  if (existsSync(tempConfigFile)) unlinkSync(tempConfigFile);
  if (result.backupFile && existsSync(result.backupFile)) unlinkSync(result.backupFile);
  if (existsSync(tempDocRoot)) rmSync(tempDocRoot, { recursive: true, force: true });
  console.log("\n(Cleaned up temporary demo files)");
}

main().catch(console.error);
