<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Replay } from '@/viewer/domain/schema'
import ViewerMap from '@/viewer/player/ViewerMap.vue'
import { useReplay } from '@/viewer/player/useReplay'
import { useClipRecorder } from '@/viewer/player/useClipRecorder'
import { MAP_CALIBRATION } from '@/viewer/domain/calibration'
import UiIcon from '@/ui/UiIcon.vue'

/**
 * Self-contained, embeddable replay clip: packages the playback engine
 * (`useReplay`) with the 2D map (`ViewerMap`) so any page can drop in a short,
 * looping playback of a round, or of a `[from, to]` window of it (e.g. the
 * moment around a kill), with no controls or audio. Feed it a `Replay` already
 * in memory (preferred) or a `src` URL to a replay JSON.
 */
const props = withDefaults(
  defineProps<{
    /** In-memory replay (preferred when the page already parsed it). */
    replay?: Replay | null
    /** Or a URL to fetch a replay JSON from (used by the landing preview). */
    src?: string
    /** Round to play (array index). */
    round?: number
    /** Optional playback window within the round, in seconds since freeze. Omit
     *  both to play the whole round. */
    from?: number
    to?: number
    /** Loop at the end (of the clip or the round). When false, emit `ended`. */
    loop?: boolean
    autoplay?: boolean
    speed?: number
    /** Zoom: frame all living players, or follow one (overrides autoZoom). */
    autoZoom?: boolean
    followSteamId?: string | null
    /** Frame just these players (e.g. the two in a kill), zoomed in tight. */
    focusSteamIds?: string[] | null
    /** Track a moving point along this timed polyline (e.g. a grenade's arc):
     *  the camera follows its interpolated position, clamped to the path's span. */
    followPath?: { t: number; x: number; y: number }[] | null
    /** Player the clip is about: a red eye is drawn before their name on the map. */
    observedSteamId?: string | null
    /** Active floor radar + Z range for multi-level maps (Nuke), passed through. */
    radarSrc?: string
    levelRange?: { minZ: number; maxZ: number } | null
  }>(),
  {
    round: 0,
    loop: true,
    autoplay: true,
    speed: 1,
    autoZoom: false,
    followSteamId: null,
  },
)

const emit = defineEmits<{ ended: [] }>()

const r = useReplay()
const ready = ref(false)
let mounted = true

const mapRef = ref<InstanceType<typeof ViewerMap> | null>(null)
const recorder = useClipRecorder()
// While exporting we drive a single, non-looping pass and grab the canvas
// stream, so the normal "stopped" handling (re-loop / emit ended) must stand
// down until the pass finishes.
const exporting = ref(false)

const calibration = computed(() => {
  const map = r.replay.value?.map
  return (map && MAP_CALIBRATION[map]) || MAP_CALIBRATION.de_dust2
})

// Clip mode (a bounded `[from, to]` window): show a progress bar and let a click
// pause/resume, so it's clear the playback is looping and controllable.
const isClip = computed(() => props.from != null && props.to != null)
const progress = computed(() => {
  if (!isClip.value) return 0
  const span = props.to! - props.from! || 1
  return Math.min(1, Math.max(0, (r.currentT.value - props.from!) / span))
})

// Tracked point along `followPath` at the current time, clamped to the path's
// span (so it sits at the throw origin before launch and the landing after).
const focusWorld = computed(() => {
  const pts = props.followPath
  if (!pts || !pts.length) return null
  const t = r.currentT.value
  if (t <= pts[0].t) return { x: pts[0].x, y: pts[0].y }
  const last = pts[pts.length - 1]
  if (t >= last.t) return { x: last.x, y: last.y }
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].t >= t) {
      const a = pts[i - 1]
      const b = pts[i]
      const f = (t - a.t) / (b.t - a.t || 1)
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
    }
  }
  return { x: last.x, y: last.y }
})

/** (Re)points the engine at the requested round + window and starts playback. */
function apply() {
  if (!r.replay.value) return
  r.speed.value = props.speed
  r.selectRound(props.round)
  // A `[from, to]` window plays (and loops) just that slice; otherwise the whole
  // round, looped by hand below (the engine only loops the clip case).
  if (props.from != null && props.to != null) {
    r.setClip({ from: props.from, to: props.to, loop: props.loop })
  } else {
    r.setClip(null)
  }
  ready.value = true
  if (props.autoplay) r.play()
}

// Playback stopped. For a whole round, loop it by hand or hand control back to
// the parent. For a clip, the engine loops it internally, so a stop is a manual
// pause (do nothing) unless a non-looping clip actually reached its end.
watch(r.playing, (playing) => {
  if (playing || !mounted || !ready.value || exporting.value) return
  if (props.from == null) {
    if (props.loop) {
      r.selectRound(props.round)
      r.play()
    } else {
      emit('ended')
    }
  } else if (!props.loop && progress.value >= 0.999) {
    emit('ended')
  }
})

async function load() {
  if (props.replay) {
    r.setReplay(props.replay)
    apply()
    return
  }
  if (props.src) {
    try {
      const res = await fetch(props.src)
      const replay = (await res.json()) as Replay
      if (!mounted) return
      r.setReplay(replay)
      apply()
    } catch {
      // Missing/broken fixture: don't stall a rotation on a blank map, let the
      // parent move on after a short pause (avoids a hot loop if all fail).
      if (!props.loop && mounted) setTimeout(() => mounted && emit('ended'), 3000)
    }
  }
}

