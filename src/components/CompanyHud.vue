<script setup lang="ts">
// 公司模式右下：換牌與結束回合
import { computed } from 'vue'
import { COMPANY } from '../game/companyData'
import { companyEndTurn } from '../game/companyStore'
import { game, registerAnchor, ui } from '../game/store'
import Icon from './Icon.vue'

const s = computed(() => game.s!)
const myTurn = computed(() => s.value.phase === 'company' && !ui.busy)
const companyPhase = computed(() => s.value.phase === 'company')
const gameOver = computed(() => s.value.phase === 'over')
const dragging = computed(() => !!ui.drag && ui.drag.moved)
const freeSwaps = computed(() => (s.value.phase === 'company' ? s.value.company?.freeSwaps ?? 0 : 0))
// 牌庫也在這裡：抽到的牌從換牌區飛出來
function pileRef(el: unknown) {
  registerAnchor('pile', el as HTMLElement | null)
  registerAnchor('deck', el as HTMLElement | null)
}
</script>

<template>
  <div class="chud">
    <div class="turn">
      <div class="whose" :class="{ mine: companyPhase || gameOver }">
        <span class="seal"><Icon :name="gameOver ? 'flag' : companyPhase ? 'building-2' : 'skull'" :size="24" :stroke="2.3" /></span>
        <span class="wt">
          <b>{{ gameOver ? '這局結束' : companyPhase ? '公司回合' : '駭客行動中' }}</b>
          <small>第 {{ companyPhase ? s.company?.turn : s.turn }} 回合</small>
        </span>
      </div>
      <!-- 換牌區：拖手牌進來換一張新的；牌庫也在這裡 -->
      <div
        :ref="pileRef"
        class="pile"
        :class="{ ready: dragging, over: dragging && ui.drag?.overPile, off: !myTurn && !dragging, free: freeSwaps > 0 }"
      >
        <Icon name="recycle" :size="40" :stroke="2" />
        <span>
          <b>換牌</b>
          <small v-if="freeSwaps > 0">免費 ×{{ freeSwaps }}（手牌滿了）</small>
          <small v-else>拖手牌過來・−{{ COMPANY.recycleCost }}K</small>
        </span>
      </div>
      <button :ref="(el) => registerAnchor('end', el as HTMLElement | null)" class="end" :disabled="!myTurn" @click="companyEndTurn">
        結束回合
      </button>
    </div>
  </div>
</template>

<style scoped>
.chud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
}
.turn {
  position: absolute;
  right: 20px;
  bottom: 22px;
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  pointer-events: auto;
}
/* 輪到誰：公司是藍色、駭客是紅色 */
.whose {
  --wc: #c2412f;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 14px;
  background: linear-gradient(180deg, #f7f9fb, #eef2f6);
  border: 2px solid color-mix(in srgb, var(--wc) 35%, #c9d2de);
  box-shadow: 0 4px 12px rgba(20, 35, 60, 0.1);
  transition: border-color 0.3s;
}
.whose.mine {
  --wc: var(--o-blue);
}
.seal {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--wc) 70%, #fff), var(--wc));
  box-shadow: 0 3px 8px color-mix(in srgb, var(--wc) 40%, transparent);
}
.wt {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.wt b {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 2px;
  color: color-mix(in srgb, var(--wc) 80%, #0b1426);
}
.wt small {
  font-size: 16px;
  font-weight: 700;
  color: var(--text3);
}
.pile {
  position: relative;
  height: 100px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-radius: 14px;
  text-align: left;
  color: var(--o-blue);
  background: linear-gradient(180deg, #f7f9fb, #eef2f6);
  border: 3px dashed #b3c0d3;
  box-shadow: var(--o-shadow);
  transition:
    transform 0.2s,
    opacity 0.2s,
    background 0.2s,
    border-color 0.2s;
}
.pile span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pile b {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 6px;
  color: var(--o-navy);
}
.pile small {
  white-space: nowrap;
  font-size: 16px;
  font-weight: 700;
  color: var(--text2);
}
/* 拖著牌時，換牌區亮起來等著接牌；牌移到上面再放大一點 */
.pile.ready {
  border-style: solid;
  border-color: var(--o-blue2);
  background: #dde7f5;
  animation: pulse-soft 1.1s infinite;
}
.pile.over {
  color: #fff;
  transform: scale(1.05);
  border-color: var(--o-blue);
  background: linear-gradient(160deg, #3d70bf, #2a5fb0);
}
.pile.over b,
.pile.over small {
  color: #fff;
}
.pile.off {
  opacity: 0.5;
}
/* 有免費換牌：綠色提醒（拖曳中的藍色優先） */
.pile.free:not(.ready) {
  color: #1d6e47;
  border-style: solid;
  border-color: #46b97e;
  background: linear-gradient(180deg, #effaf3, #dcf2e6);
}
.pile.free:not(.ready) small {
  color: #1d6e47;
}
.end {
  height: 78px;
  border-radius: 14px;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 6px;
  text-indent: 6px;
  color: #fff;
  background: linear-gradient(180deg, #3d70bf, var(--o-blue));
  border: 2px solid #1b4ea3;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 6px 0 #173f85,
    0 10px 16px rgba(30, 60, 120, 0.3);
}
.end:not(:disabled):hover {
  filter: brightness(1.07);
}
.end:not(:disabled):active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #173f85;
}
.end:disabled {
  color: #eef1f5;
  background: #a9b6c9;
  border-color: #93a2b8;
  box-shadow: 0 6px 0 #8392a8;
  cursor: default;
}
@media (prefers-reduced-motion: reduce) {
  .pile.ready {
    animation: none;
  }
}
</style>
