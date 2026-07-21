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

function buildData(notes) {
  const openings = OPENINGS.map((o) => ({
    id: o.id,
    name: o.name,
    sideToLearn: o.sideToLearn,
    lines: o.lines.map((l) => {
      const moves = l.moves.map(plainSan);
      return { id: l.id, name: l.name, kind: l.kind, key: lineKey(o.id, l.id), moves, fens: fensFor(moves) };
    }),
  }));
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
      sendJson(res, 200, buildData(await readNotes()));
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
  console.log(`\n  오프닝 설명 편집기 → http://localhost:${PORT}\n  저장 대상: src/data/openingNotes.json  (Ctrl+C로 종료)\n`);
});
