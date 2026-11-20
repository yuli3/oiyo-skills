#!/usr/bin/env node
// 법령 인용 점검 (2026-11-20). 스킬 문서·스크립트의 law.go.kr 조문 링크를 모아
// 1) 인용한 조문이 법제처 DB에 실제로 있는지, 2) 지난 점검 뒤 개정(MST 변경)됐는지 확인한다.
// WHY: 조문 색인은 사람이 쓴 정적 링크라 조문 이동·삭제·개정을 모른다. 틀린 인용은 스킬 신뢰를 깎는다.
// 조회는 korean-law-mcp(MIT, 공식 MCP Registry io.github.chrisryugj/korean-law-mcp) 원격 서버를 쓴다.
// 키 없이 공유 한도로 동작하고, 저장소 시크릿 LAW_OC(법제처 Open API 인증키)가 있으면 그 키로 부른다.
// 외부 서버라 결과는 점검 보고용으로만 쓴다(스킬 실행 경로에는 넣지 않는다).
//
// 사용: node scripts/law-watch.mjs [--state prev.json] [--out out-dir] [--limit N]
// 출력: <out>/report.md, <out>/state.json({법령ID: MST}), <out>/summary.json
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ENDPOINT = process.env.LAW_MCP_URL || "https://mcp.gomdori.app/law";
const API_KEY = process.env.LAW_OC || "";
const ROOT = new URL("..", import.meta.url).pathname;
const SCAN_DIRS = ["skills"];
const BATCH = 12; // verify_citations 한 번에 볼 인용 수(서버 상한 30, 공유 한도 배려)
const PAUSE_MS = 1500;

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const statePath = opt("--state", "");
const outDir = opt("--out", join(ROOT, "law-watch-out"));
const limit = Number(opt("--limit", "0")) || Infinity;

// ---- 1. 인용 수집 ---------------------------------------------------------------
function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(md|mjs)$/.test(name)) files.push(path);
  }
  return files;
}

// https://www.law.go.kr/법령/<법령명(공백 없음)>/<제N조(의M)> — 인코딩된 형태도 받는다.
const escape = ch => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LINK = /https?:\/\/(?:www\.)?law\.go\.kr\/(?:%EB%B2%95%EB%A0%B9|법령)\/([^/\s)"'`>]+)\/(제\d+조(?:의\d+)?)/g;

export function collectCitations(root = ROOT) {
  const byKey = new Map();
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(root, dir))) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        for (const match of line.matchAll(LINK)) {
          let law;
          try { law = decodeURIComponent(match[1]); } catch { law = match[1]; }
          if (law.includes("${")) continue; // 템플릿 문자열(코드가 링크를 만드는 자리)
          const article = match[2];
          const key = `${law} ${article}`;
          const where = `${relative(root, file)}:${index + 1}`;
          if (!byKey.has(key)) byKey.set(key, { law, article, cite: key, where: [] });
          const entry = byKey.get(key);
          entry.where.push(where);
          // 링크 주소는 공백을 뺀 법령명이라, 같은 줄 본문의 띄어 쓴 정식 이름을 찾아 검증 입력으로 쓴다.
          const spaced = line.match(new RegExp([...law].map(escape).join("\\s*")));
          if (spaced && spaced[0].includes(" ")) entry.cite = `${spaced[0]} ${article}`;
        }
      });
    }
  }
  return [...byKey.values()].sort((a, b) => (a.law + a.article).localeCompare(b.law + b.article, "ko"));
}

// ---- 2. MCP 호출 ----------------------------------------------------------------
let sessionId = "";
let rpcId = 0;
async function rpc(method, params) {
  const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  if (API_KEY) headers.apikey = API_KEY;
  const body = JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params });
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(ENDPOINT, { method: "POST", headers, body, signal: AbortSignal.timeout(90_000) });
      const sid = response.headers.get("mcp-session-id");
      if (sid) sessionId = sid;
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      const json = text.trimStart().startsWith("{")
        ? JSON.parse(text)
        : JSON.parse(text.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).filter(Boolean).pop());
      if (json.error) throw new Error(`RPC ${json.error.code}: ${json.error.message}`);
      return json.result;
    } catch (error) {
      lastError = error;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw lastError;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "oiyo-law-watch", version: "1.0.0" } });
  try { await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(sessionId && { "Mcp-Session-Id": sessionId }) }, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) }); } catch { /* 알림 실패는 무시 */ }
}

