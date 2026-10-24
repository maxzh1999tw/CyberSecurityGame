<script setup lang="ts">
// 公司模式的開場：有駭客盯上你、怎麼贏怎麼輸。按「開門營業」後駭客才開始行動。
import { computed } from 'vue'
import { confirmCompanyIntro } from '../game/companyStore'
import { game, ui } from '../game/store'
import Icon from './Icon.vue'

const s = computed(() => game.s)
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.companyIntro && s?.company" class="cintro" role="dialog" aria-modal="true" aria-label="開業">
      <div class="veil"></div>
      <main>
        <div class="cards">
          <article class="card hk">
            <div class="band"><Icon name="skull" :size="18" :stroke="2.4" />有駭客盯上你了</div>
            <div class="identity">
              <div class="medal"><Icon name="circle-question-mark" :size="36" :stroke="1.8" /></div>
              <div>
                <div class="name">任務：？？？</div>
                <div class="chip">警戒值 6 以上，打出「威脅情資」才看得見</div>
              </div>
            </div>
            <h3 class="sub win">獲勝方式</h3>
            <ul class="rules">
              <li class="win"><Icon name="shield-check" :size="20" :stroke="2.4" /><span><b>完美防禦</b>所有牌都確認過、沒有弱點、沒有節點被控制，這回合入帳的營收是正的</span></li>
              <li class="win"><Icon name="siren" :size="20" :stroke="2.4" /><span><b>抓到駭客</b>警戒值升到 10，駭客的行蹤就曝光了</span></li>
              <li class="win"><Icon name="brick-wall" :size="20" :stroke="2.4" /><span><b>封死任務</b>用威脅情資看穿任務，再把駭客能走的路都堵死</span></li>
            </ul>
            <h3 class="sub lose">落敗</h3>
            <ul class="rules">
              <li class="lose"><Icon name="flame" :size="20" :stroke="2.4" /><span><b>被得手</b>駭客完成他的任務</span></li>
              <li class="lose"><Icon name="trending-down" :size="20" :stroke="2.4" /><span><b>破產</b>資產變成負的，公司破產倒閉</span></li>
            </ul>
          </article>
        </div>
        <button class="go" type="button" @click="confirmCompanyIntro"><Icon name="store" :size="32" :stroke="2.4" />開門營業</button>
      </main>
    </div>
  </Transition>
</template>

<style scoped>
.cintro {
  position: absolute;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
}
.veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(255, 255, 255, 0.25), transparent 70%),
    rgba(29, 53, 87, 0.55);
  backdrop-filter: blur(3px);
}
main {
  position: relative;
  width: 620px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}
.cards {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}
.card {
  --cc: var(--o-blue);
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-bottom: 20px;
  border-radius: 18px;
  overflow: hidden;
  color: var(--ink);
  background: linear-gradient(170deg, #fbfcfd, #eef2f6);
  border: 2px solid color-mix(in srgb, var(--cc) 55%, #fff);
  box-shadow:
    0 0 0 5px rgba(255, 255, 255, 0.5),
    0 22px 44px rgba(20, 35, 60, 0.35);
}
.hk {
  --cc: #c2412f;
  animation: card-in-right 420ms cubic-bezier(0.2, 0.8, 0.25, 1) 70ms backwards;
}
@keyframes card-in-right {
  from {
    opacity: 0;
    transform: translateX(30px) rotate(2deg);
  }
}
.band {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 20px;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 3px;
  color: #fff;
  background: linear-gradient(180deg, color-mix(in srgb, var(--cc) 85%, #fff), var(--cc));
}
.identity {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px 0;
}
.medal {
  flex: none;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--cc) 70%, #fff), color-mix(in srgb, var(--cc) 80%, #0b1426));
  box-shadow:
    0 0 0 4px #fff,
    0 0 0 6px color-mix(in srgb, var(--cc) 35%, #fff),
    0 6px 14px rgba(20, 35, 60, 0.3);
}
.name {
  overflow-wrap: anywhere;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 1px;
  line-height: 1.2;
  color: var(--o-navy);
}
.hk .name {
  color: #8f2f24;
}
.chip {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 17px;
  font-weight: 800;
  color: color-mix(in srgb, var(--cc) 85%, #000);
  background: color-mix(in srgb, var(--cc) 12%, #fff);
}
.sub {
  margin: 18px 22px 0;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 2px;
}
.sub.win {
  color: #1d6e47;
}
.sub.lose {
  color: #b42318;
}
.rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 22px 0;
  padding: 0;
  list-style: none;
}
.rules li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--ink2);
}
.rules li :deep(svg) {
  margin-top: 2px;
}
.rules b {
  margin-right: 8px;
  font-size: 19px;
  font-weight: 900;
}
.rules .win {
  background: #e3f6ec;
}
.rules .win :deep(svg),
.rules .win b {
  color: #1d6e47;
}
.rules .lose {
  background: #fdecea;
}
.rules .lose :deep(svg),
.rules .lose b {
  color: #b42318;
}
.go {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 76px;
  padding: 0 44px;
  border-radius: 16px;
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
    0 14px 24px rgba(20, 40, 90, 0.4);
  animation: card-in-up 420ms cubic-bezier(0.2, 0.8, 0.25, 1) 160ms backwards;
}
.go:hover {
  filter: brightness(1.07);
}
.go:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #173f85;
}
@keyframes card-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .hk,
  .go {
    animation: none;
  }
}
</style>
