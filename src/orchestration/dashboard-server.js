import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const dashboardDir = join(process.cwd(), "dashboard");

const mimeByExtension = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

function sanitizePath(urlPath) {
  if (!urlPath || urlPath === "/") {
    return "index.html";
  }

  return urlPath.replace(/^\/+/, "").replace(/\.\./g, "");
}

const server = createServer(async (request, response) => {
  try {
    const filePath = sanitizePath(request.url);
    const absolutePath = join(dashboardDir, filePath);
    const fileContents = await readFile(absolutePath);

    response.writeHead(200, {
      "Content-Type": mimeByExtension[extname(filePath)] ?? "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(fileContents);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Dashboard asset not found");
  }
});

server.listen(port, host, () => {
  console.log(`Dashboard available at http://${host}:${port}`);
});
