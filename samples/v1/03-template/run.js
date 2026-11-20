import { generateStarterHtml, generateStarterXml } from "../../../src/v1/index.js";

console.log("=== Sample 03: Standalone Template Generation ===");
console.log("Generates starter HTML and XML for a domain without modifying Caddy.\n");

const domain = "call.keshavsoft.com";
const html = generateStarterHtml(domain, { root: "/usr/share/call.keshavsoft.com" });
const xml = generateStarterXml(domain);

console.log(`Generated HTML length: ${html.length} bytes`);
console.log(`Generated XML length:  ${xml.length} bytes`);
console.log("\nFirst 10 lines of HTML:");
console.log(html.split("\n").slice(0, 10).join("\n"));
console.log("\nXML Sitemap Preview:");
console.log(xml.trim());
