<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { companyEndTurn, confirmCompanyIntro } from '../game/companyStore'
import { confirmIntro, endTurn, game, playLine, ui } from '../game/store'
import AlertMeter from './AlertMeter.vue'
import CoachOverlay from './CoachOverlay.vue'
import ControlledList from './ControlledList.vue'
import BoardLayers from './BoardLayers.vue'
import CastLayer from './CastLayer.vue'
import CompanyHud from './CompanyHud.vue'
import CompanyPanel from './CompanyPanel.vue'
import CompanyStatus from './CompanyStatus.vue'
import EffectLayer from './EffectLayer.vue'
import GameMenu from './GameMenu.vue'
import HackerFeed from './HackerFeed.vue'
import HandArea from './HandArea.vue'
import HelpOverlay from './HelpOverlay.vue'
import IntroOverlay from './IntroOverlay.vue'
import CompanyIntro from './CompanyIntro.vue'
import MissionPanel from './MissionPanel.vue'
import MobileInfoPopover from './MobileInfoPopover.vue'
import NodeTip from './NodeTip.vue'
import PlayerHud from './PlayerHud.vue'
import ResultOverlay from './ResultOverlay.vue'
import TargetArrow from './TargetArrow.vue'

// 公司模式：你經營公司，駭客由電腦操作
const company = computed(() => game.s?.mode === 'company')

// 拖「不用選目標」的牌時，場上亮出出牌區
const zone = computed(() => {
  const d = ui.drag
  if (!d || !d.moved || d.mode !== 'auto' || d.pb.status === 'dead') return null
  return { active: d.y < playLine() }
})

function onKey(e: KeyboardEvent) {
  if (ui.help) return
  if (e.code === 'Space') {
    e.preventDefault()
    if (!e.repeat) {
      if (ui.intro) confirmIntro()
      else if (ui.companyIntro) confirmCompanyIntro()
      else if (ui.busy || ui.drag) return
      else if (company.value) companyEndTurn()
      else void endTurn()
    }
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="game felt" :class="{ office: company }" @click="ui.menuOpen && (ui.menuOpen = false)">
    <aside class="rail left">
      <CompanyStatus v-if="company" />
      <template v-else><MissionPanel /><ControlledList /></template>
    </aside>
    <aside class="rail right">
      <div class="gearbox"><GameMenu @click.stop /></div>
      <HackerFeed v-if="company" />
      <CompanyPanel v-else />
    </aside>

    <div class="top"><AlertMeter /></div>

    <div v-if="zone" class="playzone" :class="{ active: zone.active }"></div>
    <BoardLayers />
    <CompanyHud v-if="company" />
    <PlayerHud v-else />
    <HandArea />
    <TargetArrow />
    <NodeTip />
    <CastLayer />
    <EffectLayer />
    <IntroOverlay />
    <CompanyIntro v-if="company" />
    <ResultOverlay />
    <CoachOverlay />
    <HelpOverlay />
    <MobileInfoPopover />
  </div>
</template>

<style scoped>
.game {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* clip：不能被捲動。點到半露出畫面的按鈕時，瀏覽器不會把整個畫面捲上去 */
  overflow: clip;
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
  width: 350px;
  border-right: 2px solid #283246;
  /* 側欄像一塊壓在桌面上的板子：內緣一道反光、外側投影 */
  box-shadow:
    1px 0 0 rgba(255, 255, 255, 0.05),
    10px 0 26px rgba(0, 0, 0, 0.32);
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 190px;
}
.rail.right {
  right: 0;
  border-left: 2px solid #283246;
  box-shadow:
    -1px 0 0 rgba(255, 255, 255, 0.05),
    -10px 0 26px rgba(0, 0, 0, 0.32);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
/* 公司模式：右下角的回合資訊、換牌區、結束回合疊在右欄上，右欄底部要讓出這塊 */
.game.office .rail.right {
  padding-bottom: 320px;
}
.gearbox {
  display: flex;
  justify-content: flex-end;
}
.playzone {
  position: absolute;
  left: 360px;
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
  left: 350px;
  right: 280px;
  top: 12px;
  display: flex;
  justify-content: center;
  z-index: 12;
}

@media (pointer: coarse) and (orientation: landscape) and (max-width: 1000px) {
  /* Scope geometry to the board component root, never CompanyPanel's .board. */
  .game > :deep(.board) {
    top: 78px;
    bottom: 172px;
  }
}

@media (pointer: coarse) and (orientation: landscape) and (max-width: 1000px) and (max-height: 430px) {
  .rail.left {
    padding-top: 10px;
    gap: 8px;
  }
  .rail.right {
    padding-top: 10px;
    gap: 8px;
  }
  .game > :deep(.board) {
    top: 64px;
    bottom: 156px;
  }
}
</style>
