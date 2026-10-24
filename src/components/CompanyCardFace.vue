<script setup lang="ts">
// 公司的牌（240 x 340）：和駭客的牌同一套紙卡材質，費用是金幣（直接扣資產）
import { computed } from 'vue'
import { COMPANY_CARDS, COMPANY_CAT_NAME } from '../game/companyData'
import type { CompanyCardId } from '../game/types'
import Icon from './Icon.vue'
import RichText from './RichText.vue'

const props = defineProps<{
  id: CompanyCardId
  cost?: number
  dead?: boolean
  /** 教育訓練生效中：這張修補牌會對整層員工生效 */
  boosted?: boolean
}>()

const def = computed(() => COMPANY_CARDS[props.id])
const costShown = computed(() => props.cost ?? def.value.cost)
const discounted = computed(() => costShown.value < def.value.cost)
</script>

<template>
  <div class="card" :class="['cat-' + def.cat, { dead, boosted }]">
    <i class="frame"></i>
    <div class="art">
      <div class="pat"></div>
      <Icon :name="def.icon" :size="78" :stroke="1.6" class="art-icon" />
      <div class="gloss"></div>
      <div class="stage">{{ COMPANY_CAT_NAME[def.cat] }}</div>
      <div v-if="boosted" class="boost" title="教育訓練生效中：這張牌會對整層員工生效"><Icon name="graduation-cap" :size="16" :stroke="2.6" />整層生效</div>
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
    <div class="cost" :class="{ disc: discounted, zero: costShown === 0 }" :title="`成本 ${costShown}K（直接扣資產）`">
      <span>{{ costShown }}<small v-if="costShown">K</small></span>
    </div>
    <div v-if="dead" class="dead-veil"></div>
  </div>
</template>

<style scoped>
.card {
  --cc: #2b7ea6;
  --cd: color-mix(in srgb, var(--cc) 62%, #0a0e14);
  position: relative;
  width: 240px;
  height: 340px;
  border-radius: 16px;
  border: 6px solid var(--cc);
  background:
    radial-gradient(ellipse 120% 70% at 50% 100%, rgba(150, 110, 50, 0.16), transparent 70%),
    linear-gradient(180deg, #fbf5e6, #efe4c8 60%, var(--paper2));
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.35),
    0 12px 24px rgba(0, 0, 0, 0.5),
    inset 0 0 0 2px rgba(255, 255, 255, 0.6),
    0 0 0 2px var(--gold3);
  color: var(--ink);
}
.cat-audit {
  --cc: #2b7ea6;
}
.cat-harden {
  --cc: #3b8a52;
}
.cat-respond {
  --cc: #b8432f;
}
.cat-business {
  --cc: #b98a2a;
}
.frame {
  position: absolute;
  inset: -6px;
  z-index: 2;
  border-radius: 16px;
  padding: 6px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.08) 30%, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.38));
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box exclude,
    linear-gradient(#000 0 0);
  pointer-events: none;
}
.art {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 128px;
  border-radius: 9px 9px 0 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, color-mix(in srgb, var(--cc) 70%, #1a2030), var(--cd));
  box-shadow:
    inset 0 8px 14px rgba(0, 0, 0, 0.32),
    inset 0 0 26px rgba(0, 0, 0, 0.28);
}
.pat {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 55%, rgba(255, 255, 255, 0.2), transparent 58%),
    radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1.6px) 0 0 / 12px 12px;
}
.art-icon {
  position: relative;
  color: #fbf3dc;
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.3)) drop-shadow(0 0 10px rgba(255, 244, 210, 0.22));
}
.gloss {
  position: absolute;
  inset: 0 0 45% 0;
  background: linear-gradient(172deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.04) 55%, transparent);
  pointer-events: none;
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
/* 教育訓練生效中：會被放大的修補牌 */
.card.boosted {
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.35),
    0 12px 24px rgba(0, 0, 0, 0.5),
    inset 0 0 0 2px rgba(255, 255, 255, 0.6),
    0 0 0 2px var(--gold3),
    0 0 0 6px var(--gold);
}
.boost {
  position: absolute;
  right: 0;
  top: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px 4px 9px;
  border-radius: 0 0 0 10px;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
}
.name {
  position: absolute;
  left: 0;
  right: 0;
  top: 128px;
  height: 40px;
  display: grid;
  place-items: center;
  font-size: 23px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #fff;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 45%, rgba(0, 0, 0, 0.22)),
    var(--cd);
  border-top: 3px solid var(--gold);
  border-bottom: 3px solid var(--gold3);
}
.body {
  position: absolute;
  left: 0;
  right: 0;
  top: 174px;
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
  font-size: 17px;
  line-height: 1.4;
  font-weight: 700;
}
.lab {
  flex: none;
  margin-top: 2px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 14px;
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
/* 費用：金幣（K），和駭客的藍色行動點寶石區分 */
.cost {
  position: absolute;
  z-index: 3;
  left: -16px;
  top: -16px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0) 38%),
    radial-gradient(circle, #f6d873 0 52%, #c9952a 53% 100%);
  border: 3px solid #8a6417;
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.55),
    inset 0 -3px 0 rgba(110, 70, 10, 0.4);
}
.cost small {
  font-size: 15px;
}
.cost span {
  font-family: var(--font-num);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: #5a3a06;
  text-shadow: 0 1px 0 rgba(255, 240, 200, 0.7);
}
.cost.disc span {
  color: #1d6a43;
}
.cost.zero span {
  color: #1d6a43;
}
.dead-veil {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: rgba(20, 24, 34, 0.45);
  pointer-events: none;
}
</style>
