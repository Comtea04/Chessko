/**
 * Grades every move of every opening line with Stockfish and writes the result to
 * `src/data/openingAnnotations.generated.ts`, which the app reads at runtime.
 *
 * Evaluating a line on the phone would mean a Stockfish call per move, so the grades are baked in
 * here instead: this runs on a laptop, against the local engine binary, and its output is committed.
 *
 *   node scripts/generate-opening-annotations.mts
 *   STOCKFISH_PATH=/usr/games/stockfish DEPTH=20 node scripts/generate-opening-annotations.mts
 *
 * It also fails loudly on an illegal SAN, so it doubles as the validity check for the opening data.
 */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

import { OPENINGS, authoredQuality, lineKey, plainSan, type MoveQuality } from '../src/data/openings.ts';

const ENGINE_PATH = process.env.STOCKFISH_PATH ?? '/usr/games/stockfish';
const DEPTH = Number(process.env.DEPTH ?? 18);
const OUTPUT = fileURLToPath(new URL('../src/data/openingAnnotations.generated.ts', import.meta.url));

/**
 * Cap evaluations before comparing them: once a side is up a rook, the difference between +900 and
 * +1400 says nothing about the move that was just played, and would grade sound moves as blunders.
 */
const EVAL_CLAMP = 1000;

/** Above this, the game is already decided and swings stop saying anything about the last move. */
const DECISIVE = 400;

/**
 * Centipawn loss against the position before the move. The bar for flagging a move is deliberately
 * higher than a game review's: book moves are a matter of taste, and a 60cp swing at depth 18 is
 * engine noise, not a mistake worth putting a `?!` on in front of someone learning the line.
 */
const THRESHOLDS: [number, MoveQuality][] = [
  [90, 'good'],
  [160, 'inaccuracy'],
  [300, 'mistake'],
];

interface Evaluation {
  /** From the side to move's perspective. */
  scoreCp: number | null;
  mateIn: number | null;
  bestMoveUci: string | null;
}

class Engine {
  private readonly process = spawn(ENGINE_PATH, [], { stdio: ['pipe', 'pipe', 'inherit'] });
  private readonly lines = createInterface({ input: this.process.stdout });
  private waiting: ((line: string) => void)[] = [];

  constructor() {
    this.lines.on('line', (line) => this.waiting.forEach((listener) => listener(line)));
    this.process.on('error', (error) => {
      console.error(`엔진을 실행할 수 없습니다 (${ENGINE_PATH}): ${error.message}`);
      process.exit(1);
    });
  }

  private send(command: string) {
    this.process.stdin.write(`${command}\n`);
  }

  /** Resolves once the engine emits a line matching `done`, feeding every line to `onLine`. */
  private until(done: (line: string) => boolean, onLine?: (line: string) => void): Promise<void> {
    return new Promise((resolve) => {
      const listener = (line: string) => {
        onLine?.(line);
        if (!done(line)) return;
        this.waiting = this.waiting.filter((other) => other !== listener);
        resolve();
      };
      this.waiting.push(listener);
    });
  }

  async start(): Promise<void> {
    this.send('uci');
    await this.until((line) => line === 'uciok');
    this.send('setoption name Threads value 2');
    this.send('setoption name Hash value 256');
    this.send('setoption name MultiPV value 1');
    this.send('isready');
    await this.until((line) => line === 'readyok');
  }

  async evaluate(fen: string): Promise<Evaluation> {
    let scoreCp: number | null = null;
    let mateIn: number | null = null;
    let bestMoveUci: string | null = null;

    this.send(`position fen ${fen}`);
    this.send(`go depth ${DEPTH}`);
    await this.until(
      (line) => line.startsWith('bestmove'),
      (line) => {
        // Keep the last score seen: it belongs to the deepest completed iteration.
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        if (cp) {
          scoreCp = Number(cp[1]);
          mateIn = null;
        } else if (mate) {
          mateIn = Number(mate[1]);
          scoreCp = null;
        }
        const best = line.match(/^bestmove (\S+)/);
        if (best && best[1] !== '(none)') bestMoveUci = best[1];
      }
    );

    return { scoreCp, mateIn, bestMoveUci };
  }

  stop() {
    this.send('quit');
    this.process.stdin.end();
  }
}

/** Collapses an evaluation to a single comparable number, from the side to move's perspective. */
function toCentipawns({ scoreCp, mateIn }: Evaluation): number {
  if (mateIn !== null) return mateIn > 0 ? EVAL_CLAMP : -EVAL_CLAMP;
  return Math.max(-EVAL_CLAMP, Math.min(EVAL_CLAMP, scoreCp ?? 0));
}

function gradeFor(centipawnLoss: number): MoveQuality {
  return THRESHOLDS.find(([limit]) => centipawnLoss <= limit)?.[1] ?? 'blunder';
}

