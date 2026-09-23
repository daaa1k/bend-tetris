import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = join(process.cwd(), "dist");
const apiKey = process.env.TYPESAFE_API_KEY;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".wasm": "application/wasm", ".png": "image/png" };

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error("request too large");
  }
  return JSON.parse(raw);
}

const server = createServer(async (request, response) => {
  if (request.url === "/api/jev/status") return json(response, 200, { configured: Boolean(apiKey) });

  if (request.url === "/api/jev/move" && request.method === "POST") {
    if (!apiKey) return json(response, 503, { error: "TYPESAFE_API_KEY is not configured" });
    try {
      const { board, piece, candidates } = await readJson(request);
      if (typeof board !== "string" || board.length > 500 || typeof piece !== "string" || !candidates || Object.keys(candidates).length > 60) {
        return json(response, 400, { error: "invalid game state" });
      }
      const upstream = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: "jev-latest",
          state: { game: "10x20 guideline-style falling-block puzzle", active_piece: piece, board, legal_placements: candidates },
          questions: {
            move: {
              type: "choice",
              instructions: "Choose the strongest legal placement for competitive play. Prioritize completed lines, then avoid holes and dangerous height, while keeping a flat flexible surface.",
              criteria: candidates
            }
          }
        })
      });
      const result = await upstream.json();
      if (!upstream.ok) return json(response, upstream.status, { error: result?.detail || result?.message || "Jev request failed" });
      return json(response, 200, { choice: result.answers?.move?.choice, confidence: result.answers?.move?.confidence ?? null });
    } catch (error) {
      return json(response, 502, { error: error.message });
    }
  }

  const pathname = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const file = normalize(join(root, pathname));
  if (!file.startsWith(root) || !existsSync(file)) { response.writeHead(404); return response.end("Not found"); }
  response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(response);
});

server.listen(port, () => console.log(`Bend / Tetris listening on http://localhost:${port}`));
