<script setup lang="ts">
import { cn } from '@/utils/cn'
import { buttonVariants, type ButtonVariants } from './index'

const props = defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: string
}>()
</script>

<template>
  <button :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)">
    <slot />
  </button>
</template>
