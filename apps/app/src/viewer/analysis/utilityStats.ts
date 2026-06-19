// Pure aggregation helpers for the Utilities tab (flashes and HE/molotov damage),
// mirroring CS Demo Manager's grenade analysis: per-player metrics grouped by
// team, plus a flasher x victim blind-duration matrix.
import type { KillEvent, Replay, Round, Side } from '@/viewer/domain/schema'

export interface TeamPlayer {
  steamId: string
  name: string
}

export interface Team {
  /** 0 = started CT, 1 = started T (stable team identity). */
  id: 0 | 1
  name: string
  players: TeamPlayer[]
}

/** First-seen side per steamId in a round (sides are stable within a round). */
export function roundSides(round: Round): Map<string, Side> {
  const m = new Map<string, Side>()
  for (const f of round.frames) {
    for (const p of f.players) {
      if (!m.has(p.steamId)) m.set(p.steamId, p.side)
    }
  }
  return m
}

/**
 * Splits the match players into the two teams by their starting side, naming each
 * from the first round's clan names. Players are listed in the replay's order.
 */
export function groupTeams(replay: Replay): Team[] {
  const first = replay.rounds[0]
  const ctName = first?.ctName || ''
  const tName = first?.tName || ''
  const ct = replay.players.filter((p) => p.startSide === 'CT').map((p) => ({ steamId: p.steamId, name: p.name }))
  const t = replay.players.filter((p) => p.startSide === 'T').map((p) => ({ steamId: p.steamId, name: p.name }))
  return [
    { id: 0, name: ctName, players: ct },
    { id: 1, name: tName, players: t },
  ]
}

export interface FlashStat {
  /** Flashbangs thrown by the player. */
  thrown: number
  /** Enemies blinded (one count per enemy blind event). */
  enemiesBlinded: number
  /** Total blind seconds inflicted on enemies. */
  enemyBlindDuration: number
}

export interface FlashStats {
  byPlayer: Map<string, FlashStat>
  /** flasher steamId -> victim steamId -> total blind seconds (allies included). */
  matrix: Map<string, Map<string, number>>
  roundCount: number
}

/** Aggregates flash metrics and the blind-duration matrix over the whole match. */
export function computeFlashStats(replay: Replay): FlashStats {
  const byPlayer = new Map<string, FlashStat>()
  const matrix = new Map<string, Map<string, number>>()
  const stat = (id: string): FlashStat => {
    let s = byPlayer.get(id)
    if (!s) byPlayer.set(id, (s = { thrown: 0, enemiesBlinded: 0, enemyBlindDuration: 0 }))
    return s
  }

  for (const round of replay.rounds) {
    for (const path of round.grenadePaths) {
      if (path.kind === 'flash' && path.throwerSteamId) stat(path.throwerSteamId).thrown += 1
    }
    const sides = roundSides(round)
    for (const b of round.blinds) {
      const flasher = b.flasherSteamId
      if (!flasher) continue
      // Matrix counts every blind (allies included), like CSDM.
      let row = matrix.get(flasher)
      if (!row) matrix.set(flasher, (row = new Map()))
      row.set(b.steamId, (row.get(b.steamId) ?? 0) + b.duration)
      // Per-player metrics count enemies only.
      const vSide = sides.get(b.steamId)
      const fSide = sides.get(flasher)
      if (vSide && fSide && vSide !== fSide) {
        const s = stat(flasher)
        s.enemiesBlinded += 1
        s.enemyBlindDuration += b.duration
      }
    }
  }

  return { byPlayer, matrix, roundCount: replay.rounds.length }
}

export interface DamageStat {
  /** HE + molotov/incendiary grenades thrown. */
  thrown: number
  /** Utility health damage dealt. */
  damage: number
  /** Kills with HE/molotov. */
  kills: number
}

export interface DamageStats {
  byPlayer: Map<string, DamageStat>
  roundCount: number
}

/** Weapon classnames (kill events) counted as utility kills. */
function isUtilityKillWeapon(weapon: string): boolean {
  const w = weapon.toLowerCase()
  return w.includes('hegrenade') || w.includes('inferno') || w.includes('molotov') || w.includes('incgrenade')
}

/** Aggregates HE/molotov damage metrics over the whole match. */
export function computeDamageStats(replay: Replay): DamageStats {
  const byPlayer = new Map<string, DamageStat>()
  const stat = (id: string): DamageStat => {
    let s = byPlayer.get(id)
    if (!s) byPlayer.set(id, (s = { thrown: 0, damage: 0, kills: 0 }))
    return s
  }

  for (const round of replay.rounds) {
    for (const path of round.grenadePaths) {
      if ((path.kind === 'he' || path.kind === 'fire') && path.throwerSteamId) stat(path.throwerSteamId).thrown += 1
    }
    for (const [id, dmg] of Object.entries(round.utilityDamage ?? {})) stat(id).damage += dmg
    for (const e of round.events) {
      if (e.type !== 'kill') continue
      const kill = e as KillEvent
      if (kill.attackerSteamId && isUtilityKillWeapon(kill.weapon)) stat(kill.attackerSteamId).kills += 1
    }
  }

  return { byPlayer, roundCount: replay.rounds.length }
}
