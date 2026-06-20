<script setup lang="ts">
import { computed, inject } from 'vue'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { Check, ChevronDown } from 'lucide-vue-next'
import { cn } from '@/utils/cn'

const props = defineProps<{
  /** '' means "no selection" → the `allLabel` entry is active. */
  modelValue: string
  options: { value: string; label: string }[]
  /** Label for the leading "all / any" entry (maps back to an empty value). */
  allLabel: string
  class?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

// reka-ui forbids an empty-string SelectItem value (it's reserved for clearing),
// so the "all" entry rides a sentinel and we translate at the boundary.
const ALL = '__all__'
const inner = computed({
  get: () => (props.modelValue === '' ? ALL : props.modelValue),
  set: (v: string) => emit('update:modelValue', v === ALL ? '' : v),
})

// Teleport target: the shadow-root container (see faceit.content/index.ts).
const uiRoot = inject<HTMLElement | undefined>('uiRoot', undefined)

const itemClass =
  'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-xs outline-none data-[highlighted]:bg-accent data-[state=checked]:text-primary'
</script>

<template>
  <SelectRoot v-model="inner">
    <SelectTrigger
      :class="
        cn(
          'inline-flex items-center justify-between gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-primary',
          props.class,
        )
      "
    >
      <SelectValue />
      <SelectIcon as-child>
        <ChevronDown class="size-3.5 shrink-0 opacity-60" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal :to="uiRoot">
      <SelectContent
        position="popper"
        :side-offset="4"
        class="z-[1000001] max-h-[min(16rem,var(--reka-select-content-available-height))] min-w-[var(--reka-select-trigger-width)] overflow-y-auto rounded-md border border-border bg-background text-foreground shadow-xl"
      >
        <SelectViewport class="p-1">
          <SelectItem :value="ALL" :class="itemClass">
            <SelectItemIndicator class="absolute left-2 inline-flex items-center">
              <Check class="size-3.5" />
            </SelectItemIndicator>
            <SelectItemText>{{ allLabel }}</SelectItemText>
          </SelectItem>
          <SelectItem v-for="opt in options" :key="opt.value" :value="opt.value" :class="itemClass">
            <SelectItemIndicator class="absolute left-2 inline-flex items-center">
              <Check class="size-3.5" />
            </SelectItemIndicator>
            <SelectItemText>{{ opt.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
