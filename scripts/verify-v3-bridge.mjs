import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
const client = randomUUID(),
  other = randomUUID(),
  base = "http://127.0.0.1:8765/api";
const checks = [];
const check = (condition, name) => {
  assert.ok(condition, name);
  checks.push(name);
};
async function send(action, data = {}, id = client) {
  const response = await fetch(base + "/command", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-ValveLab-Client": id },
    body: JSON.stringify({ action, ...data }),
  });
  return { status: response.status, ...(await response.json()) };
}
const status = async () =>
  (await (await fetch(base + "/status")).json()).snapshot;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
check(!(await send("run")).ok, "No control without lease");
check(
  (await send("evaluate", { patch: { code: "disp(1)" } })).status === 400,
  "Arbitrary MATLAB commands rejected",
);
check(
  (
    await fetch(base + "/status", {
      headers: { Origin: "https://example.com" },
    })
  ).status === 403,
  "Foreign origin rejected",
);
check((await send("connect")).ok, "Controller lease acquired");
check(!(await send("connect", {}, other)).ok, "Concurrent controller rejected");
const before = await status();
check(
  !(await send("configure", { patch: { kp: -1 } })).ok,
  "Out-of-range parameter rejected",
);
check(
  (await status()).config.kp === before.config.kp,
  "Invalid tuning leaves previous config intact",
);
check(
  !(await send("configure", { patch: { unexpected: 1 } })).ok,
  "Unknown parameter rejected",
);
check(
  !(await send("configure", { patch: { valveId: "gate" } })).ok,
  "Valve change cannot bypass reset command",
);
check(
  !(await send("configure", { patch: { manual: "100" } })).ok,
  "Numeric strings rejected",
);
await send("selectValve", { valveId: "control" });
await send("configure", { patch: { manual: 100 } });
await send("run");
await sleep(4200);
const lost = await status();
check(
  !lost.running && lost.owner === "",
  "Heartbeat loss pauses Simulink and releases controller",
);
check(
  lost.state.time > 0 && lost.state.time < 4,
  "Disconnect advances only to watchdog, with no catch-up",
);
check(
  lost.events.some((e) => e.message.includes("心跳丢失")),
  "Chinese event text preserved through UTF-8 TCP",
);
await sleep(300);
check(
  (await status()).state.time === lost.state.time,
  "Time stays frozen after watchdog",
);
await send("connect");
check(!(await status()).running, "Reconnecting does not restart simulation");
await send("step");
check(
  Math.abs((await status()).state.time - lost.state.time - 0.05) < 1e-8,
  "Single step resumes from actual paused time",
);
const exported = await send("export");
check(exported.ok, "MATLAB export command succeeds");
const csv = readFileSync(exported.result.csv, "utf8").trim().split(/\r?\n/);
check(
  csv.length - 1 === exported.result.samples,
  "CSV contains every recorded sample",
);
check(csv[0].split(",").length === 19, "CSV has 19 named signal columns");
check(
  readFileSync(exported.result.mat).subarray(0, 6).toString() === "MATLAB",
  "MATLAB MAT file is present",
);
const first = exported.result.mat;
const again = await send("export");
check(first !== again.result.mat, "Repeated exports use distinct files");
await send("reset");
check(
  (await status()).state.time === 0 && (await status()).sampleCount === 1,
  "Reset starts a new sample record",
);
await send("release");
check((await status()).owner === "", "Release leaves service available");
mkdirSync("output/validation", { recursive: true });
writeFileSync(
  "output/validation/v3-bridge-results.json",
  JSON.stringify(
    { passed: checks.length, checks, exports: exported.result },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    { passed: checks.length, checks, exports: exported.result },
    null,
    2,
  ),
);
