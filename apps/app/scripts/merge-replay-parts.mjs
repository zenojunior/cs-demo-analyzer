// Merges several `.cs2dv` parts of the SAME map (e.g. a GOTV demo cut into
// halves) into one continuous `.cs2dv`, so the viewer plays it as a single map.
//
// Why this is safe: inside a round, every time field (`Frame.t`, every event's
// `t`, bomb/grenade/blind/defuse/groundWeapon) is measured in seconds from that
// round's own `freezeStartTick`, so rounds are self-contained in time and just
// concatenate. We renumber rounds sequentially and rebase each later part's
// ABSOLUTE ticks (round ticks, frame/event/chat ticks, pauses) so they stay
// monotonic after the previous part — the only place the viewer compares
// absolute ticks across a round boundary is the pause lookup.
//
//   node scripts/merge-replay-parts.mjs <out.cs2dv> <part1.cs2dv> <part2.cs2dv> [...]
//   e.g. node scripts/merge-replay-parts.mjs \
//          ../../replays/major-cologne-2026/qf2-mirage.cs2dv \
//          ../../replays/major-cologne-2026/qf2-mirage-p1.cs2dv \
//          ../../replays/major-cologne-2026/qf2-mirage-p2.cs2dv

import { gunzipSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
import { encodeArchive } from './lib/cs2dv.mjs'

const MAGIC = 'CS2DV1'

/** Reads a `.cs2dv` back into { meta, replay }. */
function readArchive(path) {
  const c = gunzipSync(readFileSync(path))
  if (c.subarray(0, 6).toString('ascii') !== MAGIC) throw new Error(`${path}: bad magic`)
  let o = 6
  const sec = () => {
    const len = c.readUInt32LE(o)
    o += 4
    const s = c.subarray(o, o + len)
    o += len
    return s
  }
  const meta = JSON.parse(sec().toString('utf8'))
  const replay = JSON.parse(sec().toString('utf8'))
  return { meta, replay }
}

/** Shifts every absolute tick in a round by `offset` (leaves seconds `t` alone). */
function shiftRoundTicks(round, offset) {
  for (const k of ['freezeStartTick', 'startTick', 'decidedTick', 'endTick', 'postEndTick']) {
    if (typeof round[k] === 'number') round[k] += offset
  }
  for (const f of round.frames ?? []) f.tick += offset
  for (const e of round.events ?? []) e.tick += offset
  for (const m of round.chat ?? []) m.tick += offset
}

const [outArg, ...partArgs] = process.argv.slice(2)
if (!outArg || partArgs.length < 2) {
  console.error('usage: merge-replay-parts.mjs <out.cs2dv> <part1.cs2dv> <part2.cs2dv> [...]')
  process.exit(1)
}

const parts = partArgs.map((p) => ({ path: p, ...readArchive(p) }))

// All parts must be the same map.
const map = parts[0].replay.map
for (const p of parts) {
  if (p.replay.map !== map) throw new Error(`map mismatch: ${p.path} is ${p.replay.map}, expected ${map}`)
}

const base = parts[0].replay
const mergedRounds = []
const players = new Map(base.players.map((p) => [p.steamId, p]))
const pauses = [...(base.pauses ?? [])]

// Cursor = next free absolute tick. First part keeps its own ticks (offset 0).
let cursor = -Infinity
for (const r of base.rounds) cursor = Math.max(cursor, r.postEndTick ?? r.endTick)

for (let i = 0; i < parts.length; i++) {
  const { replay } = parts[i]
  let offset = 0
  if (i > 0) {
    const minTick = Math.min(...replay.rounds.map((r) => r.freezeStartTick ?? r.startTick))
    offset = cursor + base.demoTickRate - minTick // 1s gap between parts
    for (const r of replay.rounds) shiftRoundTicks(r, offset)
    for (const p of replay.players) if (!players.has(p.steamId)) players.set(p.steamId, p)
    for (const p of replay.pauses ?? []) {
      pauses.push({ ...p, startTick: p.startTick + offset, endTick: p.endTick + offset })
    }
  }
  for (const r of replay.rounds) {
    mergedRounds.push(r)
    cursor = Math.max(cursor, r.postEndTick ?? r.endTick)
  }
}

// Renumber rounds 1..N in final order.
mergedRounds.forEach((r, i) => (r.number = i + 1))

const last = parts[parts.length - 1].replay
const merged = {
  map,
  demoTickRate: base.demoTickRate,
  frameRate: base.frameRate,
  players: [...players.values()],
  rounds: mergedRounds,
  // Final score/names come from the last part (the real end state).
  finalScoreCt: last.finalScoreCt,
  finalScoreT: last.finalScoreT,
  finalCtName: last.finalCtName,
  finalTName: last.finalTName,
  pauses,
  generatedBy: base.generatedBy,
}

const fileName = outArg.split('/').pop().replace(/\.cs2dv$/, '.dem')
const archive = encodeArchive({ replay: merged, fileName })
writeFileSync(outArg, archive)
console.log(
  `merged ${parts.length} parts -> ${outArg}: map=${merged.map} rounds=${merged.rounds.length} ` +
    `final=${merged.finalCtName} ${merged.finalScoreCt}-${merged.finalScoreT} ${merged.finalTName} ` +
    `(${(archive.length / 1024 / 1024).toFixed(1)} MB)`,
)
