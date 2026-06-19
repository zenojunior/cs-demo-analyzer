<script setup lang="ts">
import type { Team } from '@/viewer/analysis/utilityStats'

/**
 * Two-team stat grid, mirroring CS Demo Manager's grenade panels: each team's
 * players are columns, each metric is a row, and the metric label sits in the
 * center between the two teams. Generic over the metrics, so the flashes and
 * damage views reuse it with their own rows.
 */
defineProps<{
  /** Exactly two teams (started CT, started T). */
  teams: Team[]
  /** One row per metric; `value` formats the cell for a given player. */
  rows: { key: string; label: string; value: (steamId: string) => string | number }[]
}>()

/** Stable team identity colors (not side), matching the economy view. */
const TEAM_COLOR = ['#e0b341', '#6b78e0'] as const
</script>

<template>
  <table class="w-full table-fixed border-separate border-spacing-1 text-center text-sm">
    <thead>
      <!-- Team names, spanning their players -->
      <tr>
        <th
          v-if="teams[0].players.length"
          :colspan="teams[0].players.length"
          class="px-2 pb-1 text-left text-sm font-semibold"
          :style="{ color: TEAM_COLOR[0] }"
        >
          {{ teams[0].name }}
        </th>
        <th class="w-56" />
        <th
          v-if="teams[1].players.length"
          :colspan="teams[1].players.length"
          class="px-2 pb-1 text-right text-sm font-semibold"
          :style="{ color: TEAM_COLOR[1] }"
        >
          {{ teams[1].name }}
        </th>
      </tr>
      <!-- Player names -->
      <tr class="text-[11px] text-ink-400">
        <th
          v-for="p in teams[0].players"
          :key="p.steamId"
          class="truncate px-1 pb-1 font-medium"
          :title="p.name"
        >
          {{ p.name }}
        </th>
        <th />
        <th
          v-for="p in teams[1].players"
          :key="p.steamId"
          class="truncate px-1 pb-1 font-medium"
          :title="p.name"
        >
          {{ p.name }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.key">
        <td
          v-for="p in teams[0].players"
          :key="p.steamId"
          class="rounded bg-ink-900/50 px-1 py-2 font-mono tabular-nums text-ink-100"
        >
          {{ row.value(p.steamId) }}
        </td>
        <td class="px-2 py-2 text-[13px] text-ink-300">{{ row.label }}</td>
        <td
          v-for="p in teams[1].players"
          :key="p.steamId"
          class="rounded bg-ink-900/50 px-1 py-2 font-mono tabular-nums text-ink-100"
        >
          {{ row.value(p.steamId) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
