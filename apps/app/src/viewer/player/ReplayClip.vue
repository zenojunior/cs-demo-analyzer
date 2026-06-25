<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Replay } from '@/viewer/domain/schema'
import ViewerMap from '@/viewer/player/ViewerMap.vue'
import { useReplay } from '@/viewer/player/useReplay'
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
  if (playing || !mounted || !ready.value) return
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

onMounted(load)
onBeforeUnmount(() => {
  mounted = false
  r.pause()
})
</script>

<template>
  <div v-if="ready && r.replay.value" class="relative h-full w-full">
    <ViewerMap
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
    />

    <!-- Clip mode: a click toggles pause, with a centered play badge while
         paused; a thin progress bar makes the loop legible. -->
    <template v-if="isClip">
      <button
        type="button"
        class="group absolute inset-0 flex items-center justify-center"
        :aria-label="r.playing.value ? 'pause' : 'play'"
        @click="r.toggle()"
      >
        <span
          class="flex h-10 w-10 items-center justify-center rounded-full bg-ink-950/60 text-ink-50 backdrop-blur transition-opacity"
          :class="r.playing.value ? 'opacity-0 group-hover:opacity-80' : 'opacity-90'"
        >
          <UiIcon :name="r.playing.value ? 'pause' : 'play'" class="h-5 w-5" />
        </span>
      </button>
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-ink-950/60">
        <div class="h-full bg-surge-500" :style="{ width: `${progress * 100}%` }" />
      </div>
    </template>
  </div>
</template>
