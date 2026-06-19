<script setup lang="ts">
import {
  PopoverClose,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import type { CellDetail } from '@/viewer/analysis/utilityStats'

/**
 * One stat cell of the team grid. When `details` has entries the value becomes a
 * clickable popover trigger listing the underlying plays; otherwise it is plain
 * text. Clicking a play with a `jump` target bubbles a `jump` event up so the
 * parent can seek the 2D replay.
 */
const props = defineProps<{
  value: string | number
  details?: CellDetail[]
}>()

const emit = defineEmits<{
  (e: 'jump', payload: { roundIndex: number; t: number }): void
}>()

const hasDetails = () => (props.details?.length ?? 0) > 0
</script>

<template>
  <PopoverRoot v-if="hasDetails()">
    <PopoverTrigger
      class="cursor-pointer rounded px-1 font-mono tabular-nums text-surge-200 underline decoration-dotted underline-offset-2 outline-none transition-colors hover:text-surge-100 focus-visible:ring-1 focus-visible:ring-surge-500"
    >
      {{ value }}
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side-offset="6"
        class="z-50 w-72 rounded-lg border border-ink-700 bg-ink-900/95 p-1.5 text-left shadow-xl shadow-black/50 backdrop-blur"
      >
        <ul class="space-y-0.5">
          <li v-for="d in details" :key="d.key">
            <PopoverClose
              v-if="d.jump"
              class="flex w-full cursor-pointer flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-ink-800 focus-visible:bg-ink-800 focus-visible:outline-none"
              @click="emit('jump', d.jump)"
            >
              <span class="text-xs text-ink-100">{{ d.text }}</span>
              <span v-if="d.sub" class="font-mono text-[11px] text-ink-500">{{ d.sub }}</span>
            </PopoverClose>
            <div v-else class="flex flex-col gap-0.5 px-2 py-1.5">
              <span class="text-xs text-ink-100">{{ d.text }}</span>
              <span v-if="d.sub" class="font-mono text-[11px] text-ink-500">{{ d.sub }}</span>
            </div>
          </li>
        </ul>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
  <span v-else class="font-mono tabular-nums text-ink-100">{{ value }}</span>
</template>
