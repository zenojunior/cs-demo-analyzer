import type { GrenadePath, Round } from '@/viewer/domain/schema'
import { clamp } from '@/viewer/player/canvasUtils'
import { paintSimpleSmoke, paintSimpleFire, type GrenadeEffects } from '@/viewer/player/grenadeEffects'

type GrenadeEvent = Extract<Round['events'][number], { type: 'grenade' }>

/**
 * Dependencies the grenade renderers pull from the viewer: the live canvas
 * context (via a getter, since it is recreated on resize), the world->screen
 * transform, the active-floor test, the effect sprite cache, the weapon-icon
 * atlas, and the low-quality toggle. Passing them in keeps these renderers out of
 * the already-large ViewerMap component without losing access to its state.
 */
export interface GrenadeRenderDeps {
  getCtx: () => CanvasRenderingContext2D | null
  w2s: (wx: number, wy: number) => { x: number; y: number }
  unitsToScreen: (u: number) => number
  zOnActiveLevel: (z: number) => boolean
  effects: GrenadeEffects
  weaponImgs: Map<string, HTMLImageElement>
  lowQualityEffects: () => boolean
}

/** Grenade kind -> path/marker color. */
const PATH_COLOR: Record<string, string> = {
  smoke: 'rgba(206, 211, 222, 0.9)',
  fire: 'rgba(255, 120, 30, 0.9)',
  he: 'rgba(255, 90, 60, 0.9)',
  flash: 'rgba(255, 238, 170, 0.9)',
  decoy: 'rgba(140, 150, 165, 0.9)',
}

// Grenade kind -> weapon icon label (key into `weaponImgs`). 'fire' covers both
// molotov and incendiary; we use the molotov icon as the shared symbol.
const KIND_ICON: Record<string, string> = {
  smoke: 'Smoke',
  fire: 'Molotov',
  he: 'HE',
  flash: 'Flash',
  decoy: 'Decoy',
}

/**
 * Grenade rendering for the 2D viewer: detonation effects (smoke/fire/HE/flash),
 * the dissipation timer, the scorch decal, and the in-flight / preview arcs.
 * Returns drawing functions with the same signatures they had inline, plus the
 * shared `PATH_COLOR` / `KIND_ICON` tables and effect radii that the coach board
 * and hit-testing reuse.
 */
