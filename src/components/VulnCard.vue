<script setup lang="ts">
// 弱點牌：正面是弱點，翻面是「怎麼修」「明天就能做的一件事」「真實案例」
import { ref } from 'vue'
import { VULNS } from '../game/data'
import type { VulnId } from '../game/types'
import Icon from './Icon.vue'

// flipped 沒傳時由牌自己記住翻面狀態（布林屬性沒傳會被當成 false，所以要明確給 undefined）
const props = withDefaults(
  defineProps<{
    vuln: VulnId
    /** 發生在哪個節點 */
    where?: string
    tags?: Array<{ text: string; tone: 'used' | 'key' | 'seen' }>
    flipped?: boolean
  }>(),
  { flipped: undefined },
)
defineEmits<{ flip: [] }>()

const d = VULNS[props.vuln]
const local = ref(false)
</script>

<template>
  <div class="vc" :class="['k-' + d.kind, { flipped: flipped ?? local }]" @click="local = !local; $emit('flip')">
    <div class="inner">
      <div class="face front">
        <div class="band">{{ where ?? '弱點' }}</div>
        <div class="medal"><Icon :name="d.icon" :size="64" :stroke="1.6" /></div>
        <div class="name">{{ d.name }}</div>
        <div class="desc">{{ d.desc }}</div>
        <div v-if="d.rule" class="rule">規則：{{ d.rule }}</div>
        <div class="tags">
          <span v-for="t in tags" :key="t.text" :class="t.tone">{{ t.text }}</span>
        </div>
        <div class="hint"><Icon name="rotate-ccw" :size="16" :stroke="2.4" />翻面看怎麼防</div>
      </div>
      <div class="face back">
        <div class="band"><Icon name="shield-check" :size="20" :stroke="2.6" />{{ d.shield }}</div>
        <div class="sec">
          <b>怎麼修</b>
          <p>{{ d.fix }}</p>
        </div>
        <div class="sec tomorrow">
          <b>明天就能做的一件事</b>
          <p>{{ d.tomorrow }}</p>
        </div>
        <div v-if="d.case" class="case">
          <Icon name="scroll-text" :size="20" :stroke="2.2" />
          <div>
            <b>{{ d.case.title }}</b>
            <p>{{ d.case.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vc {
  --kc: var(--k-employee);
  width: 280px;
  height: 430px;
  cursor: pointer;
}
.k-employee {
  --kc: var(--k-employee);
}
.k-infra {
  --kc: var(--k-infra);
}
.k-ai {
  --kc: var(--k-ai);
}
.k-data {
  --kc: var(--k-data);
}
.inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.2s ease;
}
.vc:hover .inner {
  transform: translateY(-6px);
}
.face {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  border: 7px solid var(--kc);
  background: linear-gradient(180deg, #f8f1df, var(--paper2));
  box-shadow:
    0 0 0 3px var(--gold3),
    0 10px 22px rgba(0, 0, 0, 0.5);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
/* 翻面：用橫向縮放做出翻牌的感覺（不用 3D，字才不會糊） */
.front,
.back {
  transition: transform 0.22s ease-in;
}
.front {
  transform: scaleX(1);
}
.back {
  align-items: stretch;
  transform: scaleX(0);
}
.flipped .front {
  transform: scaleX(0);
}
.flipped .back {
  transform: scaleX(1);
  transition: transform 0.22s ease-out 0.22s;
}
.band {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 8px;
  font-size: 19px;
  font-weight: 900;
  color: #fff;
  background: color-mix(in srgb, var(--kc) 85%, #0a0e14);
  border-bottom: 3px solid var(--gold);
}
.medal {
  margin-top: 16px;
  width: 104px;
  height: 104px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fbf3dc;
  background: color-mix(in srgb, var(--kc) 75%, #1a2030);
  box-shadow:
    0 0 0 5px var(--gold),
    0 5px 10px rgba(0, 0, 0, 0.35);
}
.name {
  margin-top: 14px;
  font-size: 30px;
  font-weight: 900;
}
.desc {
  margin-top: 6px;
  padding: 0 16px;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
  color: var(--ink2);
}
.rule {
  margin: 8px 14px 0;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  background: #efd9a0;
}
.tags {
  margin-top: auto;
  display: flex;
  gap: 6px;
  padding-bottom: 6px;
}
.tags span {
  padding: 1px 10px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 900;
  color: #fff;
}
.tags .used {
  background: #b8432f;
}
.tags .key {
  background: #6b4c9a;
}
.tags .seen {
  background: #3d6fa8;
}
.hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink2);
}
.back .band {
  background: #1f7a62;
  font-size: 18px;
}
.sec {
  padding: 10px 14px 0;
}
.sec b {
  font-size: 15px;
  letter-spacing: 3px;
  color: #1f7a62;
}
.sec p {
  margin: 3px 0 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
}
.sec.tomorrow {
  margin: 10px 12px 0;
  padding: 8px 12px 10px;
  border-radius: 10px;
  background: #fff3cf;
  border: 2.5px solid var(--gold);
}
.sec.tomorrow b {
  color: #8a5a1c;
}
.case {
  margin: auto 12px 10px;
  display: flex;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 14.5px;
  line-height: 1.4;
  color: #fff;
  background: #3a4862;
}
.case b {
  font-size: 15px;
  color: var(--gold2);
}
.case p {
  margin: 1px 0 0;
  font-weight: 500;
}
</style>
