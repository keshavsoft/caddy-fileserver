import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  initStaticSite,
  checkStaticSite,
  listStaticSites,
  generateStarterHtml,
  generateStarterXml,
  resolveDefaultPaths
} from "./index.js";

const VERSION = "1.0.0";

export function printHelp(isMissing = false) {
  const header = isMissing
    ? "⚠️  No command provided! Here is how to use caddy-fileserver:"
    : "caddy-fileserver — Static File Server Engine for Caddy on Ubuntu VPS";

  console.log(`
============================================================
  ${header}
============================================================

The Bridge between Caddy TLS (:443) and Ubuntu Filesystem (/usr/share/...)

PRIMARY WORKFLOW COMMANDS:

1️⃣  INITIALIZE STATIC SITE (Folder + Starter Template + Caddy Route + Reload)
    Command         : npx caddy-fileserver init <domain> [documentRoot]
    Sample          : npx caddy-fileserver init call.keshavsoft.com
    Custom Path     : npx caddy-fileserver init call.keshavsoft.com /usr/share/call
    What it does    : 1. Creates /usr/share/<domain> on Ubuntu.
                      2. Injects ready-made responsive starter index.html.
                      3. Adds vars root & file_server route in Caddy JSON.
                      4. Hot-reloads Caddy & verifies live HTTPS traffic.

2️⃣  INSPECT & AUDIT (Verify both Ubuntu Filesystem & Caddy JSON)
    Command         : npx caddy-fileserver check <domain> [documentRoot]
    Sample          : npx caddy-fileserver check call.keshavsoft.com
    What it does    : Validates if directory exists on disk, index.html is
                      present, and Caddy route correctly targets the path.

3️⃣  GENERATE STANDALONE TEMPLATE (Without modifying Caddy JSON)
    Command         : npx caddy-fileserver template <domain> [outputDir]
    Sample          : npx caddy-fileserver template call.keshavsoft.com ./dist
    What it does    : Exports starter index.html & sitemap.xml.

4️⃣  LIST ALL STATIC SITES (Audit all file_server routes across VPS)
    Command         : npx caddy-fileserver list
    What it does    : Scans Caddy JSON and cross-checks disk directories.

------------------------------------------------------------
OPTIONS:
    --no-reload       Skip automatic Caddy reload
    --no-backup       Skip timestamped backup file creation
    --no-probe        Skip live HTTPS fetch verification
    --xml             Also generate starter sitemap.xml
    --force           Force overwrite of existing route & template
    -h, --help        Show this guide
    -v, --version     Show version (${VERSION})
============================================================
`);
}

