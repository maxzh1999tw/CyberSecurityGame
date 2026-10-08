<script setup lang="ts">
// 出牌演出（像爐石戰記）：牌飛上場中央蓄力 → 射向目標 → 命中時依結果演出
//   成功：爆開、吸收；被防護擋下：撞碎成碎片；什麼也沒發生：從下往上燒成灰
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { sfx } from '../audio/sfx'
import { castApi, ui, view } from '../game/store'
import type { CastSpec } from '../game/store'
import type { CardId } from '../game/types'
import CardFace from './CardFace.vue'

const root = ref<HTMLElement | null>(null)
const cur = ref<{ card: CardId; shards: boolean; burn: boolean; theme: CastSpec['theme'] } | null>(null)
const cardEl = ref<HTMLElement | null>(null)
const faceEl = ref<HTMLElement | null>(null)
const shardEls = ref<HTMLElement[]>([])

// ───────────── 風格：每種牌自己的顏色 ─────────────
const THEME: Record<CastSpec['theme'], { c: string; c2: string }> = {
  scan: { c: '#58b8e8', c2: '#d2efff' },
  hack: { c: '#ee6a50', c2: '#ffd9cf' },
  frost: { c: '#8fd0f5', c2: '#e6f6ff' },
  alarm: { c: '#ff5a4a', c2: '#ffd2cc' },
  virus: { c: '#7ee06a', c2: '#dcffd2' },
  finish: { c: '#f2c040', c2: '#fff1c4' },
}

// ───────────── 小工具 ─────────────
const rate = () => Math.max(0.05, ui.speed)
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms / rate()))
const rnd = (r: [number, number]) => r[0] + Math.random() * (r[1] - r[0])
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

/** 逐格動畫（跟快轉連動；畫面被擋住沒在跑時，用計時器保底，不會卡住遊戲） */
function tween(ms: number, fn: (t: number) => void): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    let acc = 0
    let last = performance.now()
    const finish = () => {
      if (done) return
      done = true
      fn(1)
      resolve()
    }
    const step = (now: number) => {
      if (done) return
      acc += (now - last) * rate()
      last = now
      const t = Math.min(1, acc / ms)
      fn(t)
      if (t < 1) requestAnimationFrame(step)
      else finish()
    }
    requestAnimationFrame(step)
    setTimeout(finish, (ms * 2) / rate() + 400)
  })
}

interface Pose {
  x: number
  y: number
  s: number
  r: number
}
function place(els: HTMLElement[], p: Pose) {
  const tf = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${p.s})`
  for (const el of els) el.style.transform = tf
}

// ───────────── 粒子與特效 ─────────────
interface PartOpt {
  n: number
  color: string | string[]
  spread: [number, number]
  life: [number, number]
  size: [number, number]
  shape?: 'dot' | 'spark' | 'shard' | 'ember' | 'diamond'
  gravity?: number
  rise?: number
  angle?: [number, number]
  glow?: boolean
}

function burst(x: number, y: number, o: PartOpt) {
  const host = root.value
  if (!host) return
  for (let i = 0; i < o.n; i++) {
    const el = document.createElement('i')
    el.className = 'p ' + (o.shape ?? 'dot')
    const size = rnd(o.size)
    const col = Array.isArray(o.color) ? o.color[Math.floor(Math.random() * o.color.length)] : o.color
    el.style.width = size + 'px'
    el.style.height = (o.shape === 'spark' ? Math.max(3, size * 0.28) : size) + 'px'
    el.style.background = col
    if (o.glow) el.style.boxShadow = `0 0 ${size * 1.6}px ${col}`
    el.style.left = x + 'px'
    el.style.top = y + 'px'
    const ang = ((o.angle ? rnd(o.angle) : Math.random() * 360) * Math.PI) / 180
    const dist = rnd(o.spread)
    const dx = Math.cos(ang) * dist
    const dy = Math.sin(ang) * dist + (o.gravity ?? 0) - (o.rise ?? 0)
    const tilt = o.shape === 'spark' ? (ang * 180) / Math.PI : rnd([-200, 200])
    host.appendChild(el)
    const a = el.animate(
      [
        { transform: `translate(-50%, -50%) rotate(${o.shape === 'spark' ? tilt : 0}deg) scale(1)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${tilt}deg) scale(0.35)`, opacity: 0 },
      ],
      { duration: rnd(o.life), easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' },
    )
    a.playbackRate = rate()
    a.onfinish = () => el.remove()
  }
}

/** 能量往中心聚集 */
function gather(x: number, y: number, color: string, n: number) {
  const host = root.value
  if (!host) return
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i')
    el.className = 'p dot'
    const size = rnd([6, 13])
    el.style.width = el.style.height = size + 'px'
    el.style.background = color
    el.style.boxShadow = `0 0 ${size * 1.6}px ${color}`
    el.style.left = x + 'px'
    el.style.top = y + 'px'
    const ang = Math.random() * Math.PI * 2
    const d = rnd([170, 270])
    host.appendChild(el)
    const a = el.animate(
      [
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d}px)) scale(0.5)`, opacity: 0 },
        { opacity: 1, offset: 0.35 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.9 },
      ],
      { duration: rnd([260, 420]), easing: 'cubic-bezier(.3,0,.7,1)', fill: 'both', delay: Math.random() * 90 },
    )
    a.playbackRate = rate()
    a.onfinish = () => el.remove()
  }
}

