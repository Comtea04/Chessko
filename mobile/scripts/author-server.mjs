/**
 * Local authoring tool for the opening data.
 *
 *   npm run author            # then open http://localhost:4599
 *
 * Step through any opening line on a board and edit the Korean note and reference links for each
 * move; add a branch (an opponent reply) from any position; add a whole new opening; rename or delete
 * any opening or line. Each writes straight to a file the app reads — `openingNotes.json`,
 * `openingBranches.json`, `openingsAuthored.json`, `openingEdits.json`. This is a dev-only tool:
 * nothing here ships in the app bundle. It writes files, which the browser can't do on its own, which
 * is the whole reason it's a tiny local server rather than an in-app screen.
 */
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const PORT = 4599;
const OPENINGS_URL = new URL('../src/data/openings.ts', import.meta.url);
const NOTES_PATH = fileURLToPath(new URL('../src/data/openingNotes.json', import.meta.url));
const BRANCHES_PATH = fileURLToPath(new URL('../src/data/openingBranches.json', import.meta.url));
const AUTHORED_PATH = fileURLToPath(new URL('../src/data/openingsAuthored.json', import.meta.url));
const EDITS_PATH = fileURLToPath(new URL('../src/data/openingEdits.json', import.meta.url));
const HTML_PATH = fileURLToPath(new URL('./author/index.html', import.meta.url));

/** Must match the OpeningCategory union in openings.ts — the new-opening form offers exactly these. */
const CATEGORIES = ['오픈 게임', '세미 오픈 게임', '폐쇄 게임', '인디언 디펜스', '플랭크 오프닝'];

/**
 * `openings.ts` re-read whenever it changes on disk. A plain top-level import would freeze the data
 * at server start, so lines added to the file while the editor is open would never show up — you'd
 * have to restart the server and not know why. The mtime in the query string is what busts Node's
 * module cache.
 */
let cached = null;
async function loadOpenings() {
  const { mtimeMs } = await stat(fileURLToPath(OPENINGS_URL));
  if (!cached || cached.mtimeMs !== mtimeMs) {
    cached = { mtimeMs, mod: await import(`${OPENINGS_URL.href}?v=${mtimeMs}`) };
  }
  return cached.mod;
}

/**
 * Everything the editor works on, exactly as the app sees it: curated + authored openings, with the
 * renames and deletions from `openingEdits.json` applied. Mirrors `src/data/openingsRuntime.ts` — the
 * app can't import this file and this file can't import the app's (extensionless imports), so the two
 * are kept deliberately short and identical in effect.
 */
async function allOpenings() {
  const { OPENINGS, lineKey } = await loadOpenings();
  const [edits, authored, branches] = await Promise.all([readEdits(), readAuthored(), readBranches()]);
  return [...OPENINGS, ...authored]
    .filter((o) => !edits.openings[o.id]?.hidden)
    .map((o) => ({
      ...o,
      name: edits.openings[o.id]?.name ?? o.name,
      lines: [...o.lines, ...(branches[o.id] ?? []).map((l) => ({ ...l, authored: true }))]
        .filter((l) => !edits.lines[lineKey(o.id, l.id)]?.hidden)
        .map((l) => ({ ...l, name: edits.lines[lineKey(o.id, l.id)]?.name ?? l.name })),
    }));
}

/**
 * Position after each half-move, plus the squares the move ran between — the board shows the FEN and
 * marks the destination, which is where a grade badge belongs.
 */
function replay(sans) {
  const chess = new Chess();
  const fens = [];
  const squares = [];
  for (const san of sans) {
    const move = chess.move(san);
    fens.push(chess.fen());
    squares.push({ from: move.from, to: move.to });
  }
  return { fens, squares };
}

/**
 * Stockfish's baked grades, re-read like `openings.ts` so a fresh `npm run gen:openings` shows up on
 * a refresh. The generator has already applied any author-pinned suffix over the engine's own
 * verdict, so one lookup covers both; lines it has never seen (authored branches) fall back to the
 * suffix alone, exactly as `annotationsFor` does in the app.
 */