export async function run(args = process.argv.slice(2)) {
  if (args.length === 0) {
    printHelp(true);
    return;
  }

  if (args.includes("-h") || args.includes("--help")) {
    printHelp(false);
    return;
  }

  if (args.includes("-v") || args.includes("--version")) {
    console.log(VERSION);
    return;
  }

  const command = args[0].toLowerCase();

  // ----------------------------------------------------
  // 1. INIT
  // ----------------------------------------------------
  if (command === "init") {
    const domain = args[1];
    if (!domain || domain.startsWith("-")) {
      console.error(`
❌ Error: 'init' requires at least 1 input: <domain> [documentRoot]

Samples:
  npx caddy-fileserver init call.keshavsoft.com
  npx caddy-fileserver init call.keshavsoft.com /usr/share/caddy/call.keshavsoft.com
`);
      process.exitCode = 1;
      return;
    }

    const nonFlags = args.slice(2).filter((a) => !a.startsWith("-"));
    const customRoot = nonFlags[0];
    const customConfig = nonFlags[1];

    const noReload = args.includes("--no-reload");
    const noBackup = args.includes("--no-backup");
    const noProbe = args.includes("--no-probe");
    const withXml = args.includes("--xml");
    const force = args.includes("--force");

    try {
      console.log(`\n⏳ Provisioning static file server for: ${domain}...`);
      const result = await initStaticSite({
        domain,
        root: customRoot,
        configPath: customConfig,
        force,
        backup: !noBackup,
        reload: !noReload,
        probe: !noProbe,
        xml: withXml
      });

      console.log(`\n============================================================`);
      console.log(`✅ Static File Server Initialized Successfully!`);
      console.log(`============================================================`);
      console.log(`Subdomain:        ${result.domain}`);
      console.log(`Document Root:    ${result.rootPath}`);
      console.log(`Files Created:    ${result.filesCreated.join(", ") || "(already existed)"}`);
      console.log(`Caddy Config:     ${result.configPath}`);
      console.log(`Route Index:      ${result.routeIndex}`);
      if (result.backupFile) {
        console.log(`Backup File:      ${result.backupFile}`);
      }
      console.log(`Caddy Reload:     ${result.reloadMessage}`);
      console.log(`Live HTTPS:       ${result.liveStatus}`);
      console.log(`============================================================\n`);
    } catch (err) {
      console.error(`\n❌ Error initializing static site: ${err.message}`);
      process.exitCode = 1;
    }
    return;
  }

  // ----------------------------------------------------
  // 2. CHECK / AUDIT
  // ----------------------------------------------------
  if (command === "check" || command === "audit") {
    const domain = args[1];
    if (!domain || domain.startsWith("-")) {
      console.error(`
❌ Error: 'check' requires 1 input: <domain>

Sample:
  npx caddy-fileserver check call.keshavsoft.com
`);
      process.exitCode = 1;
      return;
    }

    const nonFlags = args.slice(2).filter((a) => !a.startsWith("-"));
    const customRoot = nonFlags[0];
    const customConfig = nonFlags[1];

    try {
      const res = checkStaticSite(domain, { root: customRoot, configPath: customConfig });

      console.log(`\n============================================================`);
      console.log(`Static File Server Audit: ${domain}`);
      console.log(`============================================================`);

      console.log(`\n[Ubuntu Filesystem]`);
      console.log(`  Path:           ${res.filesystem.rootPath}`);
      console.log(`  Folder Exists:  ${res.filesystem.exists ? "✅ Yes" : "❌ No"}`);
      console.log(`  index.html:     ${res.filesystem.hasIndexHtml ? "✅ Yes" : "❌ Missing"}`);
      console.log(`  Total Files:    ${res.filesystem.fileCount}`);

      console.log(`\n[Caddy Server Route]`);
      console.log(`  Config:         ${res.caddy.configPath}`);
      console.log(`  Route Exists:   ${res.caddy.exists ? "✅ Yes" : "❌ No"}`);
      if (res.caddy.exists) {
        console.log(`  Server / Index: ${res.caddy.serverKey} / route[${res.caddy.routeIndex}]`);
        console.log(`  Handler Type:   ${res.caddy.handler === "file_server" ? "✅ file_server" : `⚠️ ${res.caddy.handler}`}`);
        console.log(`  Target Root:    ${res.caddy.configuredRoot}`);
        const match = res.filesystem.rootPath === res.caddy.configuredRoot;
        console.log(`  Root Match:     ${match ? "✅ Aligned" : "⚠️ Mismatch between disk & Caddy"}`);
      }

      console.log(`============================================================\n`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exitCode = 1;
    }
    return;
  }

  // ----------------------------------------------------
  // 3. TEMPLATE
  // ----------------------------------------------------
  if (command === "template") {
    const domain = args[1];
    if (!domain || domain.startsWith("-")) {
      console.error(`
❌ Error: 'template' requires at least 1 input: <domain> [outputDir]

Sample:
  npx caddy-fileserver template call.keshavsoft.com ./dist
`);
      process.exitCode = 1;
      return;
    }

    const nonFlags = args.slice(2).filter((a) => !a.startsWith("-"));
    const outputDir = resolve(process.cwd(), nonFlags[0] || `./${domain}`);
    const withXml = args.includes("--xml");

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const html = generateStarterHtml(domain, { root: outputDir });
    writeFileSync(join(outputDir, "index.html"), html, "utf8");

    if (withXml) {
      const xml = generateStarterXml(domain);
      writeFileSync(join(outputDir, "sitemap.xml"), xml, "utf8");
    }

    console.log(`✅ Starter template generated in: ${outputDir}`);
    console.log(`Files: index.html${withXml ? ", sitemap.xml" : ""}`);
    return;
  }

  // ----------------------------------------------------
  // 4. LIST
  // ----------------------------------------------------
  if (command === "list") {
    const nonFlags = args.slice(1).filter((a) => !a.startsWith("-"));
    const configPath = nonFlags[0];

    try {
      const list = listStaticSites(configPath);
      console.log(`\nStatic File Server Routes (${list.length}):`);
      if (list.length === 0) {
        console.log(`  (no file_server subdomains configured in Caddy JSON)`);
      } else {
        list.forEach((item, idx) => {
          const fsIcon = item.fsExists ? "📁 [disk: OK]" : "⚠️ [disk: missing]";
          const paddedDom = item.domain.padEnd(28, " ");
          console.log(`  ${idx + 1}. ${paddedDom} ➔  ${item.docRoot.padEnd(35, " ")} ${fsIcon}`);
        });
      }
      console.log("");
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exitCode = 1;
    }
    return;
  }

  console.error(`Unknown command: '${command}'.\nRun 'npx caddy-fileserver' without arguments to see available commands.`);
  process.exitCode = 1;
}

export default run;
