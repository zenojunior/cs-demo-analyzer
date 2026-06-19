<script setup lang="ts">
import { computed } from 'vue'
import type { GameEvent, PlayerMeta, Round, Side } from '@/viewer/domain/schema'
import { SIDE_COLOR } from '@/viewer/domain/colors'
import { killWeaponIcon } from '@/viewer/domain/weaponIcons'
import { flashSetupForKill, roundSides } from '@/viewer/analysis/utilityStats'
import { useI18n } from '@/i18n'

const { t } = useI18n()

type Kill = Extract<GameEvent, { type: 'kill' }>

/** A killfeed row with the effective assist resolved: the demo's own assist when
 *  present, otherwise a flash assist derived from the round's blinds. */
interface FeedKill {
  k: Kill
  assisterSteamId: string | null
  assistedFlash: boolean
}

const props = defineProps<{
  round: Round | null
  currentT: number
  playersById: Map<string, PlayerMeta>
  sideById: Map<string, Side>
  max?: number
}>()

// Sides are stable within a round; memoize so the per-frame recompute below is cheap.
const sides = computed(() => (props.round ? roundSides(props.round) : new Map<string, Side>()))

const kills = computed<FeedKill[]>(() => {
  const round = props.round
  if (!round) return []
  const evs = round.events.filter((e): e is Kill => e.type === 'kill' && e.t <= props.currentT)
  return evs.slice(-(props.max ?? 5)).map((k) => {
    // A damage assist (or a flash assist the demo already credited) is authoritative.
    if (k.assisterSteamId)
      return { k, assisterSteamId: k.assisterSteamId, assistedFlash: k.assistedFlash }
    // Otherwise derive a flash assist from the blinds: some community/tournament
    // demos never set `assistedFlash` on player_death. A self-flash (flasher is the
    // killer) is not an assist, so it stays unassisted.
    const setup = flashSetupForKill(round, k, sides.value)
    if (setup && setup.flasher !== k.attackerSteamId)
      return { k, assisterSteamId: setup.flasher, assistedFlash: true }
    return { k, assisterSteamId: null, assistedFlash: false }
  })
})

const nameOf = (id: string | null) => (id ? (props.playersById.get(id)?.name ?? '') : '')
const colorOf = (id: string | null) =>
  id && props.sideById.get(id) ? SIDE_COLOR[props.sideById.get(id)!] : '#8a93a6'
</script>

<template>
  <div class="flex flex-col items-end gap-1">
    <div
      v-for="({ k, assisterSteamId, assistedFlash }, i) in kills"
      :key="k.tick + '-' + i"
      class="flex items-center gap-1.5 rounded-md bg-ink-950/75 px-2 py-1 text-xs backdrop-blur"
    >
      <!-- Killer first, then assister (CS2 killfeed order): killer + assister.
           The `+` takes the team color — killer and assister are always
           teammates. A flash assist adds the flash icon right after the `+`. -->
      <span
        v-if="k.attackerSteamId"
        class="font-medium"
        :style="{ color: colorOf(k.attackerSteamId) }"
      >
        {{ nameOf(k.attackerSteamId) }}
      </span>

      <template v-if="assisterSteamId">
        <span class="font-medium" :style="{ color: colorOf(k.attackerSteamId) }">+</span>
        <img
          v-if="assistedFlash"
          v-tooltip="t('viewer.flashAssist')"
          src="/weapons/flash.svg"
          alt="flash assist"
          class="h-3 w-3 opacity-90"
        />
        <span class="font-medium" :style="{ color: colorOf(assisterSteamId) }">
          {{ nameOf(assisterSteamId) }}
        </span>
      </template>
      <img
        v-if="killWeaponIcon(k.weapon)"
        :src="killWeaponIcon(k.weapon)!"
        :alt="k.weapon"
        class="h-3 w-6 object-contain opacity-90"
      />
      <span v-else class="text-ink-400">{{ k.weapon }}</span>
      <img
        v-if="k.headshot"
        v-tooltip="t('viewer.headshot')"
        src="/weapons/headshot.svg"
        alt="Headshot"
        class="h-3.5 w-3.5"
      />
      <span class="font-medium" :style="{ color: colorOf(k.victimSteamId) }">
        {{ nameOf(k.victimSteamId) }}
      </span>
    </div>
  </div>
</template>
