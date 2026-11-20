import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { generateStarterHtml, generateStarterXml } from "./template.js";

export { generateStarterHtml, generateStarterXml };

/**
 * Resolves standard paths for Caddy JSON configuration and static document root.
 * Follows KeshavSoft Ubuntu VPS convention: /usr/share/<domain>
 * @param {string} [customConfigPath]
 * @param {string} [customDocRoot]
 * @param {string} [domain]
 * @returns {{ configPath: string, rootPath: string }}
 */
export function resolveDefaultPaths(customConfigPath, customDocRoot, domain = "example.com") {
  // 1. Resolve Caddy Config Path
  let configPath = customConfigPath ? resolve(process.cwd(), customConfigPath) : null;
  if (!configPath) {
    const vps = "/etc/caddy/caddy.json";
    const local = resolve(process.cwd(), "./caddy.json");
    const sample = resolve(process.cwd(), "./samples/caddy.sample.json");
    const parent = resolve(process.cwd(), "../caddy.json");

    if (existsSync(vps)) configPath = vps;
    else if (existsSync(local)) configPath = local;
    else if (existsSync(sample)) configPath = sample;
    else if (existsSync(parent)) configPath = parent;
    else configPath = vps;
  }

  // 2. Resolve Document Root Path
  let rootPath = customDocRoot ? resolve(process.cwd(), customDocRoot) : null;
  if (!rootPath) {
    if (process.platform === "linux" || existsSync("/etc/caddy")) {
      rootPath = `/usr/share/${domain}`;
    } else {
      rootPath = resolve(process.cwd(), `./public/${domain}`);
    }
  }

  return { configPath, rootPath };
}

/**
 * Reads and parses Caddy JSON configuration safely.
 * @param {string} filePath
 * @returns {object}
 */
export function readCaddyConfig(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Caddy configuration file not found at: ${filePath}`);
  }
  const raw = readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse Caddy JSON at ${filePath}: ${err.message}`);
  }
}

/**
 * Writes Caddy JSON configuration with atomic timestamped backup.
 * @param {string} filePath
 * @param {object} config
 * @param {object} [options={}]
 * @param {boolean} [options.backup=true]
 * @returns {{ filePath: string, backupFile: string|null }}
 */
export function writeCaddyConfig(filePath, config, { backup = true } = {}) {
  let backupFile = null;
  if (backup && existsSync(filePath)) {
    backupFile = `${filePath}.bak.${Date.now()}`;
    copyFileSync(filePath, backupFile);
  }
  writeFileSync(filePath, JSON.stringify(config, null, 2), "utf8");
  return { filePath, backupFile };
}

/**
 * Builds a standard Caddy route AST for static file serving.
 * Matches production syntax: subroute with vars root and file_server.
 * @param {string} domain
 * @param {string} rootPath
 * @returns {object}
 */
export function buildStaticRoute(domain, rootPath) {
  const normDomain = domain.trim().toLowerCase();
  const normRoot = rootPath.trim();

  return {
    match: [
      {
        host: [normDomain]
      }
    ],
    handle: [
      {
        handler: "subroute",
        routes: [
          {
            handle: [
              {
                handler: "vars",
                root: normRoot
              },
              {
                handler: "file_server",
                hide: ["/etc/caddy/Caddyfile"]
              }
            ]
          }
        ]
      }
    ],
    terminal: true
  };
}

/**
 * Ensures the target document root exists and injects starter index.html (and optional sitemap.xml).
 * @param {string} rootPath
 * @param {string} domain
 * @param {object} [options={}]
 * @param {boolean} [options.overwrite=false]
 * @param {boolean} [options.xml=false]
 * @returns {{ rootPath: string, filesCreated: string[], existed: boolean }}
 */
export function provisionDocumentRoot(rootPath, domain, { overwrite = false, xml = false } = {}) {
  const existed = existsSync(rootPath);
  if (!existed) {
    mkdirSync(rootPath, { recursive: true });
  }

  const filesCreated = [];
  const indexPath = join(rootPath, "index.html");

  if (!existsSync(indexPath) || overwrite) {
    const html = generateStarterHtml(domain, { root: rootPath });
    writeFileSync(indexPath, html, "utf8");
    filesCreated.push("index.html");
  }

  if (xml) {
    const sitemapPath = join(rootPath, "sitemap.xml");
    if (!existsSync(sitemapPath) || overwrite) {
      const sitemap = generateStarterXml(domain);
      writeFileSync(sitemapPath, sitemap, "utf8");
      filesCreated.push("sitemap.xml");
    }
  }

  return {
    rootPath,
    filesCreated,
    existed
  };
}