const ANNOTATIONS_URL = new URL('../src/data/openingAnnotations.generated.ts', import.meta.url);
let cachedAnnotations = null;
async function loadAnnotations() {
  try {
    const { mtimeMs } = await stat(fileURLToPath(ANNOTATIONS_URL));
    if (!cachedAnnotations || cachedAnnotations.mtimeMs !== mtimeMs) {
      const mod = await import(`${ANNOTATIONS_URL.href}?v=${mtimeMs}`);
      cachedAnnotations = { mtimeMs, data: mod.OPENING_ANNOTATIONS };
    }
    return cachedAnnotations.data;
  } catch {
    return {};
  }
}

/**
 * Replay a line to check it is legal. A move may carry a grade the author pinned on it (`Nxd5?`,
 * `Bxf7!!`), which is ours, not chess.js's — so the suffix comes off before replaying and stays on
 * the move that gets stored.
 */
async function assertLegal(moves) {
  const { plainSan } = await loadOpenings();
  const chess = new Chess();
  for (const move of moves) chess.move(plainSan(move));
}

async function buildData(notes) {
  const { lineKey, plainSan, authoredQuality } = await loadOpenings();
  const authoredIds = new Set((await readAuthored()).map((o) => o.id));
  const annotations = await loadAnnotations();
  const openings = (await allOpenings()).map((o) => ({
    id: o.id,
    name: o.name,
    eco: o.eco,
    category: o.category,
    sideToLearn: o.sideToLearn,
    // Whole openings added here can be deleted outright; the curated ones live in openings.ts.
    authored: authoredIds.has(o.id),
    lines: withDepth(o.lines.map((l) => {
      const moves = l.moves.map(plainSan);
      const key = lineKey(o.id, l.id);
      const baked = annotations[key];
      const { fens, squares } = replay(moves);
      return {
        id: l.id,
        name: l.name,
        kind: l.kind,
        branchPly: l.branchPly ?? 0,
        key,
        moves,
        // As written, grade suffixes and all — what the branch editor reloads to edit a line.
        graded: l.moves,
        fens,
        squares,
        qualities: l.moves.map((san, i) => baked?.[i]?.quality ?? authoredQuality(san) ?? 'good'),
        authored: l.authored ?? false,
      };
    })),
  }));
  return { openings, notes, categories: CATEGORIES };
}

/**
 * How deep each line sits under the one it branches off, so the picker can show the nesting the app
 * shows: 투 나이츠 디펜스 → 나이트 어택 → 폴레리오 디펜스. A line's parent is the deepest other line it
 * still agrees with at its own `branchPly` — read off the moves, same rule as the app's `lineTree`.
 * Returned depth-first in list order.
 */