export function useGrenadeRendering(deps: GrenadeRenderDeps) {
  const { w2s, unitsToScreen, zOnActiveLevel, effects, weaponImgs } = deps

  /** Effect radius (screen px) of a smoke/fire grenade, for rendering and hit-test. */
  function smokeRadius() {
    return unitsToScreen(144)
  }
  function fireRadius() {
    return unitsToScreen(150)
  }

  function drawGrenade(ev: GrenadeEvent, t: number) {
    const ctx = deps.getCtx()
    if (!ctx) return
    // Multi-floor maps: only the floor where the grenade went off (effect + timer).
    if (!zOnActiveLevel(ev.z)) return
    const { x, y } = w2s(ev.x, ev.y)
    const span = Math.max(0.001, ev.endT - ev.t)
    const k = clamp((t - ev.t) / span, 0, 1)
    ctx.save()
    if (ev.kind === 'smoke') {
      if (deps.lowQualityEffects()) paintSimpleSmoke(ctx, x, y, smokeRadius())
      else effects.paintSmoke(ctx, x, y, smokeRadius(), t, ev.x * 0.011 + ev.y * 0.015)
    } else if (ev.kind === 'fire') {
      if (deps.lowQualityEffects()) paintSimpleFire(ctx, x, y, fireRadius())
      else effects.paintFire(ctx, x, y, fireRadius(), t, ev.x * 0.013 + ev.y * 0.017)
    } else if (ev.kind === 'he') {
      ctx.globalAlpha = 1 - k
      ctx.strokeStyle = '#ffb020'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, y, unitsToScreen(60) * (0.6 + k * 0.8), 0, Math.PI * 2)
      ctx.stroke()
    } else if (ev.kind === 'flash') {
      ctx.globalAlpha = (1 - k) * 0.7
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x, y, unitsToScreen(70), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    // Countdown for lingering effects (smoke dissipating / fire burning out).
    if (ev.kind === 'smoke' || ev.kind === 'fire') {
      drawGrenadeTimer(x, y, ev.endT - t, span, ev.kind)
    }
  }

  /** Compact circular countdown shown at the center of a smoke/fire effect. The
   *  ring drains clockwise as the effect runs out and the remaining whole seconds
   *  are printed in the middle. */
  function drawGrenadeTimer(
    x: number,
    y: number,
    remaining: number,
    span: number,
    kind: 'smoke' | 'fire',
  ) {
    const ctx = deps.getCtx()
    if (!ctx) return
    const p = clamp(remaining / span, 0, 1)
    const radius = 11
    const color = kind === 'smoke' ? 'rgba(232, 236, 244, 0.95)' : 'rgba(255, 150, 60, 0.98)'
    ctx.save()
    ctx.lineCap = 'round'
    // track
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.stroke()
    // remaining time (drains clockwise from the top)
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
    ctx.stroke()
    // remaining whole seconds in the middle
    ctx.fillStyle = color
    ctx.font = '700 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 3
    ctx.fillText(String(Math.max(0, Math.ceil(remaining))), x, y + 0.5)
    ctx.restore()
  }

  /** Darkened patch left where a molotov/incendiary burned or an HE detonated.
   *  It persists for the rest of the round (cleared when the round changes), so
   *  it marks the affected ground without fading out. Reuses the effect's seeded
   *  irregular outline so the mark matches the affected area. */
  function drawScorch(ev: GrenadeEvent) {
    const ctx = deps.getCtx()
    if (!ctx) return
    if (!zOnActiveLevel(ev.z)) return
    const { x, y } = w2s(ev.x, ev.y)
    // HE blast covers a smaller area than fire
    const R = unitsToScreen(ev.kind === 'he' ? 90 : 150)
    effects.paintScorch(ctx, x, y, R, ev.x * 0.013 + ev.y * 0.017)
  }

  /** Arc of the grenade in flight, traced up to its position at instant t. */
  function drawGrenadePath(path: Round['grenadePaths'][number], t: number) {
    const ctx = deps.getCtx()
    if (!ctx) return
    const pts = path.points
    if (pts.length < 2) return
    const end = pts[pts.length - 1].t
    if (t < pts[0].t || t > end + 0.25) return

    // In top-down 2D the flight X/Y is nearly straight (the arc lives on the
    // invisible Z axis). We bow the line sideways with a sine shape (0 at the
    // ends, max in the middle) to suggest the arc. The shape is fixed for the
    // whole trajectory and revealed up to t.
    const screen = pts.map((p) => w2s(p.x, p.y))
    const a = screen[0]
    const b = screen[screen.length - 1]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = -(b.y - a.y) / len
    const ny = (b.x - a.x) / len
    const amp = Math.min(len * 0.04, 14)
    const arc = screen.map((s, i) => {
      const bow = Math.sin((i / (screen.length - 1)) * Math.PI) * amp
      return { x: s.x + nx * bow, y: s.y + ny * bow, t: pts[i].t }
    })

    // points to draw: up to currentT, with the tip interpolated
    const draw: { x: number; y: number }[] = []
    for (let i = 0; i < arc.length; i++) {
      if (arc[i].t <= t) {
        draw.push(arc[i])
      } else {
        const prev = arc[i - 1]
        const f = (t - prev.t) / (arc[i].t - prev.t)
        draw.push({ x: prev.x + (arc[i].x - prev.x) * f, y: prev.y + (arc[i].y - prev.y) * f })
        break
      }
    }
    if (!draw.length) return

    ctx.save()
    ctx.strokeStyle = PATH_COLOR[path.kind] ?? 'rgba(220,224,232,0.9)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(draw[0].x, draw[0].y)
    // smooth by passing through midpoints (quadratics), keeping the curve continuous
    for (let i = 1; i < draw.length - 1; i++) {
      const mx = (draw[i].x + draw[i + 1].x) / 2
      const my = (draw[i].y + draw[i + 1].y) / 2
      ctx.quadraticCurveTo(draw[i].x, draw[i].y, mx, my)
    }
    ctx.lineTo(draw[draw.length - 1].x, draw[draw.length - 1].y)
    ctx.stroke()
    ctx.setLineDash([])

    // Tip of the arc: while the grenade is still airborne, draw its icon so the
    // viewer can tell which grenade it is; once it detonates the effect takes over.
    const head = draw[draw.length - 1]
    const img = weaponImgs.get(KIND_ICON[path.kind] ?? '')
    if (t <= end && img && img.complete && img.naturalWidth) {
      const boxH = clamp(unitsToScreen(34), 12, 20)
      const s = boxH / img.naturalHeight
      const iw = img.naturalWidth * s
      const ih = boxH
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(7, 8, 12, 0.6)'
      ctx.beginPath()
      ctx.roundRect(head.x - iw / 2 - 2, head.y - ih / 2 - 1.5, iw + 4, ih + 3, 2)
      ctx.fill()
      ctx.drawImage(img, head.x - iw / 2, head.y - ih / 2, iw, ih)
    } else {
      ctx.fillStyle = PATH_COLOR[path.kind] ?? '#dee2ea'
      ctx.beginPath()
      ctx.arc(head.x, head.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /**
   * Draws the ENTIRE arc of a grenade (from throw to impact), ignoring the
   * current time. Used on grenades finder hover to preview the throw without
   * replaying the round. Highlights with a solid line and marks start/end.
   */
  function drawGrenadePathPreview(path: GrenadePath, alpha = 1) {
    const ctx = deps.getCtx()
    if (!ctx) return
    const pts = path.points
    if (pts.length < 2) return

    // Same sine bow as the normal drawing, but revealed in full.
    const screen = pts.map((p) => w2s(p.x, p.y))
    const a = screen[0]
    const b = screen[screen.length - 1]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = -(b.y - a.y) / len
    const ny = (b.x - a.x) / len
    const amp = Math.min(len * 0.04, 14)
    const arc = screen.map((s, i) => {
      const bow = Math.sin((i / (screen.length - 1)) * Math.PI) * amp
      return { x: s.x + nx * bow, y: s.y + ny * bow }
    })

    const color = PATH_COLOR[path.kind] ?? 'rgba(220,224,232,0.95)'
    ctx.save()
    ctx.globalAlpha = alpha
    // Halo escuro por baixo, para destacar sobre qualquer fundo do radar.
    ctx.strokeStyle = 'rgba(8, 11, 18, 0.7)'
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(arc[0].x, arc[0].y)
    for (let i = 1; i < arc.length - 1; i++) {
      const mx = (arc[i].x + arc[i + 1].x) / 2
      const my = (arc[i].y + arc[i + 1].y) / 2
      ctx.quadraticCurveTo(arc[i].x, arc[i].y, mx, my)
    }
    ctx.lineTo(arc[arc.length - 1].x, arc[arc.length - 1].y)
    ctx.stroke()

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(arc[0].x, arc[0].y)
    for (let i = 1; i < arc.length - 1; i++) {
      const mx = (arc[i].x + arc[i + 1].x) / 2
      const my = (arc[i].y + arc[i + 1].y) / 2
      ctx.quadraticCurveTo(arc[i].x, arc[i].y, mx, my)
    }
    ctx.lineTo(arc[arc.length - 1].x, arc[arc.length - 1].y)
    ctx.stroke()

    // Throw marker (hollow ring) and impact marker (filled disc).
    const start = arc[0]
    const end = arc[arc.length - 1]
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(end.x, end.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(start.x, start.y, 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  return {
    PATH_COLOR,
    KIND_ICON,
    smokeRadius,
    fireRadius,
    drawGrenade,
    drawScorch,
    drawGrenadePath,
    drawGrenadePathPreview,
  }
}
