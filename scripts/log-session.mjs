#!/usr/bin/env node
// AI Contribution Weight: [100%] AI Generated / [0%] Human Refactored
// AI tool: Claude (claude.ai chat, Claude Sonnet 5.5) 2026-11-02
// File: scripts/log-session.mjs
// Copies a Claude Code session transcript into ai-history/ with personal data redacted,
// and prints facts about a session. Deterministic (no AI), never commits, fails closed.
//
// Usage:
//   node scripts/log-session.mjs --hook            (called by the SessionEnd hook; reads JSON on stdin)
//   node scripts/log-session.mjs [--file <path>]   (save newest transcript for this repo, or the given one)
//   node scripts/log-session.mjs --facts [<path>]  (print facts about a saved, redacted transcript)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const outDir = path.join(repo, 'ai-history');
const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
};
const sh = (cmd, a) => {
  try { return execFileSync(cmd, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], cwd: repo }).trim(); }
  catch { return ''; }
};
const parseLines = (text) => text.split('\n').filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);
const inRepo = (p) => { const r = path.resolve(p); return r === repo || r.startsWith(repo + path.sep); };

function findTranscript() {
  const root = path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(root)) return null;
  const cands = [];
  for (const dir of fs.readdirSync(root)) {
    const d = path.join(root, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
      if (f.endsWith('.jsonl')) cands.push({ p: path.join(d, f), m: fs.statSync(path.join(d, f)).mtimeMs });
    }
  }
  cands.sort((a, b) => b.m - a.m);
  for (const c of cands) {
    for (const l of fs.readFileSync(c.p, 'utf8').split('\n').slice(0, 40)) {
      try { const d = JSON.parse(l); if (d.cwd && inRepo(d.cwd)) return c.p; } catch { /* skip */ }
    }
  }
  return null;
}

function redactionRules() {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(repo, '.claude', 'redact.local.json'), 'utf8')); } catch { /* optional */ }
  const emails = new Set([...(cfg.email || []), sh('git', ['config', 'user.email'])].filter(Boolean));
  const names = new Set([...(cfg.name || []), sh('git', ['config', 'user.name'])].filter(Boolean));
  const rules = [];
  for (const e of emails) rules.push({ label: 'email', re: new RegExp(esc(e), 'gi'), to: '<email>' });
  for (const n of names) rules.push({ label: 'name', re: new RegExp(esc(n), 'gi'), to: '<name>' });
  for (const o of cfg.other || []) rules.push({ label: 'other', re: new RegExp(esc(o), 'gi'), to: '<redacted>' });
  const home = os.homedir();
  const variants = new Set([home, home.replace(/\\/g, '\\\\'), home.replace(/\\/g, '/'), home.replace(/[^a-zA-Z0-9]/g, '-')]);
  for (const v of variants) rules.push({ label: 'home', re: new RegExp(esc(v), 'g'), to: '<home>' });
  const user = os.userInfo().username;
  return { rules, leftover: user.length >= 4 ? [user, ...emails, ...names] : [...emails, ...names] };
}

function redact(raw) {
  const { rules, leftover } = redactionRules();
  let text = raw;
  const counts = {};
  for (const r of rules) {
    text = text.replace(r.re, () => { counts[r.label] = (counts[r.label] || 0) + 1; return r.to; });
  }
  for (const s of leftover) {
    if (text.toLowerCase().includes(s.toLowerCase())) throw new Error(`redaction incomplete: a protected string is still present; nothing was written`);
  }
  for (const l of text.split('\n').filter(Boolean)) JSON.parse(l); // must still be valid JSONL
  return { text, counts };
}