async function callTool(name, toolArgs) {
  const result = await rpc("tools/call", { name, arguments: API_KEY ? { ...toolArgs, apiKey: API_KEY } : toolArgs });
  const text = (result?.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
  return { text, isError: Boolean(result?.isError) };
}

// ---- 3. 결과 해석 ----------------------------------------------------------------
// verify_citations 줄 형식: "✓ 「민법」 제160조(역에 의한 계산) 실존", "✗ … [NOT_FOUND] …", "⚠ …", "⌛ … [REPEALED] …"
export function parseVerifyLines(text) {
  return text.split("\n").map(l => l.trim()).filter(l => /^[✓✗⚠⌛]/.test(l)).map(line => ({
    mark: line[0], line, law: (line.match(/「([^」]+)」/) || [])[1] || "",
  }));
}

const squash = s => s.replace(/\s+/g, "");

export function matchVerdicts(citations, verdictLines) {
  // 줄 순서가 입력 순서와 같다는 보장이 없어 법령명(공백 제거)+조문으로 맞춘다.
  return citations.map(cite => {
    const hit = verdictLines.find(v => squash(v.line).includes(squash(cite.law)) && v.line.includes(cite.article))
      || verdictLines.find(v => squash(v.law) === squash(cite.law) && v.line.includes(cite.article));
    return { ...cite, mark: hit?.mark || "?", detail: hit?.line || "응답에서 이 인용을 찾지 못함", officialLaw: hit?.law || "" };
  });
}

// search_law_bulk 응답 끝의 스냅샷 JSON({법령ID: MST})
export function parseSnapshot(text) {
  const tail = text.split("스냅샷").pop() || "";
  const match = tail.match(/\{[\s\S]*?\}/);
  if (!match) return {};
  try { return JSON.parse(match[0]); } catch { return {}; }
}

// ---- 4. 실행 ---------------------------------------------------------------------
async function main() {
  const citations = collectCitations().slice(0, limit);
  console.log(`인용 ${citations.length}건 수집`);
  await connect();

  const verdictLines = [];
  for (let i = 0; i < citations.length; i += BATCH) {
    const batch = citations.slice(i, i + BATCH);
    const text = batch.map(c => c.cite).join("\n");
    try {
      const { text: out } = await callTool("legal_analysis", { mode: "verify_citations", text, maxCitations: batch.length });
      verdictLines.push(...parseVerifyLines(out));
    } catch (error) {
      console.error(`검증 실패 (${i}~): ${error.message}`);
    }
    await sleep(PAUSE_MS);
  }
  const results = matchVerdicts(citations, verdictLines);

  // 개정 감시: 공식 법령명 목록으로 search_law_bulk diff
  const laws = [...new Set(results.map(r => r.officialLaw).filter(Boolean))].sort();
  const previous = statePath && existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : null;
  const snapshot = {};
  const changedBlocks = [];
  for (let i = 0; i < laws.length; i += 15) {
    const queries = laws.slice(i, i + 15); // 요청 단위 업스트림 예산 때문에 작게 나눈다
    try {
      const params = { queries, includeUpcoming: true };
      if (previous) params.previous = previous;
      const { text } = await callTool("execute_tool", { tool_name: "search_law_bulk", params });
      Object.assign(snapshot, parseSnapshot(text));
      if (previous) changedBlocks.push(text);
    } catch (error) {
      console.error(`개정 조회 실패 (${i}~): ${error.message}`);
    }
    await sleep(PAUSE_MS);
  }
  const changedIds = previous ? Object.keys(snapshot).filter(id => previous[id] && previous[id] !== snapshot[id]) : [];

  const bad = results.filter(r => r.mark === "✗" || r.mark === "⌛");
  const unsure = results.filter(r => r.mark === "⚠" || r.mark === "?");
  const ok = results.filter(r => r.mark === "✓");
  const today = new Date().toISOString().slice(0, 10);
  const row = r => `- ${r.law} ${r.article} — ${r.detail}\n  - 위치: ${r.where.slice(0, 3).join(", ")}${r.where.length > 3 ? ` 외 ${r.where.length - 3}곳` : ""}`;
  let report = `# 법령 인용 점검 ${today}\n\n`;
  report += `인용 ${results.length}건: 확인 ${ok.length} · 오류 ${bad.length} · 확인 필요 ${unsure.length} · 감시 법령 ${Object.keys(snapshot).length}개`;
  report += previous ? ` · 지난 점검 뒤 개정 ${changedIds.length}개\n\n` : ` (첫 점검: 개정 비교 기준 저장)\n\n`;
  if (bad.length) report += `## 고칠 인용 (없는 조문·폐지 법령)\n\n${bad.map(row).join("\n")}\n\n`;
  if (changedIds.length) report += `## 개정된 법령 (스킬 설명이 아직 맞는지 확인)\n\n${changedBlocks.join("\n\n").slice(0, 6000)}\n\n`;
  if (unsure.length) report += `<details><summary>확인 필요 ${unsure.length}건</summary>\n\n${unsure.map(row).join("\n")}\n\n</details>\n\n`;
  report += `원본은 tools-oiyo의 src/lib/kr-law-packs-2026.ts 등에서 고친 뒤 이 저장소로 옮긴다. 조회: korean-law-mcp(${ENDPOINT}), 법제처 국가법령정보.\n`;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "report.md"), report);
  // 일부 조회가 실패해도 이전 기준은 지킨다.
  writeFileSync(join(outDir, "state.json"), JSON.stringify({ ...(previous || {}), ...snapshot }, null, 2) + "\n");
  const summary = { date: today, citations: results.length, ok: ok.length, bad: bad.length, unsure: unsure.length, changed: changedIds.length, laws: Object.keys(snapshot).length, verified: verdictLines.length > 0 };
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary) + "\n");
  console.log(JSON.stringify(summary));
  if (!verdictLines.length) process.exitCode = 2; // 서버에 닿지 못함
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(error => { console.error(error); process.exit(1); });
