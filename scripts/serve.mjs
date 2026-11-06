/*
File: serve.mjs
Path: /scripts/serve.mjs
Project: AB Layout (Advocate Benefit Layout)
Developed by PrajnaBytes International Private Limited and RatioJuris
Copyright (C) 2026 PrajnaBytes International Private Limited and RatioJuris
SPDX-License-Identifier: GPL-3.0-or-later
Additional terms under GPLv3 section 7 apply (attribution and names) - see NOTICE.

Minimal static file server for development (no dependencies).
  npm run serve                 -> http://localhost:3000   (browser checks, UI tests)
  npm run serve -- --https      -> https://localhost:3000  (sideloading into Word;
                                   needs: npx office-addin-dev-certs install)
*/

import { createServer as createHttp } from "node:http";
import { createServer as createHttps } from "node:https";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const useHttps = args.includes("--https");
const portArg = args.find((a) => a.startsWith("--port="));
const port = portArg ? Number(portArg.split("=")[1]) : 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

/** @type {import("node:http").RequestListener} */
async function handler(req, res) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    let path = decodeURIComponent(url.pathname);
    if (path.startsWith("/ab-layout/")) path = path.slice("/ab-layout".length);
    const file = normalize(join(root, path));
    if (!file.startsWith(root) || file.includes("node_modules")) {
      res.writeHead(403).end();
      return;
    }
    const s = await stat(file).catch(() => null);
    const target = s && s.isDirectory() ? join(file, "index.html") : file;
    const body = await readFile(target);
    res.writeHead(200, {
      "Content-Type": TYPES[/** @type {keyof typeof TYPES} */ (extname(target))] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

let server;
if (useHttps) {
  const dir = join(homedir(), ".office-addin-dev-certs");
  const key = join(dir, "localhost.key");
  const cert = join(dir, "localhost.crt");
  if (!existsSync(key) || !existsSync(cert)) {
    console.error("Development certificates not found. Run: npx office-addin-dev-certs install");
    process.exit(1);
  }
  server = createHttps({ key: readFileSync(key), cert: readFileSync(cert) }, handler);
} else {
  server = createHttp(handler);
}

server.listen(port, () => {
  console.log(`AB Layout dev server: ${useHttps ? "https" : "http"}://localhost:${port}/web/taskpane.html`);
});

export { server };
