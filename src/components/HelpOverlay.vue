<script setup lang="ts">
// 玩法：用圖示快速說明
import { ref } from 'vue'
import { ui } from '../game/store'
import Icon from './Icon.vue'

const page = ref(0)
const pages = [
  {
    icon: 'trophy',
    title: '完成任務',
    lines: ['每局抽一張任務，完成就贏。', '警戒值到 10，就被公司抓到。'],
  },
  {
    icon: 'eye',
    title: '找出弱點',
    lines: ['節點底下蓋著牌，其中有些是弱點。', '用偵查牌把弱點翻開。'],
  },
  {
    icon: 'crosshair',
    title: '拖曳出牌',
    lines: ['拖到場上，或拖到目標身上。', '綠色一定成功，黃色要賭。'],
  },
  {
    icon: 'volume-2',
    title: '噪音',
    lines: ['每張牌都會讓警戒值上升。', '安靜的回合，警戒值會降 1。'],
  },
  {
    icon: 'building-2',
    title: '公司的倒數',
    lines: ['公開的弱點、被控制的節點都會倒數，', '歸零就被修復、奪回。癱瘓 IT 可以暫停。'],
  },
  {
    icon: 'layers',
    title: '抽牌與行動點',
    lines: ['每回合抽 2 張牌，手牌最多 8 張。', '沒用完的行動點，最多保留 2 點到下一回合。'],
  },
  {
    icon: 'recycle',
    title: '換牌',
    lines: ['手上用不到的牌，拖到棄牌堆。', '花 1 點行動點，換一張新的。'],
  },
]
function close() {
  ui.help = false
  page.value = 0
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.help" class="help" @pointerdown.self="close">
      <div class="panel">
        <button class="x" @click="close"><Icon name="x" :size="30" :stroke="2.4" /></button>
        <div class="ico"><Icon :name="pages[page].icon" :size="84" :stroke="1.5" /></div>
        <h2>{{ pages[page].title }}</h2>
        <p v-for="(l, i) in pages[page].lines" :key="i">{{ l }}</p>

        <div class="demo">
          <template v-if="page === 1">
            <div class="slot hid"><span>?</span></div>
            <div class="slot vul"><Icon name="mouse-pointer-click" :size="22" :stroke="2.3" />好奇寶寶<b class="mk priv"><Icon name="ghost" :size="16" :stroke="2.6" /></b></div>
            <div class="slot none"><span>—</span>沒有更多弱點</div>
          </template>
          <template v-else-if="page === 2">
            <div class="ar sure"><i></i>一定成功</div>
            <div class="ar maybe"><i></i>要賭一把</div>
          </template>
          <template v-else-if="page === 4">
            <div class="vis pub"><b class="mk"><Icon name="eye" :size="18" :stroke="2.6" /></b>公開：公司看得到，開始倒數修復</div>
            <div class="vis priv"><b class="mk"><Icon name="ghost" :size="18" :stroke="2.6" /></b>隱密：只有你知道</div>
          </template>
        </div>

        <div class="nav">
          <button :disabled="page === 0" @click="page--"><Icon name="chevron-right" class="flip" :size="32" :stroke="2.8" /></button>
          <span class="dots"><i v-for="(_, i) in pages" :key="i" :class="{ on: i === page }"></i></span>
          <button v-if="page < pages.length - 1" @click="page++"><Icon name="chevron-right" :size="32" :stroke="2.8" /></button>
          <button v-else class="go" @click="close"><Icon name="check" :size="32" :stroke="3" /></button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.help {
  position: absolute;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  background: rgba(6, 9, 14, 0.85);
}
.panel {
  position: relative;
  width: 780px;
  min-height: 620px;
  padding: 46px 50px 38px;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  background: var(--slate);
  border: 6px solid var(--gold3);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
}
.x {
  position: absolute;
  right: 18px;
  top: 18px;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--text2);
}
.x:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}
.ico {
  width: 130px;
  height: 130px;
  display: grid;
  place-items: center;
  color: #2a1e08;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, var(--gold2), var(--gold) 60%, var(--gold3));
  box-shadow: 0 0 0 5px #3a2c10;
}
h2 {
  margin: 8px 0 0;
  font-size: 52px;
  font-weight: 900;
  letter-spacing: 8px;
  text-indent: 8px;
  color: var(--gold2);
}
p {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.6;
  color: #eaf0fa;
}
.demo {
  min-height: 140px;
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 440px;
}
.slot {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px 0 16px;
  border-radius: 8px;
  font-size: 22px;
  font-weight: 900;
}
.slot.hid {
  justify-content: center;
  color: #6b7b9b;
  background: #18202d;
  box-shadow: inset 0 0 0 1.5px #36445c;
}
.slot.vul {
  color: var(--ink);
  background: var(--paper);
  box-shadow: inset 6px 0 0 var(--k-employee);
}
.slot.vul :deep(svg:first-child) {
  color: var(--k-employee);
}
.slot.none {
  color: #8a97b0;
  background: #18202d;
  box-shadow: inset 0 0 0 1.5px #2f3b52;
  font-weight: 700;
}
.slot.none span {
  font-size: 26px;
  font-weight: 900;
  margin-right: 6px;
}
.mk {
  margin-left: auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: #c8402f;
}
.mk.priv {
  background: #2f9a6c;
}
.ar {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 28px;
  font-weight: 900;
}
.ar i {
  width: 160px;
  height: 12px;
  border-radius: 6px;
  background: repeating-linear-gradient(90deg, currentColor 0 12px, transparent 12px 22px);
}
.ar.sure {
  color: #5fd99a;
}
.ar.maybe {
  color: #f0b440;
}
.vis {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 24px;
  font-weight: 700;
  color: #eaf0fa;
}
.vis .mk {
  margin: 0;
}
.vis.priv .mk {
  background: #2f9a6c;
}
.nav {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 24px;
}
.nav button {
  width: 68px;
  height: 68px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #2c3d5c;
  border: 3px solid var(--edge2);
  box-shadow: 0 4px 0 #151b27;
}
.nav button:disabled {
  opacity: 0.25;
  cursor: default;
}
.nav button:not(:disabled):hover {
  filter: brightness(1.2);
}
.nav .go {
  background: var(--good);
  border-color: var(--good2);
}
.flip {
  transform: scaleX(-1);
}
.dots {
  display: flex;
  gap: 10px;
}
.dots i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3a4862;
}
.dots i.on {
  background: var(--gold);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
