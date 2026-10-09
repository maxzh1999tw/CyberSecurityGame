<script setup lang="ts">
// 左欄：本局任務與進度
import { computed } from 'vue'
import { MISSIONS } from '../game/data'
import { missionGoals } from '../game/progress'
import { game, registerAnchor } from '../game/store'
import Icon from './Icon.vue'

const props = defineProps<{ detail?: boolean }>()
const m = computed(() => (game.s ? MISSIONS[game.s.mission] : null))
const goals = computed(() => (game.s ? missionGoals(game.s) : []))
</script>

<template>
  <div v-if="m" :ref="(el) => !props.detail && registerAnchor('mission', el as HTMLElement | null)" class="mission">
    <div class="tag">本局任務</div>
    <div class="head">
      <div class="badge"><Icon :name="m.icon" :size="36" :stroke="1.8" /></div>
      <div class="title">{{ m.name }}</div>
    </div>
    <ul class="goals">
      <li v-for="(g, i) in goals" :key="i" :class="{ done: g.done, unk: g.unknown }">
        <span class="chk"><Icon :name="g.done ? 'check' : g.icon" :size="g.done ? 20 : 18" :stroke="2.6" /></span>
        <span class="lbl">{{ g.label }}</span>
      </li>
    </ul>
    <div class="pop">
      <b>{{ m.name }}</b>
      <p>{{ m.goal }}</p>
    </div>
  </div>
</template>

<style scoped>
.mission {
  position: relative;
  padding: 0 0 18px;
  border-radius: 14px;
  background: var(--slate);
  border: 3px solid var(--gold3);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
}
.tag {
  padding: 5px 0;
  text-align: center;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 6px;
  text-indent: 6px;
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border-radius: 10px 10px 0 0;
}
.head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px 14px;
}
.badge {
  flex: none;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #2a1e08;
  background: radial-gradient(circle at 40% 30%, var(--gold2), var(--gold) 60%, var(--gold3));
  box-shadow:
    0 0 0 3px #3a2c10,
    0 3px 6px rgba(0, 0, 0, 0.5);
}
.title {
  font-size: 27px;
  font-weight: 900;
  line-height: 1.15;
  color: var(--gold2);
}
.goals {
  margin: 0;
  padding: 0 14px;
  list-style: none;
  display: grid;
  gap: 10px;
}
.goals li {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 12px 0 8px;
  border-radius: 9px;
  font-size: 19px;
  font-weight: 700;
  color: var(--text2);
  background: rgba(10, 14, 22, 0.5);
  border: 2px solid #3a4862;
}
.chk {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text2);
  background: #2c374c;
}
.goals li.done {
  color: #fff;
  background: #25704f;
  border-color: var(--good);
}
.goals li.done .chk {
  color: #fff;
  background: var(--good);
}
.goals li.unk {
  border-style: dashed;
}
.pop {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 14px;
  width: 380px;
  padding: 14px 18px;
  border-radius: 12px;
  background: #151b27;
  border: 2px solid var(--edge2);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.6);
  font-size: 19px;
  line-height: 1.55;
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
  transition: 0.18s;
  z-index: 50;
}
.pop b {
  color: var(--gold2);
  font-size: 21px;
}
.pop p {
  margin: 4px 0 0;
  color: #dbe5f5;
}
.mission:hover .pop {
  opacity: 1;
  transform: none;
}
</style>
