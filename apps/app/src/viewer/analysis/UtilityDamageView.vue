<script setup lang="ts">
import { computed } from 'vue'
import type { Replay } from '@/viewer/domain/schema'
import { computeDamageStats, groupTeams } from '@/viewer/analysis/utilityStats'
import UtilityTeamGrid from '@/viewer/analysis/UtilityTeamGrid.vue'
import { useI18n } from '@/i18n'

/**
 * Damage sub-tab: per-player HE + molotov metrics grouped by team (thrown,
 * utility damage, per-throw / per-round rates, and kills), inspired by CS Demo
 * Manager's explosive-grenade panel. Damage comes from `Round.utilityDamage`.
 */
const props = defineProps<{ replay: Replay }>()

const { t } = useI18n()

const teams = computed(() => {
  const ts = groupTeams(props.replay)
  ts[0].name ||= t('economy.team1')
  ts[1].name ||= t('economy.team2')
  return ts
})
const stats = computed(() => computeDamageStats(props.replay))

/** Empty when no utility damage and nothing thrown (e.g. an older replay parsed
 *  before the utilityDamage field existed). */
const isEmpty = computed(() => {
  for (const s of stats.value.byPlayer.values()) {
    if (s.damage || s.thrown || s.kills) return false
  }
  return true
})

function fmt(n: number, digits = 1): string {
  return n.toFixed(digits)
}

const rows = computed(() => {
  const by = stats.value.byPlayer
  const rounds = Math.max(1, stats.value.roundCount)
  const get = (id: string) => by.get(id)
  return [
    { key: 'thrown', label: t('utilities.damage.thrown'), value: (id: string) => get(id)?.thrown ?? 0 },
    { key: 'total', label: t('utilities.damage.total'), value: (id: string) => get(id)?.damage ?? 0 },
    {
      key: 'perThrow',
      label: t('utilities.damage.perThrow'),
      value: (id: string) => {
        const s = get(id)
        return s && s.thrown ? fmt(s.damage / s.thrown) : '-'
      },
    },
    {
      key: 'perRound',
      label: t('utilities.damage.perRound'),
      value: (id: string) => fmt((get(id)?.damage ?? 0) / rounds),
    },
    { key: 'kills', label: t('utilities.damage.kills'), value: (id: string) => get(id)?.kills ?? 0 },
  ]
})
</script>

<template>
  <div class="h-full w-full overflow-y-auto [scrollbar-gutter:stable]">
    <div class="mx-auto max-w-5xl px-6 py-6">
      <p v-if="isEmpty" class="rounded-lg border border-ink-800 bg-ink-900/40 px-4 py-6 text-center text-sm text-ink-500">
        {{ t('utilities.empty') }}
      </p>
      <template v-else>
        <UtilityTeamGrid :teams="teams" :rows="rows" />
        <p class="mt-3 text-xs text-ink-600">{{ t('utilities.damage.hint') }}</p>
      </template>
    </div>
  </div>
</template>
