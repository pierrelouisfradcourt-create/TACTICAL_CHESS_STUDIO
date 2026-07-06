// Belote — serveur local minimal (Node http, zéro dépendance) pour l'interface jouable.
// DÉDIÉ à cet artefact : rien à voir avec demo-server.ts du builder llm-lego.
// Sert index.html + une petite API JSON par-dessus BeloteDriver (une partie en mémoire).
//
// Lancer : node web/server.mjs   (puis ouvrir http://localhost:4137)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BeloteDriver } from "./driver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, ".."); // experiments/belote-claude/
const PORT = Number(process.env.BELOTE_PORT || 4137);

let game = null; // une seule partie en mémoire (usage local mono-joueur)

function send(res, status, body, type = "application/json; charset=utf-8") {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(data);
}

function readJson(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function serveFile(res, relPath, type) {
  try {
    const buf = await readFile(join(ROOT, relPath));
    send(res, 200, buf, type);
  } catch {
    send(res, 404, { error: "not found: " + relPath }, "application/json; charset=utf-8");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  try {
    // --- statique ---
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      return serveFile(res, "index.html", "text/html; charset=utf-8");
    }

    // --- API ---
    if (path === "/api/new" && req.method === "POST") {
      const body = await readJson(req);
      const seed = Number.isFinite(+body.seed) ? +body.seed : 1;
      const target = Number.isFinite(+body.target) ? +body.target : 501;
      game = new BeloteDriver({ seed, target });
      return send(res, 200, game.view());
    }

    if (path === "/api/state" && req.method === "GET") {
      if (!game) return send(res, 409, { error: "aucune partie — appelez /api/new" });
      return send(res, 200, game.view());
    }

    if (path === "/api/bid" && req.method === "POST") {
      if (!game) return send(res, 409, { error: "aucune partie — appelez /api/new" });
      const body = await readJson(req);
      const r = game.humanBid(String(body.action || ""), body.suit ? String(body.suit) : undefined);
      if (!r.ok) return send(res, 400, { error: r.error, state: game.view() });
      return send(res, 200, game.view());
    }

    if (path === "/api/play" && req.method === "POST") {
      if (!game) return send(res, 409, { error: "aucune partie — appelez /api/new" });
      const body = await readJson(req);
      const r = game.playHuman(String(body.cardId || ""));
      if (!r.ok) return send(res, 400, { error: r.error, state: game.view() });
      return send(res, 200, game.view());
    }

    if (path === "/api/continue" && req.method === "POST") {
      if (!game) return send(res, 409, { error: "aucune partie — appelez /api/new" });
      game.continue();
      return send(res, 200, game.view());
    }

    return send(res, 404, { error: "route inconnue: " + path });
  } catch (err) {
    return send(res, 500, { error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, () => {
  console.log(`Belote (Claude) — interface jouable sur http://localhost:${PORT}`);
});