// Re-point the clip when the caller changes the round/window (same replay).
watch(
  () => [props.round, props.from, props.to],
  () => {
    if (ready.value) apply()
  },
)
// Swap the underlying replay if the in-memory source changes.
watch(
  () => props.replay,
  (rep) => {
    if (rep) load()
  },
)

// Set while capture is suspended because the tab went hidden: a stop in this
// state is a pause, not the clip's end, so `waitUntilStopped` must ignore it.
let hiddenPause = false

/** Resolves once playback reaches the clip's end (the engine pauses there),
 *  ignoring the intermediate pauses we trigger when the tab is hidden. */
function waitUntilStopped(): Promise<void> {
  return new Promise((resolve) => {
    if (!r.playing.value && !hiddenPause) {
      resolve()
      return
    }
    const stop = watch(r.playing, (playing) => {
      if (!playing && !hiddenPause) {
        stop()
        resolve()
      }
    })
  })
}

/**
 * Suspends capture + playback while the tab is hidden and resumes on return. A
 * hidden tab throttles rAF, which would otherwise freeze the canvas into a run
 * of duplicate frames (and stall the playback clock). `MediaRecorder.pause()`
 * and the engine's timing reset on `play()` make the seam invisible in the clip.
 */
function onVisibilityChange() {
  if (!exporting.value || !mounted) return
  if (document.hidden) {
    hiddenPause = true
    recorder.pause()
    r.pause()
  } else if (hiddenPause) {
    hiddenPause = false
    recorder.resume()
    r.play()
  }
}

/**
 * Records one non-looping pass of the current clip (or whole round) straight off
 * the map canvas and resolves the WebM Blob. Real-time capture: an 8s clip takes
 * ~8s. If the tab is hidden mid-capture it suspends and resumes on return (see
 * `onVisibilityChange`), so leaving and coming back doesn't corrupt the clip.
 * Restores normal looping playback afterwards. Resolves `null` if it can't record
 * (unsupported, already busy, or the clip unmounted mid-pass).
 */
async function recordClip(): Promise<Blob | null> {
  const canvas = mapRef.value?.canvas
  if (!canvas || !recorder.supported || recorder.recording.value || exporting.value) return null
  exporting.value = true
  const prevSpeed = r.speed.value
  try {
    r.pause()
    r.speed.value = 1
    r.selectRound(props.round)
    if (props.from != null && props.to != null) {
      r.setClip({ from: props.from, to: props.to, loop: false })
    } else {
      r.setClip(null)
    }
    // Let the first frame paint onto the canvas before the stream starts, so the
    // recording doesn't open on a blank/stale frame.
    await nextTick()
    await new Promise((res) => requestAnimationFrame(() => res(null)))
    if (!mounted) return null
    recorder.start(canvas, 30)
    r.play()
    document.addEventListener('visibilitychange', onVisibilityChange)
    await waitUntilStopped()
    const blob = await recorder.stop()
    return mounted ? blob : null
  } finally {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    hiddenPause = false
    r.speed.value = prevSpeed
    exporting.value = false
    if (mounted) apply()
  }
}

defineExpose({ recordClip, canExport: recorder.supported, exporting })

onMounted(load)
onBeforeUnmount(() => {
  mounted = false
  r.pause()
})
</script>

<template>
  <div v-if="ready && r.replay.value" class="relative h-full w-full">
    <ViewerMap
      ref="mapRef"
      :players="r.players.value"
      :current-t="r.currentT.value"
      :round="r.round.value"
      :calibration="calibration"
      :players-by-id="r.playersById.value"
      :bomb-blink="r.bombBlink.value"
      :auto-zoom="autoZoom"
      :follow-steam-id="followSteamId"
      :focus-steam-ids="focusSteamIds"
      :focus-world="focusWorld"
      :observed-steam-id="observedSteamId"
      :radar-src="radarSrc"
      :level-range="levelRange"
      :controls="false"
      :watermark="exporting"
    />

    <!-- Clip mode: a click toggles pause, with a centered play badge while
         paused; a thin progress bar makes the loop legible. While exporting the
         toggle is disabled (a mid-pass pause would truncate the recording) and a
         "REC" pill marks the live capture. -->
    <template v-if="isClip">
      <button
        type="button"
        class="group absolute inset-0 flex items-center justify-center"
        :disabled="exporting"
        :aria-label="r.playing.value ? 'pause' : 'play'"
        @click="r.toggle()"
      >
        <span
          v-if="!exporting"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-ink-950/60 text-ink-50 backdrop-blur transition-opacity"
          :class="r.playing.value ? 'opacity-0 group-hover:opacity-80' : 'opacity-90'"
        >
          <UiIcon :name="r.playing.value ? 'pause' : 'play'" class="h-5 w-5" />
        </span>
      </button>
      <div
        v-if="exporting"
        class="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-ink-50 backdrop-blur"
      >
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        REC
      </div>
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-ink-950/60">
        <div
          class="h-full"
          :class="exporting ? 'bg-red-500' : 'bg-surge-500'"
          :style="{ width: `${progress * 100}%` }"
        />
      </div>
    </template>
  </div>
</template>
