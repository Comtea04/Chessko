/**
 * Local authoring tool for the per-move opening explanations.
 *
 *   npm run author            # then open http://localhost:4599
 *
 * Step through any opening line on a board, edit the Korean note and its reference links for each
 * move, and Save — the change is written straight to `src/data/openingNotes.json` (the file the app
 * reads). This is a dev-only tool: nothing here ships in the app bundle. It writes files, which the
 * browser can't do on its own, which is the whole reason it's a tiny local server rather than an
 * in-app screen.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

import { OPENINGS, lineKey, plainSan } from '../src/data/openings.ts';

const PORT = 4599;
const NOTES_PATH = fileURLToPath(new URL('../src/data/openingNotes.json', import.meta.url));
const BRANCHES_PATH = fileURLToPath(new URL('../src/data/openingBranches.json', import.meta.url));
const HTML_PATH = fileURLToPath(new URL('./author/index.html', import.meta.url));

/** Position (FEN) after each half-move of a line, so the board can show the move being annotated. */
function fensFor(sans) {
  const chess = new Chess();
  const fens = [];
  for (const san of sans) {
    chess.move(san);
    fens.push(chess.fen());
  }
  return fens;
}

function buildData(notes, branches) {
  const openings = OPENINGS.map((o) => {
    const curatedIds = new Set(o.lines.map((l) => l.id));
    const lines = [...o.lines, ...(branches[o.id] ?? [])];
    return {
      id: o.id,
      name: o.name,
      sideToLearn: o.sideToLearn,
      lines: lines.map((l) => {
        const moves = l.moves.map(plainSan);
        return {
          id: l.id,
          name: l.name,
          kind: l.kind,
          branchPly: l.branchPly ?? 0,
          key: lineKey(o.id, l.id),
          moves,
          fens: fensFor(moves),
          authored: !curatedIds.has(l.id),
        };
      }),
    };
  });
  return { openings, notes };
}

/** Rewrite the whole file in a fixed order (by opening → line → ply) so diffs stay clean. */
function canonicalize(notes) {
  const ordered = {};
  for (const o of OPENINGS) {
    for (const l of o.lines) {
      const key = lineKey(o.id, l.id);
      const entry = notes[key];
      if (!entry) continue;
      const plies = Object.keys(entry)
        .map(Number)
        .sort((a, b) => a - b);
      const obj = {};
      for (const p of plies) {
        const n = entry[p];
        if (n && n.text && n.text.trim()) obj[p] = { text: n.text, refs: Array.isArray(n.refs) ? n.refs : [] };
      }
      if (Object.keys(obj).length) ordered[key] = obj;
    }
  }
  return ordered;
}

async function readNotes() {
  try {
    return JSON.parse(await readFile(NOTES_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function readBranches() {
  try {
    return JSON.parse(await readFile(BRANCHES_PATH, 'utf8'));
  } catch {
    return {};
  }
}

/** Write branches in the openings' own order so the file stays diff-stable. */
async function writeBranches(branches) {
  const ordered = {};
  for (const o of OPENINGS) {
    if (branches[o.id] && branches[o.id].length) ordered[o.id] = branches[o.id];
  }
  await writeFile(BRANCHES_PATH, JSON.stringify(ordered, null, 2) + '\n');
}

/** A stable, unique-within-opening id from the branch's diverging move, e.g. "bg4-9". */
function branchId(opening, existing, moves, branchPly) {
  const base = (moves[branchPly] ?? moves.at(-1) ?? 'branch').toLowerCase().replace(/[^a-z0-9]/g, '') || 'branch';
  const taken = new Set([...opening.lines.map((l) => l.id), ...existing.map((b) => b.id)]);
  let id = `${base}-${branchPly}`;
  for (let n = 2; taken.has(id); n++) id = `${base}-${branchPly}-${n}`;
  return id;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const html = await readFile(HTML_PATH);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && req.url === '/api/data') {
      sendJson(res, 200, buildData(await readNotes(), await readBranches()));
      return;
    }

    // Replay a move sequence and report the position + its legal moves, so the branch editor's board
    // can make free (legal) moves without shipping chess.js to the page.
    if (req.method === 'POST' && req.url === '/api/position') {
      const { moves } = JSON.parse(await readBody(req));
      const chess = new Chess();
      try {
        for (const m of moves ?? []) chess.move(m);
      } catch (err) {
        sendJson(res, 400, { error: `수순 오류: ${err?.message ?? err}` });
        return;
      }
      const legal = chess.moves({ verbose: true }).map((m) => ({ from: m.from, to: m.to, san: m.san, promotion: m.promotion }));
      sendJson(res, 200, { ok: true, fen: chess.fen(), turn: chess.turn(), gameOver: chess.isGameOver(), moves: legal });
      return;
    }

    // Save a new opponent-reply branch into openingBranches.json (validated for legality first).
    if (req.method === 'POST' && req.url === '/api/branch') {
      const { openingId, name, kind, branchPly, moves } = JSON.parse(await readBody(req));
      if (!openingId || !name || !Array.isArray(moves) || moves.length === 0) {
        sendJson(res, 400, { error: 'openingId, name, moves 필요' });
        return;
      }
      const opening = OPENINGS.find((o) => o.id === openingId);
      if (!opening) {
        sendJson(res, 404, { error: '알 수 없는 오프닝' });
        return;
      }
      const chess = new Chess();
      try {
        for (const m of moves) chess.move(m);
      } catch (err) {
        sendJson(res, 400, { error: `불법 수순: ${err?.message ?? err}` });
        return;
      }
      const ply = Number(branchPly) || 0;
      const branches = await readBranches();
      const list = branches[openingId] ?? [];
      const branch = {
        id: branchId(opening, list, moves, ply),
        name,
        kind: kind === 'punish' ? 'punish' : 'variation',
        branchPly: ply,
        description: '',
        moves,
      };
      list.push(branch);
      branches[openingId] = list;
      await writeBranches(branches);
      sendJson(res, 200, { ok: true, branch });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/note') {
      const { key, ply, note } = JSON.parse(await readBody(req));
      if (typeof key !== 'string' || !Number.isInteger(ply)) {
        sendJson(res, 400, { error: 'key(string) and ply(int) required' });
        return;
      }
      const notes = await readNotes();
      notes[key] = notes[key] ?? {};
      const text = (note?.text ?? '').trim();
      const refs = Array.isArray(note?.refs) ? note.refs.filter((r) => r && r.url && r.label) : [];
      if (!text && refs.length === 0) {
        delete notes[key][ply];
      } else {
        notes[key][ply] = { text, refs };
      }
      const ordered = canonicalize(notes);
      await writeFile(NOTES_PATH, JSON.stringify(ordered, null, 2) + '\n');
      sendJson(res, 200, { ok: true, saved: ordered[key]?.[ply] ?? null });
      return;
    }

    res.writeHead(404).end('not found');
  } catch (err) {
    sendJson(res, 500, { error: String(err?.message ?? err) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  오프닝 편집기 → http://localhost:${PORT}\n  저장 대상: src/data/openingNotes.json, openingBranches.json  (Ctrl+C로 종료)\n`);
});
