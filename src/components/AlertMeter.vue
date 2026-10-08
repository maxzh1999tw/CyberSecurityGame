<script setup lang="ts">
// 警戒值：10 格，越高公司反應越強
import { computed, nextTick, ref, watch } from 'vue'
import { alertZone } from '../game/engine'
import { game, registerAnchor, ui } from '../game/store'
import Icon from './Icon.vue'

const s = computed(() => game.s!)
const alert = computed(() => s.value.alert)
const zone = computed(() => alertZone(alert.value))
const ZONE = [
  { name: '平靜', icon: 'shield-check' },
  { name: '起疑', icon: 'eye' },
  { name: '全面調查', icon: 'siren' },
] as const
const willCool = computed(() => s.value.noiseThisTurn <= 2 && alert.value > 0)

const shaking = ref(false)
watch(
  () => ui.alertShake,
  async () => {
    shaking.value = false
    await nextTick()
    shaking.value = true
    setTimeout(() => (shaking.value = false), 600)
  },
)
const zcls = (i: number) => (i >= 10 ? 'z3' : i >= 7 ? 'z2' : i >= 4 ? 'z1' : 'z0')
</script>

<template>
  <div
    :ref="(el) => registerAnchor('alert', el as HTMLElement | null)"
    class="alert"
    :class="['zone' + zone, { shaking }]"
    @pointerenter="ui.hoverAlert = true"
    @pointerleave="ui.hoverAlert = false"
  >
    <div class="zname">
      <Icon :name="ZONE[zone].icon" :size="26" :stroke="2.4" />
      <span>{{ ZONE[zone].name }}</span>
    </div>
    <div class="mid">
      <div class="segs">
        <div v-for="i in 10" :key="i" class="seg" :class="[zcls(i), { on: i <= alert }]">
          <Icon v-if="i === 10" name="skull" :size="20" :stroke="2.4" />
          <span v-else>{{ i }}</span>
        </div>
      </div>
      <div class="marks">
        <span class="m4"><Icon name="fast-forward" :size="15" :stroke="2.6" />公司反應 ×1.5</span>
        <span class="m7"><Icon name="fast-forward" :size="15" :stroke="2.6" />公司反應 ×2</span>
      </div>
    </div>
    <div class="num">{{ alert }}</div>
    <div class="cool" :class="{ lit: willCool }" title="本回合噪音 ≤ 2，回合結束時警戒值 -1">
      <Icon name="snowflake" :size="20" :stroke="2.4" /><b>-1</b>
    </div>
  </div>
</template>

<style scoped>
.alert {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 80px;
  padding: 0 18px;
  border-radius: 14px;
  background: var(--slate);
  border: 3px solid var(--edge2);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
  transition: border-color 0.4s;
}
.zone1 {
  border-color: #c98a22;
}
.zone2 {
  border-color: var(--bad);
  animation: alarm-throb 1.4s ease-in-out infinite;
}
@keyframes alarm-throb {
  50% {
    box-shadow:
      0 0 0 4px rgba(212, 80, 63, 0.4),
      0 6px 14px rgba(0, 0, 0, 0.45);
  }
}
.shaking {
  animation: shake 0.5s;
}
.zname {
  width: 112px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 21px;
  font-weight: 900;
  color: var(--good2);
}
.zone1 .zname {
  color: #f2c25e;
}
.zone2 .zname {
  color: var(--bad2);
}
.mid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.segs {
  display: flex;
  gap: 5px;
}
.seg {
  width: 46px;
  height: 34px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-family: var(--font-num);
  font-weight: 700;
  font-size: 20px;
  color: #5b6a88;
  background: #161d2a;
  border: 2px solid #36445c;
  transition:
    background 0.3s,
    color 0.3s;
}
.seg.on {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.35);
}
.seg.on.z0 {
  background: #2d9a7c;
}
.seg.on.z1 {
  background: #cf8a1e;
}
.seg.on.z2 {
  background: #cc4332;
}
.seg.z3 {
  color: #c97c72;
}
.seg.on.z3 {
  background: #8e1c28;
  color: #fff;
}
.marks {
  position: relative;
  height: 20px;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text2);
}
.marks span {
  position: absolute;
  top: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}
.m4 {
  left: calc(3 * 51px);
}
.m7 {
  left: calc(6 * 51px);
}
.num {
  min-width: 52px;
  font-family: var(--font-num);
  font-weight: 700;
  font-size: 58px;
  line-height: 1;
  text-align: center;
  color: #fff;
}
.zone1 .num {
  color: #f2c25e;
}
.zone2 .num {
  color: var(--bad2);
}
.cool {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 38px;
  padding: 0 11px 0 9px;
  border-radius: 19px;
  font-family: var(--font-num);
  font-weight: 700;
  font-size: 22px;
  color: #6b7a98;
  background: #161d2a;
  border: 2px dashed #46587a;
}
.cool.lit {
  color: #fff;
  background: #3a8fc4;
  border: 2px solid #b8e0f5;
}
</style>
