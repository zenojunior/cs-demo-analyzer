<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFloating, offset, flip, shift, autoUpdate, type ReferenceElement, type Placement } from '@floating-ui/vue'
import { onClickOutside } from '@vueuse/core'
import type { Replay } from '@/viewer/domain/schema'
import ReplayClip from '@/viewer/player/ReplayClip.vue'
import UiIcon from '@/ui/UiIcon.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

/**
 * Floating card that plays a looping mini-clip of a moment (a kill, a grenade
 * throw, a flash) and offers a "watch in match" jump. Map-agnostic and reusable:
 * pin it to any anchor (a canvas marker via a virtual element, or a clicked list
 * row / cell via its DOM node) and pass the clip window. The header (who/what)
 * is a slot, so each context renders its own line. Positioned with floating-ui
 * (flips / shifts to stay on screen) and teleported to the body so no ancestor's
 * overflow clips it.
 */
const props = withDefaults(
  defineProps<{
    /** Anchor: a DOM element or a virtual element (viewport-coord rect). */
    reference: ReferenceElement | null
    replay: Replay
    /** Round (array index) the moment belongs to. */
    round: number
    /** Instant to seek to in the full replay (the "watch in match" target, s). */
    jumpT: number
    /** Clip window within the round, in seconds since freeze. */
    from: number
    to: number
    /** Players to frame in the clip (e.g. the two in a kill, or the thrower). */
    focusSteamIds?: string[] | null
    /** Track a moving point along this timed polyline (e.g. a grenade's arc). */
    followPath?: { t: number; x: number; y: number }[] | null
    /** Player the clip is about: a red eye is drawn before their name on the map. */
    observedSteamId?: string | null
    /** Floor radar + Z range for multi-level maps (Nuke), passed to the clip. */
    radarSrc?: string
    levelRange?: { minZ: number; maxZ: number } | null
    placement?: Placement
    /** Close when the user clicks/taps outside the card (default true). Turn off
     *  where the host drives dismissal itself (e.g. the heatmap canvas, whose pan
     *  drag must not close the card). */
    dismissOnOutside?: boolean
    /** Re-measure the anchor every frame, so the card tracks a reference that
     *  moves without firing scroll/resize (e.g. a spot on a pannable map). */
    trackAnchor?: boolean
  }>(),
  {
    focusSteamIds: null,
    placement: 'top',
    dismissOnOutside: true,
    trackAnchor: false,
  },
)

const emit = defineEmits<{
  jump: [{ roundIndex: number; t: number }]
  close: []
}>()

const card = ref<HTMLElement | null>(null)
const anchor = computed(() => props.reference)

const { floatingStyles, isPositioned } = useFloating(anchor, card, {
  placement: props.placement,
  // Fixed against the viewport so the teleported card isn't offset by the body,
  // and bounded to the screen (flip/shift) rather than to any host container.
  strategy: 'fixed',
  whileElementsMounted: props.trackAnchor
    ? (r, f, update) => autoUpdate(r, f, update, { animationFrame: true })
    : autoUpdate,
  middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })],
})

if (props.dismissOnOutside) onClickOutside(card, () => emit('close'))
</script>

<template>
  <Teleport to="body">
    <div
      ref="card"
      class="z-50 flex w-72 flex-col gap-1.5 rounded-lg border border-ink-700 bg-ink-900/95 p-2 text-xs shadow-lg backdrop-blur"
      :style="[floatingStyles, { opacity: isPositioned ? '1' : '0' }]"
    >
      <!-- Header (who/what) + close. -->
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
          <slot name="header" />
        </div>
        <button
          type="button"
          :aria-label="t('heatmap.close')"
          class="-mr-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          @click="emit('close')"
        >
          <UiIcon name="x" class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Looping mini-clip of the moment. -->
      <div class="relative aspect-square w-full overflow-hidden rounded-md border border-ink-800 bg-ink-950">
        <ReplayClip
          :replay="replay"
          :round="round"
          :from="from"
          :to="to"
          :focus-steam-ids="focusSteamIds"
          :follow-path="followPath"
          :observed-steam-id="observedSteamId"
          :auto-zoom="!(focusSteamIds?.length || followPath?.length)"
          :radar-src="radarSrc"
          :level-range="levelRange"
        />
      </div>

      <!-- Open the moment in the full replay. -->
      <button
        type="button"
        class="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-ink-700 bg-ink-800/60 px-2 py-1.5 font-medium text-ink-100 transition-colors hover:border-surge-500/60 hover:bg-ink-800"
        @click="emit('jump', { roundIndex: round, t: jumpT })"
      >
        <UiIcon name="play" class="h-3.5 w-3.5" />
        {{ t('heatmap.watchInMatch') }}
      </button>
    </div>
  </Teleport>
</template>
