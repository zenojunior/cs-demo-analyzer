<script setup lang="ts">
import ReplayClip from '@/viewer/player/ReplayClip.vue'

/**
 * Looping preview of the 2D viewer for the landing: a short round (static
 * fixture) played on loop, with no audio or controls. A thin wrapper over the
 * generic `ReplayClip` (whole round, fetched from `src`); kept as its own
 * component for the landing's map-rotation semantics (`@ended`).
 */
withDefaults(defineProps<{ src?: string; autoZoom?: boolean; loop?: boolean }>(), {
  src: '/replays/inferno-preview.json',
  autoZoom: false,
  // When false, emit `ended` on round completion instead of restarting, letting
  // the parent rotate to a different map.
  loop: true,
})

const emit = defineEmits<{ ended: [] }>()
</script>

<template>
  <ReplayClip
    :src="src"
    :round="0"
    :loop="loop"
    :speed="1.4"
    :auto-zoom="autoZoom"
    class="h-full w-full"
    @ended="emit('ended')"
  />
</template>
