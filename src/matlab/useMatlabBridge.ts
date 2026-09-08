import { useCallback, useEffect, useRef, useState } from "react";
import type { ExportResult, MatlabConfig, MatlabSnapshot, Reply } from "./types";

const API = "http://127.0.0.1:8765/api";
function message(e: unknown) {
  if (e instanceof TypeError) return "无法访问桥接服务。请运行统一启动脚本，并检查桥接日志。";
  if (e instanceof DOMException && e.name === "TimeoutError") return "等待 MATLAB 响应超时；操作结果尚未确认，请查看连接状态和 MATLAB 日志。";
  return e instanceof Error ? e.message : String(e);
}
type Job = { action: string; data: object; done: (ok: boolean) => void };
export function useMatlabBridge() {
  const client = useRef(crypto.randomUUID());
  const [snapshot, setSnapshot] = useState<MatlabSnapshot | null>(null);
  const [online, setOnline] = useState(false);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [pauseQueued, setPauseQueued] = useState(false);
  const [exported, setExported] = useState<ExportResult>();
  const [draft, setDraft] = useState<Partial<MatlabConfig>>({});
  const [age, setAge] = useState(0);
  const patchRef = useRef<Partial<MatlabConfig>>({});
  const inFlightPatch = useRef<Partial<MatlabConfig>>({});
  const busy = useRef(false), lastSuccess = useRef(0);
  const snapshotRef = useRef<MatlabSnapshot | null>(null);
  const jobs = useRef<Job[]>([]);
  const accept = useCallback((reply: Reply) => {
    if (!reply.snapshot) return;
    const s = reply.snapshot;
    if (s.protocol !== 31 || s.release !== "2025b" || !Number.isFinite(s.state.time))
      throw new Error("服务版本不匹配。V3.1 网页需要 V3.1 桥接与 MATLAB R2025b 服务，请重启项目服务。");
    if (snapshotRef.current && snapshotRef.current.sessionId === s.sessionId && s.sequence < snapshotRef.current.sequence) return;
    s.events = Array.isArray(s.events) ? s.events : s.events ? [s.events] : [];
    s.savedRuns = Array.isArray(s.savedRuns) ? s.savedRuns : s.savedRuns ? [s.savedRuns] : [];
    snapshotRef.current = s;
    setSnapshot(s); setOnline(true); setConnectionError(""); lastSuccess.current = Date.now();
  }, []);
  const request = useCallback(async (action: string, data: object = {}) => {
    const res = await fetch(API + "/command", {
      method: "POST", headers: { "Content-Type": "application/json", "X-ValveLab-Client": client.current },
      body: JSON.stringify({ action, ...data }), signal: AbortSignal.timeout(32000),
    });
    const reply: Reply = await res.json();
    setBridgeOnline(reply.service === "valvelab-bridge" && reply.version === "3.1");
    accept(reply);
    if (!reply.ok) throw new Error(reply.error || "MATLAB 拒绝了请求。");
    return reply;
  }, [accept]);
  const flush = useCallback(async () => {
    if (!Object.keys(patchRef.current).length) return;
    const patch = patchRef.current; patchRef.current = {}; inFlightPatch.current = patch;
    try { await request("configure", { patch }); }
    finally { inFlightPatch.current = {}; setDraft({ ...patchRef.current }); }
  }, [request]);
  const pump = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      while (jobs.current.length || Object.keys(patchRef.current).length) {
        const job = jobs.current.shift();
        setPendingAction(job?.action ?? "configure"); setError("");
        try {
          if (job?.action === "release") { patchRef.current = {}; setDraft({}); }
          else if (job?.action !== "pause") await flush();
          if (job) {
            const reply = await request(job.action, job.data);
            if (reply.result?.mat) setExported(reply.result);
            job.done(true);
          }
        } catch (e) { setError(message(e)); job?.done(false); }
        if (job?.action === "pause") setPauseQueued(false);
      }
    } finally { busy.current = false; setPendingAction(""); }
  }, [flush, request]);
  const command = useCallback((action: string, data: object = {}) => new Promise<boolean>((done) => {
    const job = { action, data, done };
    if (action === "pause") { jobs.current.unshift(job); setPauseQueued(true); }
    else jobs.current.push(job);
    void pump();
  }), [pump]);
  const update = useCallback((patch: Partial<MatlabConfig>) => {
    if (snapshotRef.current?.owner !== client.current || Date.now() - lastSuccess.current > 3000) return;
    patchRef.current = { ...patchRef.current, ...patch }; setDraft({ ...inFlightPatch.current, ...patchRef.current });
  }, []);
  useEffect(() => {
    let disposed = false, polling = false, heartbeating = false;
    const poll = async () => {
      if (polling || busy.current) return;
      polling = true;
      try {
        const res = await fetch(API + "/status", { signal: AbortSignal.timeout(3500) });
        const reply: Reply = await res.json();
        if (disposed) return;
        setBridgeOnline(reply.service === "valvelab-bridge" && reply.version === "3.1");
        if (!reply.ok) throw new Error(reply.error);
        accept(reply);
      } catch (e) { if (!disposed) { setOnline(false); if (e instanceof TypeError) setBridgeOnline(false); setConnectionError(message(e)); } }
      finally { polling = false; }
    };
    const heartbeat = async () => {
      if (heartbeating || snapshotRef.current?.owner !== client.current) return;
      heartbeating = true;
      try { await request("heartbeat"); }
      catch (e) { if (!disposed) { setOnline(false); setConnectionError(message(e)); } }
      finally { heartbeating = false; }
    };
    void poll();
    const timers = [setInterval(() => void poll(), 250), setInterval(() => void heartbeat(), 1000),
      setInterval(() => void pump(), 180), setInterval(() => {
        const elapsed = Date.now() - lastSuccess.current;
        setAge(elapsed); if (elapsed > 3000) setOnline(false);
      }, 500)];
    return () => { disposed = true; timers.forEach(clearInterval); };
  }, [accept, request, pump]);
  const owns = online && snapshot?.owner === client.current;
  const lab = snapshot ? { ...snapshot, config: { ...snapshot.config, ...draft }, running: online && snapshot.running, update } : null;
  return { snapshot, lab, online, bridgeOnline, owns, canPause: snapshot?.owner === client.current, pending: !!pendingAction, pendingAction, pauseQueued,
    error: error || connectionError || snapshot?.error || "", exported, command, age, hasDraft: Object.keys(draft).length > 0 };
}