interface MoveAnnotation {
  quality: MoveQuality;
  /** Evaluation after the move, always from white's perspective. */
  scoreCp: number | null;
  mateIn: number | null;
  /** The engine's preference, set only when the move played was worse than it. */
  betterSan?: string;
}

/** One FEN per move — the position it is played from — plus the one the line ends in. */
function positionsOf(moves: string[]): string[] {
  const chess = new Chess();
  const positions = [chess.fen()];
  for (const move of moves) {
    // Throws on an illegal move, which is exactly what we want — bad data must not reach the app.
    chess.move(plainSan(move));
    positions.push(chess.fen());
  }
  return positions;
}

async function annotateLine(engine: Engine, moves: string[], positions: string[]): Promise<MoveAnnotation[]> {
  const evaluations: Evaluation[] = [];
  for (const fen of positions) evaluations.push(await engine.evaluate(fen));

  const replay = new Chess();
  return moves.map((move, ply) => {
    const before = evaluations[ply];
    const after = evaluations[ply + 1];
    const moverIsWhite = ply % 2 === 0;

    // Both scores are from their own side-to-move's perspective, and the side to move flips across
    // the move, so the mover's view of the position after it is the negation of `after`.
    const beforeCp = toCentipawns(before);
    const afterCp = -toCentipawns(after);
    const loss = Math.max(0, beforeCp - afterCp);

    // Inside a won position the engine happily trades a rook for a mate two moves later; grading
    // that as a blunder would paint the pay-off of every trap line red.
    const stillWinning = beforeCp >= DECISIVE && afterCp >= DECISIVE;
    // `best` and `brilliant` are never inferred: the engine measures what a move costs, which says
    // nothing about whether it was hard to find. Only the line's author awards those.
    const derived = stillWinning && loss <= 300 ? 'good' : gradeFor(loss);
    const quality = authoredQuality(move) ?? derived;

    const played = plainSan(move);
    const engineBest = before.bestMoveUci ? sanOf(replay.fen(), before.bestMoveUci) : null;

    // Flip the trailing evaluation to white's perspective, the one the app displays.
    const sign = moverIsWhite ? -1 : 1;
    const annotation: MoveAnnotation = {
      quality,
      scoreCp: after.scoreCp === null ? null : sign * after.scoreCp,
      mateIn: after.mateIn === null ? null : sign * after.mateIn,
    };
    if (engineBest && engineBest !== played && derived !== 'good') {
      annotation.betterSan = engineBest;
    }

    replay.move(played);
    return annotation;
  });
}

function sanOf(fen: string, uci: string): string | null {
  const chess = new Chess(fen);
  try {
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined }).san;
  } catch {
    return null;
  }
}

const SYMBOLS: Record<MoveQuality, string> = {
  brilliant: '!!',
  best: '!',
  good: '·',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

async function main() {
  // Validate every line before the engine starts: an illegal SAN should fail in a second, not
  // three minutes into the run.
  const lines = OPENINGS.flatMap((opening) =>
    opening.lines.map((line) => {
      const key = lineKey(opening.id, line.id);
      try {
        return { key, moves: line.moves, positions: positionsOf(line.moves) };
      } catch (error) {
        throw new Error(`${key}: 수순이 올바르지 않습니다 — ${(error as Error).message}`);
      }
    })
  );

  const engine = new Engine();
  await engine.start();

  const annotations: Record<string, MoveAnnotation[]> = {};
  for (const { key, moves, positions } of lines) {
    annotations[key] = await annotateLine(engine, moves, positions);
    const marks = annotations[key].map((entry, ply) => `${plainSan(moves[ply])}${SYMBOLS[entry.quality]}`).join(' ');
    console.log(`${key.padEnd(38)} ${marks}`);
  }
  engine.stop();

  const body = Object.entries(annotations)
    .map(([key, entries]) => `  ${JSON.stringify(key)}: ${JSON.stringify(entries)},`)
    .join('\n');

  await writeFile(
    OUTPUT,
    `// 자동 생성 파일 — 직접 수정하지 마세요.\n` +
      `// scripts/generate-opening-annotations.mts로 Stockfish(depth ${DEPTH}) 평가를 다시 굽습니다.\n` +
      `import type { MoveQuality } from './openings';\n\n` +
      `export interface MoveAnnotation {\n` +
      `  quality: MoveQuality;\n` +
      `  /** Evaluation after the move, from white's perspective. */\n` +
      `  scoreCp: number | null;\n` +
      `  mateIn: number | null;\n` +
      `  /** What the engine would have played instead, on moves it rated below 'good'. */\n` +
      `  betterSan?: string;\n` +
      `}\n\n` +
      `/** Keyed by \`\${openingId}:\${lineId}\`, one entry per ply of the line. */\n` +
      `export const OPENING_ANNOTATIONS: Record<string, MoveAnnotation[]> = {\n${body}\n};\n`,
    'utf8'
  );

  console.log(`\n${Object.keys(annotations).length}개 라인 → ${OUTPUT}`);
}

await main();
