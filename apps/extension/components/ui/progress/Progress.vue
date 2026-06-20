<script setup lang="ts">
import { ProgressIndicator, ProgressRoot } from 'reka-ui'
import { cn } from '@/utils/cn'

const props = defineProps<{
  modelValue?: number
  class?: string
  indicatorClass?: string
}>()
</script>

<template>
  <ProgressRoot
    :model-value="modelValue"
    :class="cn('relative h-1.5 w-full overflow-hidden rounded-full bg-secondary', props.class)"
  >
    <ProgressIndicator
      :class="cn('h-full w-full flex-1 bg-primary transition-all duration-300', props.indicatorClass)"
      :style="`transform: translateX(-${100 - (modelValue ?? 0)}%)`"
    />
  </ProgressRoot>
</template>