/**
 * Extracts all routes from standard Caddy apps.http.servers structure.
 * @param {object} caddyConfig
 * @returns {Array<object>}
 */
export function getOrCreateRoutes(caddyConfig) {
  if (!caddyConfig.apps) caddyConfig.apps = {};
  if (!caddyConfig.apps.http) caddyConfig.apps.http = {};
  if (!caddyConfig.apps.http.servers) caddyConfig.apps.http.servers = {};

  const serverKeys = Object.keys(caddyConfig.apps.http.servers);
  let serverKey = serverKeys[0];
  if (!serverKey) {
    serverKey = "srv0";
    caddyConfig.apps.http.servers[serverKey] = {
      listen: [":443"],
      routes: []
    };
  }

  const server = caddyConfig.apps.http.servers[serverKey];
  if (!Array.isArray(server.routes)) {
    server.routes = [];
  }
  return server.routes;
}

/**
 * Finds index of an existing route matching host domain.
 * @param {Array<object>} routes
 * @param {string} domain
 * @returns {number} -1 if not found
 */
export function findRouteIndex(routes, domain) {
  const targetHost = domain.toLowerCase();
  return routes.findIndex((r) => {
    if (!Array.isArray(r.match)) return false;
    return r.match.some(
      (m) => Array.isArray(m.host) && m.host.some((h) => h.toLowerCase() === targetHost)
    );
  });
}

/**
 * Upserts a Caddy route.
 * @param {Array<object>} routes
 * @param {string} domain
 * @param {object} newRoute
 * @param {boolean} force
 * @returns {number} route index
 */
export function upsertRoute(routes, domain, newRoute, force = false) {
  const existingIdx = findRouteIndex(routes, domain);
  if (existingIdx !== -1) {
    if (!force) {
      throw new Error(`Domain '${domain}' is already configured in Caddy at route index ${existingIdx}. Use --force to replace.`);
    }
    routes[existingIdx] = newRoute;
    return existingIdx;
  }
  routes.push(newRoute);
  return routes.length - 1;
}

/**
 * End-to-end initialization of a static file server subdomain:
 * 1. Provision Ubuntu filesystem directory & starter index.html
 * 2. Injects Caddy file_server route with auto-backup
 * 3. Hot-reloads Caddy server (optional)
 * 4. Probes live HTTPS response (optional)
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function initStaticSite({
  domain,
  root = null,
  configPath = null,
  force = true,
  backup = true,
  reload = true,
  probe = true,
  xml = false
} = {}) {
  if (!domain) {
    throw new Error("Missing required 'domain' parameter (e.g. 'call.keshavsoft.com')");
  }

  const { configPath: resolvedConfig, rootPath: resolvedRoot } = resolveDefaultPaths(configPath, root, domain);

  // 1. Filesystem Provisioning
  const fsResult = provisionDocumentRoot(resolvedRoot, domain, { overwrite: force, xml });

  // 2. Caddy Config Update
  const config = readCaddyConfig(resolvedConfig);
  const routes = getOrCreateRoutes(config);
  const newRoute = buildStaticRoute(domain, resolvedRoot);
  const routeIndex = upsertRoute(routes, domain, newRoute, force);
  const { backupFile } = writeCaddyConfig(resolvedConfig, config, { backup });

  // 3. Hot-Reload Caddy
  let reloaded = false;
  let reloadMessage = "Skipped";
  if (reload) {
    try {
      execSync(`caddy reload --config "${resolvedConfig}"`, { stdio: "ignore" });
      reloaded = true;
      reloadMessage = "Success";
    } catch {
      reloadMessage = "Skipped (caddy binary not found in PATH or server not running)";
    }
  }

  // 4. Live HTTPS Probe
  let liveStatus = "Not probed";
  if (probe) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://${domain}`, { signal: controller.signal });
      clearTimeout(timeout);
      liveStatus = res.status === 200 ? "Yes (200 OK - Verified)" : `HTTP ${res.status}`;
    } catch {
      liveStatus = "Pending (Waiting for DNS / SSL propagation)";
    }
  }

  return {
    domain,
    rootPath: resolvedRoot,
    configPath: resolvedConfig,
    backupFile,
    routeIndex,
    newRoute,
    filesCreated: fsResult.filesCreated,
    reloaded,
    reloadMessage,
    liveStatus
  };
}

/**
 * Checks both the Ubuntu filesystem and Caddy configuration for a domain.
 * @param {string} domain
 * @param {object} [options={}]
 * @returns {object}
 */