function factsOf(rows) {
  const f = { sessionId: null, first: null, last: null, versions: new Set(), models: new Set(), permissionModes: {}, userPrompts: [], tools: {}, bash: [], filesWritten: new Set() };
  for (const r of rows) {
    f.sessionId ||= r.sessionId || null;
    if (r.timestamp) { f.first ||= r.timestamp; f.last = r.timestamp; }
    if (r.version) f.versions.add(r.version);
    if (r.permissionMode) f.permissionModes[r.permissionMode] = (f.permissionModes[r.permissionMode] || 0) + 1;
    const m = r.message;
    if (m && m.model) f.models.add(m.model);
    if (r.type === 'user' && m && !r.isMeta) {
      const parts = typeof m.content === 'string' ? [m.content]
        : Array.isArray(m.content) ? m.content.filter((x) => x && x.type === 'text').map((x) => x.text) : [];
      for (const t of parts) if (t.trim()) f.userPrompts.push(t.trim().replace(/\s+/g, ' ').slice(0, 300));
    }
    if (r.type === 'assistant' && m && Array.isArray(m.content)) {
      for (const x of m.content) {
        if (!x || x.type !== 'tool_use') continue;
        f.tools[x.name] = (f.tools[x.name] || 0) + 1;
        if (x.name === 'Bash') f.bash.push(String(x.input?.command || '').replace(/\s+/g, ' ').slice(0, 160));
        if (['Write', 'Edit', 'NotebookEdit'].includes(x.name) && x.input?.file_path) {
          const p = String(x.input.file_path).replace(/\\/g, '/');
          const k = `/${path.basename(repo)}/`;
          f.filesWritten.add(p.includes(k) ? p.split(k).pop() : p);
        }
      }
    }
  }
  return { ...f, versions: [...f.versions], models: [...f.models], filesWritten: [...f.filesWritten] };
}

function checkFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lower = text.toLowerCase();
  const { leftover } = redactionRules();
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(repo, '.claude', 'redact.local.json'), 'utf8')); } catch { /* optional */ }
  const protectedList = [...leftover, ...(cfg.other || [])].filter(Boolean);
  const protectedStringsFound = protectedList.filter((s) => lower.includes(s.toLowerCase())).length;
  const emails = [...new Set(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])].filter((e) => !/@(anthropic\.com|example\.(com|org|net))$/i.test(e));
  const homePaths = [...new Set(text.match(/(?:\/Users\/|\/home\/|[A-Za-z]:\\\\Users\\\\)[^\s"\\\/<]+/g) || [])];
  const mask = (e) => e.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  const ok = protectedStringsFound === 0 && emails.length === 0 && homePaths.length === 0;
  return { file: path.relative(repo, path.resolve(file)), ok, protectedStringsFound, otherEmails: emails.map(mask), homePathsFound: homePaths.length };
}

try {
  if (has('--check')) {
    const file = opt('--check');
    if (!file || !fs.existsSync(file)) throw new Error('usage: --check <transcript.jsonl>');
    const res = checkFile(file);
    console.log(JSON.stringify(res, null, 2));
    process.exitCode = res.ok ? 0 : 2;
  } else if (has('--facts')) {
    let file = opt('--facts');
    if (!file) {
      const all = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((f) => f.endsWith('.jsonl')) : [];
      all.sort((a, b) => fs.statSync(path.join(outDir, b)).mtimeMs - fs.statSync(path.join(outDir, a)).mtimeMs);
      file = all[0] && path.join(outDir, all[0]);
    }
    if (!file) throw new Error('no transcript found in ai-history/');
    console.log(JSON.stringify({ file: path.relative(repo, path.resolve(file)), ...factsOf(parseLines(fs.readFileSync(file, 'utf8'))) }, null, 2));
  } else {
    let payload = {};
    if (has('--hook')) { try { payload = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* none */ } }
    const src = opt('--file') || payload.transcript_path || findTranscript();
    if (!src || !fs.existsSync(src)) throw new Error('no transcript found for this repo');
    const raw = fs.readFileSync(src, 'utf8');
    const first = parseLines(raw);
    const sid = (first.find((r) => r.sessionId)?.sessionId || path.basename(src, '.jsonl')).slice(0, 8);
    const ts = first.find((r) => r.timestamp)?.timestamp;
    const date = (ts ? new Date(ts) : new Date()).toLocaleDateString('en-CA');
    const machine = { darwin: 'mac', win32: 'win' }[process.platform] || process.platform;
    const { text, counts } = redact(raw);
    fs.mkdirSync(outDir, { recursive: true });
    const dest = path.join(outDir, `${date}-${machine}-${sid}.jsonl`);
    fs.writeFileSync(dest, text);
    console.log(`Saved ${path.relative(repo, dest)} (${text.split('\n').filter(Boolean).length} records). Redactions: ${JSON.stringify(counts)}`);
  }
} catch (e) {
  console.error(`log-session: ${e.message}`);
  process.exit(1);
}