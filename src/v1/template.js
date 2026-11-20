/**
 * Generates a clean, production-grade starter index.html for static site hosting.
 * @param {string} domain - Domain name (e.g. "call.keshavsoft.com")
 * @param {object} [options={}]
 * @param {string} [options.root] - Document root path
 * @param {string} [options.title] - Optional title override
 * @returns {string} HTML content
 */
export function generateStarterHtml(domain, { root = `/usr/share/${domain}`, title = null } = {}) {
  const displayTitle = title || domain;
  const isoDate = new Date().toISOString();
  const humanDate = new Date().toUTCString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${displayTitle} &mdash; Static Site Live on Caddy</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style>
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .status-pulse { animation: pulse-subtle 2.5s infinite; }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-100 antialiased min-h-screen flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">

  <!-- Header Banner -->
  <header class="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2.5">
        <span class="w-3 h-3 rounded-full bg-emerald-400 status-pulse"></span>
        <span class="font-mono text-xs sm:text-sm font-semibold tracking-wide text-zinc-300">${domain}</span>
      </div>
      <div class="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
        <i class="bi bi-shield-check"></i>
        <span>HTTPS Active</span>
      </div>
    </div>
  </header>

  <!-- Hero Content -->
  <main class="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col justify-center">

    <!-- Badge -->
    <div class="mb-4">
      <span class="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-mono font-semibold">
        <i class="bi bi-check2-circle"></i>
        <span>Stage 2 &bull; Caddy Static File Server Verified</span>
      </span>
    </div>

    <!-- Title -->
    <h1 class="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
      ${domain} is Live!
    </h1>
    <p class="text-zinc-400 text-sm sm:text-base mb-8 max-w-2xl leading-relaxed">
      This static response is being served directly from your server's filesystem by Caddy's native <code class="text-amber-300 font-mono">file_server</code> handler. Disk I/O, permissions, and TLS handshakes are functioning with 100% integrity.
    </p>

    <!-- Technical Diagnostics Card -->
    <div class="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 sm:p-6 mb-8 shadow-xl">
      <div class="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
        <i class="bi bi-cpu text-amber-400"></i>
        <span>Host Architecture Diagnostics</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        <div class="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
          <div class="text-zinc-500 text-[11px] mb-1">DOCUMENT ROOT</div>
          <div class="text-amber-300 font-semibold truncate">${root}</div>
        </div>
        <div class="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
          <div class="text-zinc-500 text-[11px] mb-1">CADDY HANDLER</div>
          <div class="text-cyan-400 font-semibold">file_server (subroute vars)</div>
        </div>
        <div class="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
          <div class="text-zinc-500 text-[11px] mb-1">INITIALIZED AT</div>
          <div class="text-zinc-300 truncate" title="${isoDate}">${humanDate}</div>
        </div>
        <div class="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
          <div class="text-zinc-500 text-[11px] mb-1">STATUS</div>
          <div class="text-emerald-400 font-semibold flex items-center gap-1.5">
            <i class="bi bi-broadcast"></i>
            <span>200 OK &bull; Live Inbound Traffic</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Next Steps Guides -->
    <section class="border-t border-zinc-800/80 pt-8">
      <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono mb-4 flex items-center gap-2">
        <i class="bi bi-signpost-split text-amber-400"></i>
        <span>Where To Go From Here</span>
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Path 1: Deploy Static Site -->
        <div class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div class="font-bold text-sm text-white mb-1.5 flex items-center gap-1.5">
              <i class="bi bi-folder2-open text-amber-400"></i>
              <span>Keep as Static Site / SPA</span>
            </div>
            <p class="text-xs text-zinc-400 leading-relaxed mb-3">
              Deploy your HTML, React, Vue, Vite, or Astro build output into <code class="text-zinc-200 font-mono">${root}</code>. Caddy delivers assets with automatic gzip/zstd compression.
            </p>
          </div>
          <div class="text-[11px] font-mono text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800/60 truncate">
            cp -r ./dist/* ${root}/
          </div>
        </div>

        <!-- Path 2: Promote to Node.js Backend -->
        <div class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div class="font-bold text-sm text-white mb-1.5 flex items-center gap-1.5">
              <i class="bi bi-arrow-up-circle text-cyan-400"></i>
              <span>Promote to Node.js / Docker App</span>
            </div>
            <p class="text-xs text-zinc-400 leading-relaxed mb-3">
              When you're ready for full backend SSR or APIs, configure a systemd service via <code class="text-zinc-200 font-mono">ubuntu-service-cli</code> and promote the route to a reverse proxy.
            </p>
          </div>
          <div class="text-[11px] font-mono text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800/60 truncate">
            npx caddy-subdomain add ${domain} 5000
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- Footer -->
  <footer class="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600 font-mono">
    Served by <span class="text-zinc-400 font-semibold">Caddy Server</span> &bull; Managed with <span class="text-amber-400">caddy-fileserver</span> &bull; KeshavSoft &copy; 2026
  </footer>

</body>
</html>
`;
}

/**
 * Generates a valid sitemap.xml for SEO indexing.
 * @param {string} domain
 * @returns {string} XML content
 */
export function generateStarterXml(domain) {
  const today = new Date().toISOString().split("T")[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}
