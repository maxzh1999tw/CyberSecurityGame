<script setup lang="ts">
// 勝負揭曉
import { computed } from 'vue'
import { defenseProgress, OUTCOME_TEXT } from '../game/company'
import { restartCompany } from '../game/companyStore'
import { MISSIONS } from '../game/data'
import { ctrlCount } from '../game/engine'
import { backToMenu, game, openReview, startGame, ui } from '../game/store'
import Icon from './Icon.vue'

const s = computed(() => game.s!)
// 公司模式：贏輸要從公司的角度看
const outcome = computed(() => (s.value.company?.outcome ? OUTCOME_TEXT[s.value.company.outcome] : null))
const win = computed(() => (outcome.value ? outcome.value.win : ui.result === 'win'))
const m = computed(() => MISSIONS[s.value.mission])
const stats = computed(() => {
  const co = s.value.company
  if (co) {
    // 公司模式：從經營者的角度結算
    const dp = defenseProgress(s.value)
    return [
      { icon: 'history', label: '經營回合', v: co.turn },
      { icon: 'coins', label: '最終資產', v: `${co.assets}K` },
      { icon: 'shield-check', label: '確認的牌', v: `${Math.round((dp.known / dp.total) * 100)}%` },
      { icon: 'volume-2', label: '警戒值', v: s.value.alert },
    ]
  }
  return hackerStats.value
})
const hackerStats = computed(() => [
  { icon: 'history', label: '回合', v: s.value.turn },
  { icon: 'volume-2', label: '警戒值', v: s.value.alert },
  { icon: 'skull', label: '控制節點', v: ctrlCount(s.value) },
  { icon: 'layers', label: '出牌', v: s.value.plays.length },
])
</script>

<template>
  <Transition name="pop">
    <div v-if="ui.resultShown" class="res" :class="[win ? 'win' : 'lose', { office: !!outcome }]">
      <div class="veil"></div>
      <div class="panel">
        <div class="band">
          <Icon :name="win ? 'trophy' : 'skull'" :size="60" :stroke="1.8" />
          <div class="title">{{ outcome ? outcome.title : win ? '任務完成' : '行動失敗' }}</div>
        </div>
        <div class="sub">
          <template v-if="outcome">{{ outcome.text }}<template v-if="s.company?.outcome === 'breached' || s.company?.outcome === 'blocked'">（{{ m.name }}）</template></template>
          <template v-else-if="win">{{ m.name }}</template>
          <template v-else>{{ s.loseReason }}</template>
        </div>
        <div class="stats">
          <div v-for="st in stats" :key="st.label" class="st">
            <b>{{ st.v }}</b>
            <span><Icon :name="st.icon" :size="18" :stroke="2.4" />{{ st.label }}</span>
          </div>
        </div>
        <div v-if="outcome" class="btns">
          <button class="primary" @click="restartCompany()">
            <Icon name="rotate-ccw" :size="24" :stroke="2.2" />再經營一間
          </button>
          <button @click="backToMenu()">
            <Icon name="menu" :size="24" :stroke="2.2" />回主選單
          </button>
        </div>
        <div v-else class="btns">
          <button class="primary" @click="openReview">
            <Icon name="book-open" :size="26" :stroke="2.2" />看覆盤
          </button>
          <button @click="startGame()">
            <Icon name="rotate-ccw" :size="24" :stroke="2.2" />再玩一局
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.res {
  position: absolute;
  inset: 0;
  z-index: 95;
  display: grid;
  place-items: center;
  --rc: #c99a2c;
  --rd: #8f6a26;
}
.res.lose {
  --rc: #b83f32;
  --rd: #7a2a22;
}
.veil {
  position: absolute;
  inset: 0;
  background: rgba(6, 9, 14, 0.84);
}
.panel {
  position: relative;
  width: 780px;
  padding: 0 0 38px;
  border-radius: 22px;
  border: 6px solid var(--rc);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: var(--slate);
  box-shadow:
    0 0 0 3px var(--rd),
    0 30px 70px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}
.band {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 22px 0;
  color: #fff;
  background: var(--rc);
}
.title {
  font-size: 72px;
  font-weight: 900;
  letter-spacing: 14px;
  text-indent: 14px;
  line-height: 1.1;
  text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
}
.sub {
  padding: 0 30px;
  font-size: 30px;
  font-weight: 700;
  color: #fff;
  text-align: center;
}
.stats {
  display: flex;
  gap: 18px;
}
.st {
  width: 148px;
  padding: 12px 0 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 12px;
  background: #1a2231;
  border: 2px solid var(--edge);
}
.st b {
  font-family: var(--font-num);
  font-size: 52px;
  line-height: 1.1;
  color: #fff;
}
.st span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 20px;
  color: var(--text2);
}
.btns {
  display: flex;
  gap: 18px;
  margin-top: 6px;
}
.btns button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 68px;
  padding: 0 36px;
  border-radius: 14px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 3px;
  background: #2c3d5c;
  border: 3px solid var(--edge2);
  box-shadow: 0 5px 0 #151b27;
  transition: 0.12s;
}
.btns button:hover {
  filter: brightness(1.15);
}
.btns button:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #151b27;
}
.btns .primary {
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border-color: var(--gold3);
  box-shadow: 0 5px 0 #6d4f17;
}
.btns .primary:active {
  box-shadow: 0 2px 0 #6d4f17;
}
.pop-enter-active {
  animation: pop-in 0.5s cubic-bezier(0.2, 1.2, 0.3, 1);
}
/* 公司模式：辦公室配色（淺色面板、藍色主按鈕） */
.office .veil {
  background: rgba(29, 53, 87, 0.6);
  backdrop-filter: blur(3px);
}
.office .panel {
  background: linear-gradient(180deg, #f7f9fb, #eaeef3);
  box-shadow:
    0 0 0 3px var(--rd),
    0 30px 70px rgba(20, 35, 60, 0.45);
}
.office .sub {
  color: var(--o-navy);
}
.office .st {
  background: #fff;
  border-color: #d0d8e2;
}
.office .st b {
  color: var(--o-navy);
}
.office .st span {
  color: var(--text3);
}
.office .btns button {
  color: var(--o-navy);
  background: linear-gradient(180deg, #f7f9fb, #e3e9f1);
  border-color: #b3c0d3;
  box-shadow: 0 5px 0 #9aa9be;
}
.office .btns .primary {
  color: #fff;
  background: linear-gradient(180deg, #3d70bf, var(--o-blue));
  border-color: #1b4ea3;
  box-shadow: 0 5px 0 #173f85;
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.75);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
