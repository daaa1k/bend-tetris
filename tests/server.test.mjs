import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { request } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const serverFile = new URL("../server.mjs", import.meta.url);

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port, path }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer(child, port) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`server exited: ${child.exitCode}`);
    try { await get(port, "/missing.txt"); return; } catch { /* startup pending */ }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("server did not start");
}

test("serves only files inside dist", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "bend-server-"));
  const dist = join(directory, "dist");
  const backup = join(directory, "dist-backup");
  let child;
  let symlinkSkipReason;
  try {
    await mkdir(dist);
    await mkdir(backup);
    await writeFile(join(dist, "index.html"), "index content");
    await writeFile(join(dist, "asset.js"), "asset content");
    await writeFile(join(backup, "private.txt"), "private content");
    try {
      await symlink(join(backup, "private.txt"), join(dist, "linked.txt"));
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) {
        symlinkSkipReason = `symlink creation unavailable: ${error.code}`;
      } else throw error;
    }

    const port = await freePort();
    child = spawn(process.execPath, [fileURLToPath(serverFile)], {
      cwd: directory,
      env: { ...process.env, PORT: String(port) },
      stdio: "ignore"
    });
    await waitForServer(child, port);

    assert.deepEqual(await get(port, "/"), { status: 200, body: "index content" });
    assert.deepEqual(await get(port, "/asset.js"), { status: 200, body: "asset content" });
    assert.equal((await get(port, "/missing.txt")).status, 404);
    assert.equal((await get(port, "/../dist-backup/private.txt")).status, 404);
    await t.test("rejects a symlink outside dist", { skip: symlinkSkipReason }, async () => {
      assert.equal((await get(port, "/linked.txt")).status, 404);
    });
  } finally {
    if (child) {
      if (child.exitCode === null) {
        child.kill();
        await new Promise((resolve) => child.once("exit", resolve));
      }
    }
    await rm(directory, { recursive: true, force: true });
  }
});
