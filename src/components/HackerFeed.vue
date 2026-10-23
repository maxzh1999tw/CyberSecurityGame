<script setup lang="ts">
// 公司模式右欄：駭客的動態（他這局出過的牌、成功或失敗）；滑過一筆會在左邊浮現那張牌
import { computed, ref } from 'vue'
import { CARDS } from '../game/data'
import { game, registerAnchor, ui } from '../game/store'
import type { CardId } from '../game/types'
import CardFace from './CardFace.vue'
import Icon from './Icon.vue'

const s = computed(() => game.s!)
const co = computed(() => s.value.company!)
const nameOf = (id: string | null) => (id ? s.value.nodes.find((n) => n.id === id)?.name ?? '' : '')
const log = computed(() => ui.hackerLog.slice(0, 9))

const root = ref<HTMLElement | null>(null)
const peek = ref<{ card: CardId; top: number } | null>(null)
const CARD_H = 340
function show(card: CardId, ev: PointerEvent) {
  const box = root.value
  if (!box) return
  // 畫面有縮放：用實際寬度換算回元件座標
  const r = box.getBoundingClientRect()
  const scale = r.width / box.offsetWidth || 1
  const li = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const mid = (li.top + li.height / 2 - r.top) / scale
  const top = Math.max(0, Math.min(mid - CARD_H / 2, box.offsetHeight - CARD_H))
  peek.value = { card, top }
}
</script>

<template>
  <div ref="root" class="hf">
    <section class="opanel who">
      <div class="ohead"><span class="oic"><Icon name="skull" :size="17" :stroke="2.4" /></span>駭客</div>
      <div :ref="(el) => registerAnchor('hackerDeck', el as HTMLElement | null)" class="row"><Icon name="layers" :size="18" :stroke="2.4" />手牌<b>{{ s.hand.length }}</b></div>
      <div :ref="(el) => registerAnchor('hackerAp', el as HTMLElement | null)" class="row"><Icon name="zap" :size="18" :stroke="2.4" />每回合行動點<b>{{ s.apBase + s.apBonus }}</b></div>
      <div v-if="co.monitor" class="row on"><Icon name="cctv" :size="18" :stroke="2.4" />監控中：噪音 +{{ co.monitor }}</div>
      <div v-if="co.insurance" class="row on"><Icon name="umbrella" :size="18" :stroke="2.4" />資安保險生效中</div>
    </section>
    <section :ref="(el) => registerAnchor('hackerFeed', el as HTMLElement | null)" class="opanel log">
      <div class="ohead"><span class="oic"><Icon name="activity" :size="17" :stroke="2.4" /></span>駭客動態</div>
      <p v-if="!log.length" class="empty">還沒有動靜</p>
      <ul :class="{ many: log.length > 5 }">
        <li v-for="e in log" :key="e.id" :class="{ ok: e.ok }" @pointerenter="show(e.card, $event)" @pointerleave="peek = null">
          <Icon :name="CARDS[e.card].icon" :size="18" :stroke="2.3" />
          <span class="t">
            <b>{{ CARDS[e.card].name }}</b>
            <small v-if="e.target">→ {{ nameOf(e.target) }}</small>
          </span>
          <em v-if="e.ok !== null">{{ e.ok ? '成功' : '失敗' }}</em>
        </li>
      </ul>
    </section>
    <div v-if="peek" class="peek" :style="{ top: peek.top + 'px' }"><CardFace :id="peek.card" /></div>
  </div>
</template>

<style scoped>
.hf {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}
/* 動態只用右欄剩下的高度：最新的在上面，放不下的舊紀錄往下淡出 */
.log {
  flex: 0 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.log ul {
  min-height: 0;
  overflow: hidden;
}
.log ul.many {
  -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 40px), transparent);
  mask-image: linear-gradient(180deg, #000 calc(100% - 40px), transparent);
}
section {
  --ac: #c2412f;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 19px;
  font-weight: 700;
  color: var(--text2);
}
.row b {
  margin-left: auto;
  font-family: var(--font-num);
  font-size: 22px;
  color: var(--text);
}
.row.on {
  margin-top: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  color: #1d6e47;
  background: #e3f6ec;
}
.empty {
  margin: 0;
  font-size: 17px;
  color: var(--text3);
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 9px;
  color: var(--text3);
  background: #e9edf2;
  border-left: 4px solid #b3bfcf;
}
li {
  cursor: default;
}
li:hover {
  filter: brightness(0.96);
}
/* 滑過的那張牌：浮在右欄左邊、牌桌上 */
.peek {
  position: absolute;
  right: calc(100% + 34px);
  z-index: 30;
  pointer-events: none;
  filter: drop-shadow(0 14px 26px rgba(0, 0, 0, 0.45));
}
li.ok {
  color: #b42318;
  background: #fdecea;
  border-left-color: #d4503f;
}
/* 最新的一筆從上面滑進來 */
li:first-child {
  animation: feed-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.1);
}
@keyframes feed-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
}
@media (prefers-reduced-motion: reduce) {
  li:first-child {
    animation: none;
  }
}
.t {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.t b {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
}
li.ok .t b {
  color: #8f2f24;
}
.t small {
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
em {
  font-size: 15px;
  font-style: normal;
  font-weight: 900;
}
</style>
