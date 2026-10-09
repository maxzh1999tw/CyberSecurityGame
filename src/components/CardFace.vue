<script setup lang="ts">
// 一張手牌的外觀（240 x 340，大小由外層縮放）：米白紙卡 + 種類色邊框
import { computed } from 'vue'
import { CARDS } from '../game/data'
import type { CardId } from '../game/types'
import Icon from './Icon.vue'
import RichText from './RichText.vue'

const props = defineProps<{
  id: CardId
  cost?: number
  noise?: number
  free?: boolean
  unaffordable?: boolean
  dead?: boolean
  noiseHalved?: boolean
}>()

const def = computed(() => CARDS[props.id])
const costShown = computed(() => props.cost ?? def.value.cost)
const noiseShown = computed(() => props.noise ?? def.value.noise)
</script>

<template>
  <div class="card" :class="['cat-' + def.cat, { dead }]">
    <div class="art">
      <div class="pat"></div>
      <Icon :name="def.icon" :size="82" :stroke="1.6" class="art-icon" />
      <div class="stage">{{ def.stage }}</div>
    </div>

    <div class="name">{{ def.name }}</div>

    <div class="body">
      <div v-if="def.cond" class="row">
        <span class="lab cond">條件</span>
        <span class="txt"><RichText :text="def.cond" :size="14" /></span>
      </div>
      <div class="row">
        <span class="lab eff">效果</span>
        <span class="txt"><RichText :text="def.effect" :size="14" /></span>
      </div>
    </div>

    <div class="cost" :class="{ free, bad: unaffordable }">
      <span>{{ costShown }}</span>
    </div>
    <div class="noise" :class="{ quiet: noiseShown === 0, halved: noiseHalved }">
      <Icon name="volume-2" :size="17" :stroke="2.6" />
      <span>{{ noiseShown }}</span>
    </div>
    <div v-if="dead" class="dead-veil"></div>
  </div>
</template>

<style scoped>
.card {
  --cc: var(--c-recon);
  --cd: color-mix(in srgb, var(--cc) 62%, #0a0e14);
  position: relative;
  width: 240px;
  height: 340px;
  border-radius: 16px;
  border: 6px solid var(--cc);
  background: linear-gradient(180deg, #f8f1df, var(--paper2));
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.55),
    inset 0 0 0 2px rgba(255, 255, 255, 0.6),
    0 0 0 2px var(--gold3);
  color: var(--ink);
}
.cat-recon {
  --cc: var(--c-recon);
}
.cat-action {
  --cc: var(--c-action);
}
.cat-paralyze {
  --cc: var(--c-paralyze);
}
.cat-finish {
  --cc: var(--c-finish);
}
.cat-support {
  --cc: var(--c-support);
}

.art {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 132px;
  border-radius: 9px 9px 0 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, color-mix(in srgb, var(--cc) 70%, #1a2030), var(--cd));
}
.pat {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 55%, rgba(255, 255, 255, 0.16), transparent 62%);
}
.art-icon {
  position: relative;
  color: #fbf3dc;
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.3));
}
.stage {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 3px 14px 3px 12px;
  border-radius: 0 10px 0 0;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--gold2);
  background: rgba(8, 12, 20, 0.62);
}
.name {
  position: absolute;
  left: 0;
  right: 0;
  top: 132px;
  height: 40px;
  display: grid;
  place-items: center;
  font-size: 23px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #fff;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
  background: var(--cd);
  border-top: 3px solid var(--gold);
  border-bottom: 3px solid var(--gold);
}

.body {
  position: absolute;
  left: 0;
  right: 0;
  top: 178px;
  bottom: 0;
  padding: 6px 12px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.row {
  display: flex;
  gap: 7px;
  align-items: flex-start;
  font-size: 16px;
  line-height: 1.42;
  font-weight: 700;
}
.lab {
  flex: none;
  margin-top: 2px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1px;
  line-height: 1.55;
  color: #fff;
}
.lab.cond {
  background: #8a5a1c;
}
.lab.eff {
  background: var(--cd);
}
.txt {
  flex: 1;
  color: var(--ink);
}

.cost,
.noise {
  position: absolute;
  z-index: 3;
}
.cost {
  left: -17px;
  top: -17px;
  width: 58px;
  height: 64px;
  display: grid;
  place-items: center;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: linear-gradient(160deg, var(--gold2), var(--gold3));
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.6));
}
.cost::before {
  content: '';
  position: absolute;
  inset: 4px;
  clip-path: inherit;
  background: linear-gradient(160deg, #5aa2f0, #1c4fb0 70%);
}
.cost span {
  position: relative;
  font-family: var(--font-num);
  font-weight: 700;
  font-size: 38px;
  line-height: 1;
  color: #fff;
  text-shadow:
    0 2px 0 #0a2a6a,
    0 0 3px #0a2a6a;
}
.cost.free::before {
  background: linear-gradient(160deg, #4fce94, #14764a 70%);
}
.cost.bad span {
  color: #ffb4a8;
}
.noise {
  left: 36px;
  top: -14px;
  height: 38px;
  padding: 0 11px 0 9px;
  border-radius: 19px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fff;
  background: #b23a2c;
  border: 3px solid var(--gold2);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.55);
}
.noise span {
  font-family: var(--font-num);
  font-weight: 700;
  font-size: 26px;
  line-height: 1;
}
.noise.quiet {
  background: #2c8f66;
}
.noise.halved {
  outline: 3px solid #86e2b6;
}
.dead-veil {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: rgba(20, 24, 34, 0.45);
  pointer-events: none;
}
</style>
