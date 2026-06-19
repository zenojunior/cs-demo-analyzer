<script setup lang="ts">
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
import UiIcon from '@/ui/UiIcon.vue'
import { cn } from '@/ui/utils'

/**
 * Themed single-select, following the shadcn-vue Select pattern on top of
 * reka-ui (same base as the context menu). Used for compact filters; pass plain
 * `{ value, label }` options and bind with `v-model`.
 */
const props = defineProps<{
  options: { value: string; label: string }[]
  placeholder?: string
  class?: string
}>()

const model = defineModel<string>()
</script>

<template>
  <SelectRoot v-model="model">
    <SelectTrigger
      :class="
        cn(
          'flex h-7 items-center justify-between gap-2 rounded border border-ink-700 bg-ink-950 px-2 text-xs text-ink-200 outline-none transition-colors hover:border-ink-500 focus:border-surge-500 data-[placeholder]:text-ink-500',
          props.class,
        )
      "
    >
      <SelectValue :placeholder="placeholder" class="truncate" />
      <SelectIcon as-child>
        <UiIcon name="chevron-down" class="h-3.5 w-3.5 shrink-0 text-ink-400" />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        class="z-50 max-h-64 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-lg border border-ink-700 bg-ink-900/95 p-1 text-ink-100 shadow-xl shadow-black/50 backdrop-blur"
      >
        <SelectViewport>
          <SelectItem
            v-for="o in options"
            :key="o.value"
            :value="o.value"
            class="relative flex cursor-pointer select-none items-center rounded py-1.5 pl-7 pr-2 text-xs text-ink-200 outline-none data-[highlighted]:bg-ink-800 data-[state=checked]:text-surge-200"
          >
            <SelectItemIndicator class="absolute left-1.5 inline-flex items-center">
              <UiIcon name="check" class="h-3.5 w-3.5" />
            </SelectItemIndicator>
            <SelectItemText>{{ o.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