export function checkStaticSite(domain, { root = null, configPath = null } = {}) {
  if (!domain) {
    throw new Error("Missing required 'domain' parameter");
  }

  const { configPath: resolvedConfig, rootPath: resolvedRoot } = resolveDefaultPaths(configPath, root, domain);

  // 1. Filesystem check
  const fsExists = existsSync(resolvedRoot);
  let hasIndexHtml = false;
  let fileCount = 0;
  if (fsExists) {
    const indexPath = join(resolvedRoot, "index.html");
    hasIndexHtml = existsSync(indexPath);
    try {
      fileCount = readdirSync(resolvedRoot).length;
    } catch {
      fileCount = 0;
    }
  }

  // 2. Caddy check
  let caddyExists = false;
  let caddyHandler = null;
  let configuredRoot = null;
  let routeIndex = -1;
  let serverKey = null;

  try {
    const config = readCaddyConfig(resolvedConfig);
    const servers = config.apps?.http?.servers || {};
    for (const [sKey, sVal] of Object.entries(servers)) {
      const idx = findRouteIndex(sVal.routes || [], domain);
      if (idx !== -1) {
        caddyExists = true;
        serverKey = sKey;
        routeIndex = idx;
        const route = sVal.routes[idx];
        for (const h of route.handle || []) {
          if (h.handler === "subroute") {
            for (const sub of h.routes || []) {
              for (const subH of sub.handle || []) {
                if (subH.handler === "vars" && subH.root) configuredRoot = subH.root;
                if (subH.handler === "file_server") caddyHandler = "file_server";
                if (subH.handler === "reverse_proxy") caddyHandler = "reverse_proxy";
              }
            }
          } else if (h.handler === "file_server") {
            caddyHandler = "file_server";
          } else if (h.handler === "static_response") {
            caddyHandler = "static_response";
          }
        }
        break;
      }
    }
  } catch {
    // Config unreadable
  }

  return {
    domain,
    filesystem: {
      rootPath: resolvedRoot,
      exists: fsExists,
      hasIndexHtml,
      fileCount
    },
    caddy: {
      configPath: resolvedConfig,
      exists: caddyExists,
      serverKey,
      routeIndex,
      handler: caddyHandler,
      configuredRoot
    }
  };
}

/**
 * Lists all static file server entries registered in Caddy and validates disk status.
 * @param {string} [configPath]
 * @returns {Array<object>}
 */
export function listStaticSites(configPath = null) {
  const { configPath: resolvedConfig } = resolveDefaultPaths(configPath);
  const config = readCaddyConfig(resolvedConfig);
  const results = [];

  const servers = config.apps?.http?.servers || {};
  for (const [serverKey, sVal] of Object.entries(servers)) {
    (sVal.routes || []).forEach((route, idx) => {
      const domains = [];
      (route.match || []).forEach((m) => {
        if (Array.isArray(m.host)) domains.push(...m.host);
      });

      let handler = "unknown";
      let docRoot = null;

      for (const h of route.handle || []) {
        if (h.handler === "subroute") {
          for (const sub of h.routes || []) {
            for (const subH of sub.handle || []) {
              if (subH.handler === "vars" && subH.root) docRoot = subH.root;
              if (subH.handler === "file_server") handler = "file_server";
              if (subH.handler === "reverse_proxy") handler = "reverse_proxy";
            }
          }
        } else if (h.handler === "file_server") {
          handler = "file_server";
        } else if (h.handler === "static_response") {
          handler = "static_response";
        }
      }

      if (handler === "file_server") {
        for (const dom of domains) {
          const fsExists = docRoot ? existsSync(docRoot) : false;
          results.push({
            domain: dom,
            docRoot: docRoot || "(not set)",
            serverKey,
            routeIndex: idx,
            fsExists
          });
        }
      }
    });
  }

  return results;
}

export default {
  resolveDefaultPaths,
  readCaddyConfig,
  writeCaddyConfig,
  buildStaticRoute,
  provisionDocumentRoot,
  initStaticSite,
  checkStaticSite,
  listStaticSites,
  generateStarterHtml,
  generateStarterXml
};
