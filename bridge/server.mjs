import http from "node:http";
import net from "node:net";

const HTTP_PORT = 8765;
const MATLAB_PORT = 8776;
const origins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:8765",
]);
const actions = new Set([
  "connect",
  "release",
  "heartbeat",
  "configure",
  "run",
  "pause",
  "step",
  "reset",
  "selectValve",
  "openModel",
  "openScopes",
  "openSDI",
  "export",
  "prepareLesson",
  "cancelLesson",
  "sensorLesson",
  "compareRun",
  "openAnalysis",
]);
let socket,
  buffer = "",
  pending = null,
  sequence = 0,
  queue = Promise.resolve(),
  queued = 0;

function closeLink(error) {
  const current = socket;
  socket = undefined;
  buffer = "";
  current?.destroy();
  if (pending) {
    clearTimeout(pending.timer);
    pending.reject(error);
    pending = null;
  }
}
function rpc(request) {
  if (queued >= 20) return Promise.reject(new Error("MATLAB 命令队列已满。"));
  queued++;
  const submitted = Date.now();
  const job = queue.then(
    () =>
      new Promise((resolve, reject) => {
        if (Date.now() - submitted > 5000) {
          reject(new Error("排队请求已过期，未发送至 MATLAB。"));
          return;
        }
        const id = ++sequence;
        pending = {
          id,
          resolve,
          reject,
          timer: setTimeout(
            () =>
              closeLink(
                new Error("MATLAB 请求超时；执行结果未确认，请重新读取状态。"),
              ),
            30000,
          ),
        };
        const send = () =>
          socket.write(JSON.stringify({ ...request, id }) + "\n");
        if (socket?.readyState === "open") {
          send();
          return;
        }
        socket = net.createConnection({ host: "127.0.0.1", port: MATLAB_PORT });
        socket.setEncoding("utf8");
        socket.setNoDelay(true);
        socket.on("data", (chunk) => {
          buffer += chunk;
          if (buffer.length > 1024 * 1024) {
            closeLink(new Error("MATLAB 响应过大。"));
            return;
          }
          let newline;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            let message;
            try {
              message = JSON.parse(line);
            } catch {
              closeLink(new Error("MATLAB 协议响应无效。"));
              return;
            }
            if (!pending || message.id !== pending.id) {
              closeLink(new Error("MATLAB 响应序号不匹配。"));
              return;
            }
            clearTimeout(pending.timer);
            const p = pending;
            pending = null;
            p.resolve(message);
          }
        });
        socket.on("error", (error) =>
          closeLink(new Error(`MATLAB V3.1 服务未就绪，请运行统一启动脚本并查看 MATLAB 日志（${error.code || error.message}）。`)),
        );
        socket.on("end", () => closeLink(new Error("MATLAB 已断开连接。")));
        socket.once("connect", send);
      }),
  );
  queue = job
    .catch(() => {})
    .finally(() => {
      queued--;
    });
  return job;
}

function respond(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify({ ...body, service: "valvelab-bridge", version: "3.1" }));
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (
    !["127.0.0.1:8765", "localhost:8765"].includes(req.headers.host) ||
    (origin && !origins.has(origin))
  ) {
    respond(res, 403, { ok: false, error: "不允许的本地请求来源。" });
    return;
  }
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-ValveLab-Client",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    if (req.method === "GET" && req.url === "/api/health") {
      respond(res, 200, { ok: true, protocol: 31 });
      return;
    }
    if (req.method === "GET" && req.url === "/api/status") {
      respond(res, 200, await rpc({ action: "status" }));
      return;
    }
    if (req.method !== "POST" || req.url !== "/api/command") {
      respond(res, 404, { ok: false, error: "未知接口。" });
      return;
    }
    if (!(req.headers["content-type"] || "").startsWith("application/json")) {
      respond(res, 415, { ok: false, error: "请求必须为 JSON。" });
      return;
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 16384) {
        respond(res, 413, { ok: false, error: "请求体过大。" });
        return;
      }
      chunks.push(chunk);
    }
    const command = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const client = req.headers["x-valvelab-client"];
    if (
      !command ||
      Array.isArray(command) ||
      !actions.has(command.action) ||
      typeof client !== "string" ||
      !/^[a-zA-Z0-9-]{16,64}$/.test(client)
    ) {
      respond(res, 400, { ok: false, error: "命令或客户端标识无效。" });
      return;
    }
    if (
      Object.keys(command).some(
        (k) => !["action", "patch", "valveId", "lessonId", "waveform", "runId", "name"].includes(k),
      )
    ) {
      respond(res, 400, { ok: false, error: "未知命令字段。" });
      return;
    }
    const reply = await rpc({ ...command, client });
    respond(res, reply.ok ? 200 : 409, reply);
  } catch (error) {
    respond(res, error instanceof SyntaxError ? 400 : 503, {
      ok: false,
      error: error.message,
    });
  }
});
server.requestTimeout = 35000;
server.listen(HTTP_PORT, "127.0.0.1", () =>
  console.log(
    `ValveLab bridge http://127.0.0.1:${HTTP_PORT} -> MATLAB TCP ${MATLAB_PORT}`,
  ),
);
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
