<script setup lang="ts">
// 前後測：5 題小測驗（前測不給答案，後測會說明）
import { computed, ref } from 'vue'
import { QUESTIONS, loadResult, saveResult } from '../game/quiz'
import { backToMenu, game, openReview, startGame } from '../game/store'
import Icon from './Icon.vue'

const kind = computed(() => game.quizKind)
const idx = ref(0)
const picked = ref<number | null>(null)
const score = ref(0)
const done = ref(false)

// 每題的選項順序隨機
const orders = QUESTIONS.map((q) => {
  const o = q.options.map((_, i) => i)
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[o[i], o[j]] = [o[j], o[i]]
  }
  return o
})

const q = computed(() => QUESTIONS[idx.value])
const opts = computed(() => orders[idx.value].map((i) => ({ i, text: q.value.options[i] })))
const feedback = computed(() => kind.value === 'post' && picked.value !== null)
const hadGame = computed(() => !!game.s && game.s.result !== null)

function pick(i: number) {
  if (picked.value !== null) return
  picked.value = i
  if (i === q.value.answer) score.value++
  if (kind.value === 'pre') setTimeout(next, 450)
}
function next() {
  if (idx.value < QUESTIONS.length - 1) {
    idx.value++
    picked.value = null
  } else {
    saveResult(kind.value, { score: score.value, total: QUESTIONS.length, at: Date.now() })
    done.value = true
  }
}
const pre = computed(() => loadResult('pre'))
</script>

<template>
  <div class="qz felt">
    <div class="card">
      <template v-if="!done">
        <div class="top">
          <b>{{ kind === 'pre' ? '前測' : '後測' }}</b>
          <span class="dots"><i v-for="(_, i) in QUESTIONS" :key="i" :class="{ on: i < idx, cur: i === idx }"></i></span>
          <span class="no">{{ idx + 1 }} / {{ QUESTIONS.length }}</span>
        </div>
        <h2>{{ q.q }}</h2>
        <div class="opts">
          <button
            v-for="o in opts"
            :key="o.i"
            :class="{
              sel: picked === o.i && !feedback,
              right: feedback && o.i === q.answer,
              wrong: feedback && picked === o.i && o.i !== q.answer,
            }"
            :disabled="picked !== null"
            @click="pick(o.i)"
          >
            {{ o.text }}
            <Icon v-if="feedback && o.i === q.answer" name="check" :size="30" :stroke="3" />
            <Icon v-else-if="feedback && picked === o.i" name="x" :size="30" :stroke="3" />
          </button>
        </div>
        <div v-if="feedback" class="why">
          <Icon name="lightbulb" :size="28" :stroke="2.2" />{{ q.why }}
        </div>
        <button v-if="feedback" class="next" @click="next">
          {{ idx < QUESTIONS.length - 1 ? '下一題' : '看結果' }}<Icon name="chevron-right" :size="28" :stroke="3" />
        </button>
      </template>

      <template v-else>
        <div class="result">
          <Icon name="trophy" :size="84" :stroke="1.6" />
          <b>{{ score }}<small>/{{ QUESTIONS.length }}</small></b>
          <p v-if="kind === 'post' && pre">前測 {{ pre.score }} 分 → 後測 {{ score }} 分</p>
          <p v-else>{{ kind === 'pre' ? '前測完成，去玩一局吧！' : '後測完成' }}</p>
        </div>
        <div class="btns">
          <button v-if="kind === 'pre'" class="go" @click="startGame"><Icon name="play" :size="28" :stroke="2.6" />出擊</button>
          <button v-else-if="hadGame" class="go" @click="openReview"><Icon name="book-open" :size="28" :stroke="2.4" />回到覆盤</button>
          <button @click="backToMenu"><Icon name="menu" :size="26" :stroke="2.4" />回主選單</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.qz {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.card {
  width: 1100px;
  min-height: 640px;
  padding: 36px 56px 44px;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  background: linear-gradient(180deg, #f8f1df, var(--paper2));
  border: 8px solid var(--gold3);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.65);
  color: var(--ink);
}
.top {
  display: flex;
  align-items: center;
  gap: 20px;
}
.top b {
  padding: 4px 22px;
  border-radius: 8px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 6px;
  color: #fff;
  background: var(--c-recon);
}
.dots {
  display: flex;
  gap: 8px;
}
.dots i {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--paper3);
}
.dots i.on {
  background: var(--good);
}
.dots i.cur {
  background: var(--gold);
  box-shadow: 0 0 0 3px var(--gold3);
}
.no {
  margin-left: auto;
  font-family: var(--font-num);
  font-size: 30px;
  font-weight: 700;
  color: var(--ink2);
}
h2 {
  margin: 0;
  font-size: 40px;
  font-weight: 900;
  line-height: 1.5;
}
.opts {
  display: grid;
  gap: 14px;
}
.opts button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 84px;
  padding: 14px 26px;
  border-radius: 14px;
  font-size: 30px;
  font-weight: 700;
  text-align: left;
  color: var(--ink);
  background: #fff9ea;
  border: 4px solid var(--paper3);
  transition: 0.12s;
}
.opts button:not(:disabled):hover {
  border-color: var(--gold);
  transform: translateX(6px);
}
.opts button:disabled {
  cursor: default;
}
.opts .sel {
  background: #e4ecfa;
  border-color: var(--c-recon);
}
.opts .right {
  color: #fff;
  background: #2c9a68;
  border-color: #1b6a47;
}
.opts .wrong {
  color: #fff;
  background: #b8432f;
  border-color: #7a2a22;
}
.why {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.55;
  background: #fff3cf;
  border: 3px solid var(--gold);
}
.why :deep(svg) {
  flex: none;
  margin-top: 4px;
  color: #8a5a1c;
}
.next {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 66px;
  padding: 0 34px;
  border-radius: 14px;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 3px;
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border: 3px solid var(--gold3);
  box-shadow: 0 5px 0 #6d4f17;
}
.result {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8a5a1c;
}
.result b {
  font-family: var(--font-num);
  font-size: 150px;
  line-height: 1;
  color: var(--ink);
}
.result small {
  font-size: 70px;
  color: var(--ink2);
}
.result p {
  margin: 0;
  font-size: 34px;
  font-weight: 900;
  color: var(--ink);
}
.btns {
  display: flex;
  justify-content: center;
  gap: 18px;
}
.btns button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 72px;
  padding: 0 44px;
  border-radius: 14px;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 3px;
  color: var(--ink);
  background: #fff9ea;
  border: 3px solid var(--paper3);
  box-shadow: 0 5px 0 var(--paper3);
}
.btns .go {
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border-color: var(--gold3);
  box-shadow: 0 5px 0 #6d4f17;
}
</style>
