<script setup lang="ts">
import { computed } from 'vue'
import type { Replay } from '@/viewer/domain/schema'
import { computeFlashStats, groupTeams } from '@/viewer/analysis/utilityStats'
import UtilityTeamGrid from '@/viewer/analysis/UtilityTeamGrid.vue'
import { useI18n } from '@/i18n'

/**
 * Flashes sub-tab: per-player flash metrics grouped by team (thrown, enemies
 * blinded, blind duration, and per-throw / per-round rates), plus a flasher x
 * victim blind-duration matrix (allies included), inspired by CS Demo Manager's
 * flashbang panel.
 */
const props = defineProps<{ replay: Replay }>()

const { t } = useI18n()

const teams = computed(() => {
  const ts = groupTeams(props.replay)
  ts[0].name ||= t('economy.team1')
  ts[1].name ||= t('economy.team2')
  return ts
})
const stats = computed(() => computeFlashStats(props.replay))

/** Empty when no flash was thrown and no blind was recorded (e.g. a demo whose
 *  GOTV stream carries no player_blind events). */
const isEmpty = computed(
  () => stats.value.byPlayer.size === 0 && stats.value.matrix.size === 0,
)

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits)
}

const rows = computed(() => {
  const by = stats.value.byPlayer
  const rounds = Math.max(1, stats.value.roundCount)
  const get = (id: string) => by.get(id)
  return [
    { key: 'thrown', label: t('utilities.flash.thrown'), value: (id: string) => get(id)?.thrown ?? 0 },
    {
      key: 'blinded',
      label: t('utilities.flash.enemiesBlinded'),
      value: (id: string) => get(id)?.enemiesBlinded ?? 0,
    },
    {
      key: 'duration',
      label: t('utilities.flash.duration'),
      value: (id: string) => fmt(get(id)?.enemyBlindDuration ?? 0, 1),
    },
    {
      key: 'perThrow',
      label: t('utilities.flash.perThrow'),
      value: (id: string) => {
        const s = get(id)
        return s && s.thrown ? fmt(s.enemiesBlinded / s.thrown) : '-'
      },
    },
    {
      key: 'perRound',
      label: t('utilities.flash.perRound'),
      value: (id: string) => fmt((get(id)?.enemiesBlinded ?? 0) / rounds),
    },
  ]
})

// --- Matrix (flasher row x victim column, blind seconds) ---

const TEAM_COLOR = ['#e0b341', '#6b78e0'] as const

/** All players in team order, tagged with their team color, for the axes. */
const axis = computed(() =>
  teams.value.flatMap((team) =>
    team.players.map((p) => ({ ...p, color: TEAM_COLOR[team.id] })),
  ),
)

function cellValue(flasher: string, victim: string): number {
  return stats.value.matrix.get(flasher)?.get(victim) ?? 0
}

const maxCell = computed(() => {
  let m = 0
  for (const row of stats.value.matrix.values()) for (const v of row.values()) m = Math.max(m, v)
  return m || 1
})

/** Blue fill scaled by the cell's share of the max (transparent at 0). */
function cellStyle(v: number) {
  if (v <= 0) return { backgroundColor: 'transparent' }
  const a = 0.12 + 0.88 * (v / maxCell.value)
  return { backgroundColor: `rgba(59, 130, 246, ${a.toFixed(3)})` }
}
</script>

<template>
  <div class="h-full w-full overflow-y-auto [scrollbar-gutter:stable]">
    <div class="mx-auto max-w-5xl px-6 py-6">
      <p v-if="isEmpty" class="rounded-lg border border-ink-800 bg-ink-900/40 px-4 py-6 text-center text-sm text-ink-500">
        {{ t('utilities.flash.empty') }}
      </p>

      <template v-else>
        <!-- Per-player metrics by team -->
        <UtilityTeamGrid :teams="teams" :rows="rows" />

        <!-- Blind-duration matrix -->
        <section class="mt-10">
          <h3 class="mb-1 font-display text-sm text-ink-50">{{ t('utilities.flash.matrixTitle') }}</h3>
          <p class="mb-3 text-xs text-ink-500">{{ t('utilities.flash.matrixHint') }}</p>

          <table class="w-full table-fixed border-separate border-spacing-1 text-center text-xs">
            <tbody>
              <tr v-for="f in axis" :key="f.steamId">
                <!-- Row label: flasher name + team dot -->
                <th class="w-28 truncate pr-2 text-right font-medium text-ink-300" :title="f.name">
                  <span class="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" :style="{ backgroundColor: f.color }" />
                  {{ f.name }}
                </th>
                <td
                  v-for="v in axis"
                  :key="v.steamId"
                  class="rounded px-1 py-1.5 font-mono tabular-nums"
                  :class="cellValue(f.steamId, v.steamId) > 0 ? 'text-white' : 'text-ink-700'"
                  :style="cellStyle(cellValue(f.steamId, v.steamId))"
                >
                  {{ fmt(cellValue(f.steamId, v.steamId)) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <!-- Column labels at the bottom (victims), matching CSDM -->
              <tr class="text-[11px] text-ink-400">
                <td />
                <td v-for="v in axis" :key="v.steamId" class="truncate px-1 pt-1" :title="v.name">
                  <span class="mr-0.5 inline-block h-1.5 w-1.5 rounded-full align-middle" :style="{ backgroundColor: v.color }" />
                  {{ v.name }}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      </template>
    </div>
  </div>
</template>