function withDepth(lines) {
  const isPrefix = (p, f) => p.length <= f.length && p.every((m, i) => f[i] === m);
  const parentOf = (line) => {
    const trunk = line.moves.slice(0, line.branchPly);
    let parent = null;
    for (const other of lines) {
      if (other.id === line.id || other.branchPly >= line.branchPly) continue;
      if (!isPrefix(trunk, other.moves)) continue;
      if (!parent || other.branchPly > parent.branchPly) parent = other;
    }
    return parent;
  };

  const children = new Map();
  for (const line of lines) {
    const key = parentOf(line)?.id ?? null;
    if (children.has(key)) children.get(key).push(line);
    else children.set(key, [line]);
  }
  const out = [];
  const walk = (key, depth) => {
    for (const line of children.get(key) ?? []) {
      out.push({ ...line, depth });
      walk(line.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function cleanEntry(entry) {
  const obj = {};
  for (const p of Object.keys(entry).map(Number).sort((a, b) => a - b)) {
    const n = entry[p];
    if (n && n.text && n.text.trim()) obj[p] = { text: n.text, refs: Array.isArray(n.refs) ? n.refs : [] };
  }
  return Object.keys(obj).length ? obj : null;
}

/**
 * Rewrite the whole file in a fixed order (by opening → line → ply) so diffs stay clean.
 *
 * Ordering is all this does — notes for lines it can't place are kept, at the end, never dropped.
 * Anything else would make an unrelated save destroy hand-written prose: rename a line id in
 * `openings.ts`, or save while the data on disk is half-edited, and every note for that line would
 * silently disappear. Orphans left in the file are cheap; the text isn't recoverable.
 */
async function canonicalize(notes) {
  const { lineKey } = await loadOpenings();
  const ordered = {};
  const placed = new Set();
  for (const o of await allOpenings()) {
    for (const l of o.lines) {
      const key = lineKey(o.id, l.id);
      placed.add(key);
      const entry = notes[key];
      if (!entry) continue;
      const obj = cleanEntry(entry);
      if (obj) ordered[key] = obj;
    }
  }
  for (const [key, entry] of Object.entries(notes)) {
    if (placed.has(key)) continue;
    const obj = cleanEntry(entry);
    if (obj) ordered[key] = obj;
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

/** Write branches in the openings' own order so the file stays diff-stable. Keys it can't place —
 *  a hidden opening's, say — keep their branches rather than losing them to a reorder. */
async function writeBranches(branches) {
  const ordered = {};
  for (const o of await allOpenings()) {
    if (branches[o.id]?.length) ordered[o.id] = branches[o.id];
  }
  for (const [id, list] of Object.entries(branches)) {
    if (!ordered[id] && list?.length) ordered[id] = list;
  }
  await writeFile(BRANCHES_PATH, JSON.stringify(ordered, null, 2) + '\n');
}

/** Renames and deletions applied on top of the curated data, so `openings.ts` stays hand-written. */
async function readEdits() {
  try {
    const parsed = JSON.parse(await readFile(EDITS_PATH, 'utf8'));
    return { openings: parsed.openings ?? {}, lines: parsed.lines ?? {} };
  } catch {
    return { openings: {}, lines: {} };
  }
}

async function writeEdits(edits) {
  await writeFile(EDITS_PATH, JSON.stringify(edits, null, 2) + '\n');
}

/** Record an override, dropping the entry entirely once it says nothing. */
function setOverride(bucket, key, patch) {
  const next = { ...(bucket[key] ?? {}), ...patch };
  if (!next.name) delete next.name;
  if (!next.hidden) delete next.hidden;
  if (Object.keys(next).length) bucket[key] = next;
  else delete bucket[key];
}

/** Whole openings added here, stored apart from the curated `openings.ts` so that file stays hand-written. */
async function readAuthored() {
  try {
    return JSON.parse(await readFile(AUTHORED_PATH, 'utf8'));
  } catch {
    return [];
  }
}

async function writeAuthored(openings) {
  await writeFile(AUTHORED_PATH, JSON.stringify(openings, null, 2) + '\n');
}

/** A stable, unique id from the opening's name; falls back to a counter when the name has no ASCII. */
async function nextOpeningId(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'authored';
  const taken = new Set((await allOpenings()).map((o) => o.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
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
      sendJson(res, 200, await buildData(await readNotes()));
      return;
    }

    // Replay a move sequence and report the position + its legal moves, so the branch editor's board
    // can make free (legal) moves without shipping chess.js to the page.
    if (req.method === 'POST' && req.url === '/api/position') {
      const { moves } = JSON.parse(await readBody(req));
      const { plainSan } = await loadOpenings();
      const chess = new Chess();
      try {
        for (const m of moves ?? []) chess.move(plainSan(m));
      } catch (err) {
        sendJson(res, 400, { error: `수순 오류: ${err?.message ?? err}` });
        return;
      }
      const legal = chess.moves({ verbose: true }).map((m) => ({ from: m.from, to: m.to, san: m.san, promotion: m.promotion }));
      sendJson(res, 200, { ok: true, fen: chess.fen(), turn: chess.turn(), gameOver: chess.isGameOver(), moves: legal });
      return;
    }

    // Add a whole new opening to openingsAuthored.json, with its main line. The app merges that file
    // with the curated set, so it shows up in the opening list as soon as the bundle reloads.
    if (req.method === 'POST' && req.url === '/api/opening') {
      const body = JSON.parse(await readBody(req));
      const name = (body.name ?? '').trim();
      const lineName = (body.lineName ?? '').trim() || '메인라인';
      const moves = body.moves;
      if (!name || !Array.isArray(moves) || moves.length === 0) {
        sendJson(res, 400, { error: '이름과 수순이 필요합니다' });
        return;
      }
      if (!CATEGORIES.includes(body.category)) {
        sendJson(res, 400, { error: `카테고리는 ${CATEGORIES.join(' / ')} 중 하나여야 합니다` });
        return;
      }
      try {
        await assertLegal(moves);
      } catch (err) {
        sendJson(res, 400, { error: `불법 수순: ${err?.message ?? err}` });
        return;
      }
      const opening = {
        id: await nextOpeningId(name),
        name,
        eco: (body.eco ?? '').trim(),
        category: body.category,
        sideToLearn: body.sideToLearn === 'b' || body.sideToLearn === 'both' ? body.sideToLearn : 'w',
        description: (body.description ?? '').trim(),
        lines: [{ id: 'main', name: lineName, kind: 'main', branchPly: 0, description: '', moves }],
      };
      const authored = await readAuthored();
      authored.push(opening);
      await writeAuthored(authored);
      sendJson(res, 200, { ok: true, opening });
      return;
    }

    // Rename an opening or one of its lines. Always recorded in openingEdits.json, even for things
    // authored here, so there is one place to look when a name doesn't match `openings.ts`.
    if (req.method === 'POST' && req.url === '/api/rename') {
      const { openingId, lineId, name } = JSON.parse(await readBody(req));
      const { lineKey } = await loadOpenings();
      const trimmed = (name ?? '').trim();
      if (!openingId || !trimmed) {
        sendJson(res, 400, { error: '이름을 입력하세요' });
        return;
      }
      const opening = (await allOpenings()).find((o) => o.id === openingId);
      if (!opening || (lineId && !opening.lines.some((l) => l.id === lineId))) {
        sendJson(res, 404, { error: '대상을 찾을 수 없습니다' });
        return;
      }
      const edits = await readEdits();
      if (lineId) setOverride(edits.lines, lineKey(openingId, lineId), { name: trimmed });
      else setOverride(edits.openings, openingId, { name: trimmed });
      await writeEdits(edits);
      sendJson(res, 200, { ok: true });
      return;
    }

    // Delete an opening, or one line of it. Anything authored here is removed from its own file for
    // real; curated data is left alone and hidden through openingEdits.json instead, since rewriting
    // the hand-written `openings.ts` is not this tool's business. Either way it leaves the app.
    if (req.method === 'POST' && req.url === '/api/delete') {
      const { openingId, lineId } = JSON.parse(await readBody(req));
      const { lineKey } = await loadOpenings();
      const opening = (await allOpenings()).find((o) => o.id === openingId);
      if (!opening) {
        sendJson(res, 404, { error: '오프닝을 찾을 수 없습니다' });
        return;
      }
      const edits = await readEdits();
      const notes = await readNotes();
      const branches = await readBranches();
      const authored = await readAuthored();
      const ownIndex = authored.findIndex((o) => o.id === openingId);

      if (lineId) {
        const line = opening.lines.find((l) => l.id === lineId);
        if (!line) {
          sendJson(res, 404, { error: '라인을 찾을 수 없습니다' });
          return;
        }
        if (opening.lines.length === 1) {
          sendJson(res, 400, { error: '마지막 라인은 지울 수 없습니다 (오프닝을 지우세요)' });
          return;
        }
        const key = lineKey(openingId, lineId);
        if (line.authored || ownIndex >= 0) {
          if (line.authored) {
            branches[openingId] = (branches[openingId] ?? []).filter((b) => b.id !== lineId);
            if (!branches[openingId].length) delete branches[openingId];
            await writeBranches(branches);
          } else {
            authored[ownIndex].lines = authored[ownIndex].lines.filter((l) => l.id !== lineId);
            await writeAuthored(authored);
          }
          delete notes[key];
          // The line is gone for good, so its rename goes too — branch ids are generated from the
          // move that starts them, and a later branch could otherwise inherit this name.
          delete edits.lines[key];
          await writeEdits(edits);
        } else {
          setOverride(edits.lines, key, { hidden: true });
          await writeEdits(edits);
        }
      } else if (ownIndex >= 0) {
        await writeAuthored(authored.filter((o) => o.id !== openingId));
        delete branches[openingId];
        await writeBranches(branches);
        for (const key of Object.keys(notes)) if (key.startsWith(`${openingId}:`)) delete notes[key];
        // Drop any rename recorded for an opening that no longer exists.
        delete edits.openings[openingId];
        for (const key of Object.keys(edits.lines)) if (key.startsWith(`${openingId}:`)) delete edits.lines[key];
        await writeEdits(edits);
      } else {
        setOverride(edits.openings, openingId, { hidden: true });
        await writeEdits(edits);
      }

      await writeFile(NOTES_PATH, JSON.stringify(await canonicalize(notes), null, 2) + '\n');
      sendJson(res, 200, { ok: true });
      return;
    }

    // Save an opponent-reply branch into openingBranches.json — a new one, or `id` to rewrite an
    // existing one in place. Validated for legality first; moves keep their grade suffixes.
    if (req.method === 'POST' && req.url === '/api/branch') {
      const { openingId, id, name, kind, branchPly, moves } = JSON.parse(await readBody(req));
      if (!openingId || !name || !Array.isArray(moves) || moves.length === 0) {
        sendJson(res, 400, { error: 'openingId, name, moves 필요' });
        return;
      }
      const opening = (await allOpenings()).find((o) => o.id === openingId);
      if (!opening) {
        sendJson(res, 404, { error: '알 수 없는 오프닝' });
        return;
      }
      try {
        await assertLegal(moves);
      } catch (err) {
        sendJson(res, 400, { error: `불법 수순: ${err?.message ?? err}` });
        return;
      }
      const ply = Number(branchPly) || 0;
      const branches = await readBranches();
      const list = branches[openingId] ?? [];
      const index = id ? list.findIndex((b) => b.id === id) : -1;
      if (id && index < 0) {
        sendJson(res, 404, { error: '수정할 갈래를 찾을 수 없습니다' });
        return;
      }
      const branch = {
        // Keeping the id on an edit keeps the line's notes and the app's saved state attached to it.
        id: id ?? branchId(opening, list, moves, ply),
        name,
        kind: kind === 'punish' ? 'punish' : 'variation',
        branchPly: ply,
        description: list[index]?.description ?? '',
        moves,
      };
      if (index >= 0) list[index] = branch;
      else list.push(branch);
      branches[openingId] = list;
      await writeBranches(branches);
      if (index >= 0) {
        // The name just written to the branch itself is now the only one; drop any rename override
        // so the two can't disagree.
        const { lineKey } = await loadOpenings();
        const edits = await readEdits();
        if (edits.lines[lineKey(openingId, branch.id)]) {
          setOverride(edits.lines, lineKey(openingId, branch.id), { name: '' });
          await writeEdits(edits);
        }
      }
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
      const ordered = await canonicalize(notes);
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
  console.log(
    `\n  오프닝 편집기 → http://localhost:${PORT}` +
      `\n  저장 대상: src/data/ 의 openingNotes / openingBranches / openingsAuthored / openingEdits .json` +
      `\n  openings.ts는 바뀔 때마다 다시 읽으므로 서버를 재시작할 필요가 없습니다.  (Ctrl+C로 종료)\n`
  );
});
