import test from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, unlinkSync, existsSync, rmSync } from "node:fs";
import {
  generateStarterHtml,
  generateStarterXml,
  resolveDefaultPaths,
  readCaddyConfig,
  writeCaddyConfig,
  buildStaticRoute,
  provisionDocumentRoot,
  findRouteIndex,
  upsertRoute,
  initStaticSite,
  checkStaticSite,
  listStaticSites
} from "../src/index.js";
import { run } from "../src/cli.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(__dirname, "fixtures/caddy.sample.json");

test("CLI exports run function", () => {
  assert.equal(typeof run, "function");
});

test("generateStarterHtml generates valid HTML containing domain name", () => {
  const html = generateStarterHtml("call.keshavsoft.com", { root: "/usr/share/call" });
  assert.ok(html.includes("call.keshavsoft.com"));
  assert.ok(html.includes("/usr/share/call"));
  assert.ok(html.includes("file_server"));
});

test("generateStarterXml generates valid XML sitemap", () => {
  const xml = generateStarterXml("call.keshavsoft.com");
  assert.ok(xml.includes("<loc>https://call.keshavsoft.com/</loc>"));
  assert.ok(xml.includes("urlset"));
});

test("resolveDefaultPaths returns valid paths", () => {
  const paths = resolveDefaultPaths(samplePath, "/var/www/test", "call.keshavsoft.com");
  assert.equal(paths.configPath, samplePath);
  assert.equal(paths.rootPath, resolve(process.cwd(), "/var/www/test"));
});

test("readCaddyConfig parses Caddy JSON properly", () => {
  const config = readCaddyConfig(samplePath);
  assert.ok(config.apps.http.servers.srv0);
});

test("buildStaticRoute returns valid Caddy AST block", () => {
  const route = buildStaticRoute("call.keshavsoft.com", "/usr/share/call");
  assert.deepEqual(route.match[0].host, ["call.keshavsoft.com"]);
  assert.equal(route.handle[0].handler, "subroute");
  const subHandle = route.handle[0].routes[0].handle;
  assert.equal(subHandle[0].handler, "vars");
  assert.equal(subHandle[0].root, "/usr/share/call");
  assert.equal(subHandle[1].handler, "file_server");
});

test("provisionDocumentRoot creates directory and drops index.html", () => {
  const tempDir = resolve(__dirname, "fixtures/temp-doc-root");
  try {
    const res = provisionDocumentRoot(tempDir, "call.keshavsoft.com", { xml: true });
    assert.equal(res.rootPath, tempDir);
    assert.ok(existsSync(resolve(tempDir, "index.html")));
    assert.ok(existsSync(resolve(tempDir, "sitemap.xml")));
  } finally {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  }
});

test("findRouteIndex locates existing host", () => {
  const config = readCaddyConfig(samplePath);
  const routes = config.apps.http.servers.srv0.routes;
  const idx = findRouteIndex(routes, "cli.keshavsoft.com");
  assert.equal(idx, 1);

  const missing = findRouteIndex(routes, "nonexistent.keshavsoft.com");
  assert.equal(missing, -1);
});

test("upsertRoute appends new route and updates with force", () => {
  const config = readCaddyConfig(samplePath);
  const routes = config.apps.http.servers.srv0.routes;
  const newRoute = buildStaticRoute("new.keshavsoft.com", "/usr/share/new");

  const newIdx = upsertRoute(routes, "new.keshavsoft.com", newRoute);
  assert.equal(newIdx, 2);

  // Re-adding without force throws
  assert.throws(() => {
    upsertRoute(routes, "new.keshavsoft.com", newRoute, false);
  }, /already configured/);

  // With force updates in place
  const updatedIdx = upsertRoute(routes, "new.keshavsoft.com", newRoute, true);
  assert.equal(updatedIdx, 2);
});

test("initStaticSite creates files, updates Caddy JSON and creates backup", async () => {
  const tempConfigFile = resolve(__dirname, "fixtures/caddy.temp.json");
  const tempDocRoot = resolve(__dirname, "fixtures/temp-static-root");
  const initial = readCaddyConfig(samplePath);
  writeFileSync(tempConfigFile, JSON.stringify(initial, null, 2), "utf8");

  try {
    const result = await initStaticSite({
      domain: "assets.keshavsoft.com",
      root: tempDocRoot,
      configPath: tempConfigFile,
      reload: false,
      probe: false,
      xml: true
    });

    assert.equal(result.domain, "assets.keshavsoft.com");
    assert.ok(existsSync(tempDocRoot));
    assert.ok(existsSync(resolve(tempDocRoot, "index.html")));
    assert.ok(existsSync(resolve(tempDocRoot, "sitemap.xml")));
    assert.ok(result.backupFile);
    assert.ok(existsSync(result.backupFile));

    const updated = readCaddyConfig(tempConfigFile);
    const routes = updated.apps.http.servers.srv0.routes;
    const matchIdx = findRouteIndex(routes, "assets.keshavsoft.com");
    assert.notEqual(matchIdx, -1);

    unlinkSync(result.backupFile);
  } finally {
    if (existsSync(tempConfigFile)) unlinkSync(tempConfigFile);
    if (existsSync(tempDocRoot)) rmSync(tempDocRoot, { recursive: true, force: true });
  }
});

test("checkStaticSite correctly audits filesystem and Caddy route", () => {
  const res = checkStaticSite("cli.keshavsoft.com", {
    configPath: samplePath,
    root: "/usr/share/cli.keshavsoft.com"
  });

  assert.equal(res.domain, "cli.keshavsoft.com");
  assert.equal(res.caddy.exists, true);
  assert.equal(res.caddy.handler, "file_server");
  assert.equal(res.caddy.configuredRoot, "/usr/share/cli.keshavsoft.com");
});

test("listStaticSites lists configured file_server routes", () => {
  const list = listStaticSites(samplePath);
  assert.ok(list.length >= 1);
  assert.equal(list[0].domain, "cli.keshavsoft.com");
  assert.equal(list[0].docRoot, "/usr/share/cli.keshavsoft.com");
});
