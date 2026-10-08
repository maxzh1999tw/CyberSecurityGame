<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { confirmIntro, endTurn, fastForward, playLine, ui } from '../game/store'
import AlertMeter from './AlertMeter.vue'
import CoachOverlay from './CoachOverlay.vue'
import ControlledList from './ControlledList.vue'
import BoardLayers from './BoardLayers.vue'
import CastLayer from './CastLayer.vue'
import CompanyPanel from './CompanyPanel.vue'
import EffectLayer from './EffectLayer.vue'
import GameMenu from './GameMenu.vue'
import HandArea from './HandArea.vue'
import HelpOverlay from './HelpOverlay.vue'
import IntroOverlay from './IntroOverlay.vue'
import MissionPanel from './MissionPanel.vue'
import StageTrack from './StageTrack.vue'
import NodeTip from './NodeTip.vue'
import PlayerHud from './PlayerHud.vue'
import ResultOverlay from './ResultOverlay.vue'
import TargetArrow from './TargetArrow.vue'

// 拖「不用選目標」的牌時，場上亮出出牌區
const zone = computed(() => {
  const d = ui.drag
  if (!d || !d.moved || d.mode !== 'auto' || d.pb.status === 'dead') return null
  return { active: d.y < playLine() }
})

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault()
    if (!e.repeat) {
      if (ui.intro) confirmIntro()
      else if (ui.busy) fastForward()
      else if (!ui.drag) void endTurn()
    }
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="game felt" @pointerdown.capture="fastForward" @click="ui.menuOpen && (ui.menuOpen = false)">
    <aside class="rail left"><MissionPanel /><StageTrack /><ControlledList /></aside>
    <aside class="rail right">
      <div class="gearbox"><GameMenu @click.stop /></div>
      <CompanyPanel />
    </aside>

    <div class="top"><AlertMeter /></div>

    <div v-if="zone" class="playzone" :class="{ active: zone.active }"></div>
    <BoardLayers />
    <PlayerHud />
    <HandArea />
    <TargetArrow />
    <NodeTip />
    <CastLayer />
    <EffectLayer />
    <IntroOverlay />
    <ResultOverlay />
    <CoachOverlay />
    <HelpOverlay />
  </div>
</template>

<style scoped>
.game {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.rail {
  position: absolute;
  top: 0;
  bottom: 0;
  box-sizing: border-box;
  width: 280px;
  padding: 24px 20px;
  background: linear-gradient(180deg, rgba(8, 11, 17, 0.78), rgba(8, 11, 17, 0.55));
  z-index: 10;
}
.rail.left {
  left: 0;
  border-right: 2px solid #283246;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 190px;
}
.rail.right {
  right: 0;
  border-left: 2px solid #283246;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.gearbox {
  display: flex;
  justify-content: flex-end;
}
.playzone {
  position: absolute;
  left: 290px;
  right: 290px;
  top: 88px;
  bottom: 250px;
  border-radius: 20px;
  border: 4px dashed rgba(216, 176, 90, 0.45);
  background: rgba(216, 176, 90, 0.04);
  pointer-events: none;
  z-index: 8;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.playzone.active {
  border-color: var(--gold2);
  background: rgba(216, 176, 90, 0.1);
}
.top {
  position: absolute;
  left: 280px;
  right: 280px;
  top: 12px;
  display: flex;
  justify-content: center;
  z-index: 12;
}
</style>