function ring(x: number, y: number, color: string, o: { r: number; dur: number; delay?: number; width?: number }) {
  const host = root.value
  if (!host) return
  const el = document.createElement('i')
  el.className = 'ring'
  el.style.left = x + 'px'
  el.style.top = y + 'px'
  el.style.width = el.style.height = o.r * 2 + 'px'
  el.style.border = `${o.width ?? 8}px solid ${color}`
  el.style.boxShadow = `0 0 24px ${color}, inset 0 0 24px ${color}`
  host.appendChild(el)
  const a = el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.08)', opacity: 0.95 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
    ],
    { duration: o.dur, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'both', delay: o.delay ?? 0 },
  )
  a.playbackRate = rate()
  a.onfinish = () => el.remove()
}

function flashScreen(color: string, ms: number, peak = 0.35) {
  const host = root.value
  if (!host) return
  const el = document.createElement('i')
  el.className = 'flash'
  el.style.background = color
  host.appendChild(el)
  const a = el.animate([{ opacity: 0 }, { opacity: peak, offset: 0.25 }, { opacity: 0 }], { duration: ms, fill: 'forwards' })
  a.playbackRate = rate()
  a.onfinish = () => el.remove()
}

function shake(px: number, ms: number) {
  const el = root.value?.parentElement
  if (!el) return
  const a = el.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${-px}px, ${px * 0.4}px)` },
      { transform: `translate(${px * 0.8}px, ${-px * 0.5}px)` },
      { transform: `translate(${-px * 0.5}px, ${px * 0.3}px)` },
      { transform: `translate(${px * 0.25}px, 0)` },
      { transform: 'translate(0,0)' },
    ],
    { duration: ms, easing: 'ease-out' },
  )
  a.playbackRate = rate()
}

/** 各種牌命中時的特效 */
function impactFx(theme: CastSpec['theme'], x: number, y: number) {
  const T = THEME[theme]
  switch (theme) {
    case 'scan': {
      const host = root.value
      if (host) {
        const el = document.createElement('i')
        el.className = 'sweep'
        el.style.left = x + 'px'
        el.style.top = y + 'px'
        host.appendChild(el)
        const a = el.animate(
          [
            { transform: 'translate(-50%, -50%) rotate(0deg) scale(0.6)', opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { transform: 'translate(-50%, -50%) rotate(380deg) scale(1.15)', opacity: 0 },
          ],
          { duration: 760, easing: 'ease-out', fill: 'forwards' },
        )
        a.playbackRate = rate()
        a.onfinish = () => el.remove()
      }
      ring(x, y, T.c, { r: 170, dur: 620 })
      ring(x, y, T.c2, { r: 110, dur: 520, delay: 120, width: 5 })
      burst(x, y, { n: 14, color: [T.c, T.c2], spread: [60, 170], life: [420, 700], size: [8, 14], shape: 'diamond', glow: true })
      break
    }
    case 'hack': {
      ring(x, y, T.c, { r: 160, dur: 520 })
      burst(x, y, { n: 22, color: [T.c, T.c2, '#ffb59e'], spread: [90, 240], life: [380, 700], size: [14, 28], shape: 'spark', glow: true })
      // 數位亂碼條
      const host = root.value
      if (host) {
        for (let i = 0; i < 9; i++) {
          const el = document.createElement('i')
          el.className = 'glitch'
          el.style.left = x + rnd([-120, 120]) + 'px'
          el.style.top = y + rnd([-80, 80]) + 'px'
          el.style.width = rnd([40, 130]) + 'px'
          el.style.height = rnd([4, 9]) + 'px'
          el.style.background = i % 2 ? T.c : T.c2
          host.appendChild(el)
          const a = el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0, offset: 0.4 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], {
            duration: 520,
            delay: i * 28,
            fill: 'both',
          })
          a.playbackRate = rate()
          a.onfinish = () => el.remove()
        }
      }
      break
    }
    case 'frost':
      ring(x, y, T.c, { r: 180, dur: 640 })
      ring(x, y, '#ffffff', { r: 100, dur: 480, delay: 90, width: 4 })
      burst(x, y, { n: 30, color: [T.c, T.c2, '#ffffff'], spread: [60, 200], life: [600, 1000], size: [9, 18], shape: 'diamond', rise: 40, glow: true })
      break
    case 'alarm':
      for (let i = 0; i < 3; i++) ring(x, y, T.c, { r: 210, dur: 640, delay: i * 190 })
      flashScreen('#ff3b2e', 700, 0.22)
      burst(x, y, { n: 18, color: [T.c, T.c2], spread: [90, 220], life: [420, 760], size: [14, 26], shape: 'spark', glow: true })
      break
    case 'virus':
      ring(x, y, T.c, { r: 150, dur: 620 })
      burst(x, y, { n: 30, color: [T.c, T.c2, '#3fae4a'], spread: [40, 170], life: [700, 1200], size: [8, 20], shape: 'dot', gravity: 70, glow: true })
      break
    case 'finish':
      flashScreen('#ffe9a8', 620, 0.5)
      for (let i = 0; i < 3; i++) ring(x, y, T.c, { r: 280 + i * 70, dur: 760, delay: i * 130, width: 10 })
      burst(x, y, { n: 44, color: [T.c, T.c2, '#ffffff'], spread: [120, 380], life: [600, 1100], size: [16, 32], shape: 'spark', glow: true })
      shake(14, 420)
      break
  }
}

// ───────────── 碎片 ─────────────
const SHARDS: Array<Array<[number, number]>> = [
  [[0, 0], [80, 0], [95, 95], [0, 100]],
  [[80, 0], [170, 0], [165, 85], [95, 95]],
  [[170, 0], [240, 0], [240, 110], [165, 85]],
  [[240, 110], [240, 240], [180, 190], [165, 85]],
  [[240, 240], [240, 340], [175, 340], [120, 250], [180, 190]],
  [[175, 340], [70, 340], [120, 250]],
  [[70, 340], [0, 340], [0, 235], [60, 175], [120, 250]],
  [[0, 235], [0, 100], [95, 95], [60, 175]],
  [[95, 95], [165, 85], [180, 190], [120, 250], [60, 175]],
]
const shardInfo = SHARDS.map((poly) => {
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length
  return { cx, cy, clip: 'polygon(' + poly.map((p) => `${p[0]}px ${p[1]}px`).join(', ') + ')' }
})
const setShardEl = (el: unknown, i: number) => {
  if (el) shardEls.value[i] = el as HTMLElement
}

// ───────────── 主流程 ─────────────
async function run(spec: CastSpec) {
  const T = THEME[spec.theme]
  cur.value = { card: spec.card, shards: false, burn: false, theme: spec.theme }
  shardEls.value = []
  await nextTick()
  const el = cardEl.value
  const face = faceEl.value
  if (!el || !face) {
    await spec.onHit()
    cur.value = null
    return
  }
  el.style.setProperty('--tc', T.c)
  el.style.setProperty('--g', '0')
  el.style.setProperty('--burn', '0%')
  el.style.opacity = '1'

  try {
    const C = { x: view.w / 2, y: Math.round(view.h * 0.43) }
    const p0 = spec.from
    place([el], { x: p0.x, y: p0.y, s: p0.scale, r: 0 })

    // ① 飛上場中央
    sfx.charge()
    await tween(330, (t) => {
      const e = ease.outCubic(t)
      place([el], { x: lerp(p0.x, C.x, e), y: lerp(p0.y, C.y, e), s: lerp(p0.scale, 1.16, ease.outBack(t)), r: lerp(0, -3, e) })
      el.style.setProperty('--g', String(0.55 * e))
    })

    // ② 蓄力：能量聚集、發光
    gather(C.x, C.y, T.c, 18)
    ring(C.x, C.y, T.c, { r: 190, dur: 420, width: 5 })
    await tween(190, (t) => {
      place([el], { x: C.x + Math.sin(t * 38) * 2.2, y: C.y, s: lerp(1.16, 1.26, ease.outCubic(t)), r: -3 + Math.sin(t * 30) * 1.2 })
      el.style.setProperty('--g', String(lerp(0.55, 1, t)))
    })

    // ③ 射向目標（拋物線，越飛越快，後面拖著光點）
    sfx.launch()
    const P2 = spec.to
    const P1 = { x: (C.x + P2.x) / 2 + (P2.x >= C.x ? -60 : 60), y: Math.min(C.y, P2.y) - 150 }
    let lastTrail = 0
    await tween(310, (t) => {
      const e = ease.inCubic(t)
      const u = 1 - e
      const x = u * u * C.x + 2 * u * e * P1.x + e * e * P2.x
      const y = u * u * C.y + 2 * u * e * P1.y + e * e * P2.y
      const s = lerp(1.26, 0.62, ease.outCubic(t))
      place([el], { x, y, s, r: lerp(-3, 16, t) })
      el.style.setProperty('--g', String(lerp(1, 0.6, t)))
      const now = performance.now()
      if (now - lastTrail > 22) {
        lastTrail = now
        burst(x, y, { n: 2, color: [T.c, T.c2], spread: [8, 34], life: [260, 420], size: [8, 17], shape: 'dot', glow: true })
      }
    })
    const hitPose: Pose = { x: P2.x, y: P2.y, s: 0.62, r: 16 }
    place([el], hitPose)

    // ④ 命中：真正套用牌的效果；同時播放這張牌的結果演出
    const hit = spec.onHit()
    const out = spec.outcome === 'ok' ? absorb(spec, hitPose) : spec.outcome === 'blocked' ? shatter(hitPose) : burnUp(hitPose)
    await Promise.all([hit, out])
  } finally {
    cur.value = null
  }
}

/** 成功：牌爆成光，被目標吸收 */
async function absorb(spec: CastSpec, P: Pose) {
  const el = cardEl.value!
  impactFx(spec.theme, P.x, P.y)
  await tween(380, (t) => {
    const swell = 1 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.2))
    const s = P.s * swell * (1 - ease.inCubic(t))
    place([el], { ...P, s, r: lerp(P.r, 0, t) })
    el.style.setProperty('--g', String(1 - t * 0.4))
    el.style.opacity = String(t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1)
    el.style.filter = `brightness(${1 + 1.6 * (1 - t)})`
  })
}

/** 被防護擋下：撞上去，碎成一片一片 */
async function shatter(P: Pose) {
  const el = cardEl.value!
  sfx.shatter()
  ring(P.x, P.y, '#cfe6ff', { r: 170, dur: 440 })
  flashScreen('#dbeeff', 200, 0.28)
  shake(13, 320)
  // 撞上去的瞬間：被頂住、變白
  await tween(80, (t) => {
    place([el], { ...P, s: P.s * (1 - 0.1 * Math.sin(Math.PI * t)), r: P.r })
    el.style.filter = `brightness(${1 + 1.2 * Math.sin(Math.PI * t)})`
  })
  if (cur.value) cur.value.shards = true
  await nextTick()
  el.style.opacity = '0'
  place(shardEls.value, P)
  burst(P.x, P.y, { n: 30, color: ['#e8f3ff', '#9cc6ee', '#ffffff', '#f2d994'], spread: [90, 300], life: [600, 1000], size: [8, 20], shape: 'shard', gravity: 240, glow: false })
  shardEls.value.forEach((sh, i) => {
    if (!sh) return
    const info = shardInfo[i]
    // 往「從牌中心指向這一片」的方向飛，再受重力掉下去
    const vx = info.cx - 120 + (Math.random() - 0.5) * 50
    const vy = info.cy - 170 + (Math.random() - 0.5) * 50
    const len = Math.hypot(vx, vy) || 1
    const dist = rnd([120, 300]) * (i === 8 ? 0.55 : 1)
    const dx = (vx / len) * dist
    const dy = (vy / len) * dist
    const spin = rnd([-170, 170])
    const dur = rnd([760, 980])
    // 動畫放在內層：外層負責把碎片擺在牌原本的位置
    const inner = sh.firstElementChild as HTMLElement
    const a = inner.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.7 - 34}px) rotate(${spin * 0.45}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px, ${dy + 340}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' },
    )
    a.playbackRate = rate()
  })
  await sleep(1000)
}

/** 什麼也沒發生：牌從下往上燒成灰 */
async function burnUp(P: Pose) {
  const el = cardEl.value!
  const face = faceEl.value!
  sfx.burn()
  if (cur.value) cur.value.burn = true
  await nextTick()
  let lastEmber = 0
  await tween(980, (t) => {
    const e = ease.inOut(t)
    const burn = e * 118
    el.style.setProperty('--burn', burn + '%')
    el.style.setProperty('--g', '0')
    place([el], { x: P.x + Math.sin(t * 70) * 2.5 * (1 - t), y: P.y - t * 16, s: P.s, r: lerp(P.r, 4, Math.min(1, t * 3)) })
    face.style.filter = `brightness(${1 - 0.5 * t}) sepia(${0.7 * t}) saturate(${1 + t})`
    const now = performance.now()
    if (now - lastEmber > 36 && burn < 108) {
      lastEmber = now
      const frontY = P.y - 170 * P.s - t * 16 + (1 - burn / 100) * 340 * P.s
      const fx = P.x + rnd([-110, 110]) * P.s
      burst(fx, frontY, { n: 2, color: ['#ffb347', '#ff7a2a', '#ffd98a'], spread: [10, 46], life: [520, 900], size: [5, 11], shape: 'ember', rise: 110, glow: true })
      burst(fx, frontY - 6, { n: 1, color: 'rgba(60,52,48,0.7)', spread: [6, 26], life: [800, 1200], size: [16, 30], shape: 'dot', rise: 90 })
    }
  })
}

onMounted(() => {
  castApi.run = run
})
onBeforeUnmount(() => {
  if (castApi.run === run) castApi.run = null
})
</script>

<template>
  <div ref="root" class="cast">
    <template v-if="cur">
      <!-- 打出去的那張牌 -->
      <div ref="cardEl" class="cc" :class="{ burning: cur.burn }">
        <div class="glow"></div>
        <div ref="faceEl" class="face"><CardFace :id="cur.card" /></div>
        <div v-if="cur.burn" class="front"></div>
      </div>
      <!-- 撞碎時的碎片 -->
      <template v-if="cur.shards">
        <div v-for="(sh, i) in shardInfo" :key="i" :ref="(el) => setShardEl(el, i)" class="cc sh">
          <div class="shi" :style="{ clipPath: sh.clip, transformOrigin: sh.cx + 'px ' + sh.cy + 'px' }">
            <CardFace :id="cur.card" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.cast {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 60;
}
.cc {
  --tc: #fff;
  --g: 0;
  position: absolute;
  left: 0;
  top: 0;
  width: 240px;
  height: 340px;
  margin: -170px 0 0 -120px;
  transform-origin: 50% 50%;
  will-change: transform, opacity;
}
.glow {
  position: absolute;
  inset: -40px;
  border-radius: 50px;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--tc) 80%, transparent), color-mix(in srgb, var(--tc) 30%, transparent) 60%, transparent);
  filter: blur(14px);
  opacity: var(--g);
}
.face {
  position: relative;
  filter: drop-shadow(0 0 calc(var(--g) * 22px) var(--tc));
}
.burning .face {
  filter: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - var(--burn)), transparent calc(100% - var(--burn) + 9%));
  mask-image: linear-gradient(to bottom, #000 calc(100% - var(--burn)), transparent calc(100% - var(--burn) + 9%));
}
/* 燒毀的火線 */
.front {
  position: absolute;
  left: -10px;
  right: -10px;
  top: calc(100% - var(--burn) - 14px);
  height: 34px;
  background: linear-gradient(180deg, transparent, rgba(255, 190, 80, 0.55) 30%, #ff8a2a 55%, rgba(255, 70, 20, 0.7) 75%, transparent);
  filter: blur(3px);
  border-radius: 20px;
  opacity: 1;
}
.sh {
  will-change: auto;
}
.shi {
  position: absolute;
  inset: 0;
  will-change: transform, opacity;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
}

/* 粒子（用程式動態產生，所以要 :global） */
.cast :global(.p) {
  position: absolute;
  pointer-events: none;
}
.cast :global(.p.dot),
.cast :global(.p.ember) {
  border-radius: 50%;
}
.cast :global(.p.diamond) {
  transform-origin: center;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.cast :global(.p.shard) {
  clip-path: polygon(0 100%, 55% 0, 100% 80%);
}
.cast :global(.p.spark) {
  border-radius: 3px;
}
.cast :global(.ring) {
  position: absolute;
  box-sizing: border-box;
  border-radius: 50%;
  pointer-events: none;
}
.cast :global(.flash) {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.cast :global(.sweep) {
  position: absolute;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  pointer-events: none;
  background: conic-gradient(from 0deg, rgba(88, 184, 232, 0) 0deg, rgba(88, 184, 232, 0.6) 80deg, rgba(88, 184, 232, 0) 82deg, rgba(88, 184, 232, 0) 360deg);
  box-shadow: inset 0 0 0 4px rgba(150, 215, 245, 0.55);
}
.cast :global(.glitch) {
  position: absolute;
  pointer-events: none;
}
</style>
