// 公司模式的畫面流程：招募、擺放、公司出牌、電腦駭客的回合演出
import { sfx } from '../audio/sfx'
import { botNextAction } from './bot'
import {
  buildCompanyGame,
  checkBlocked,
  companyCardCost,
  defaultLayer,
  endCompanyTurn,
  fire,
  forecast,
  hireTo,
  moveTo,
  newDraft,
  openErrors,
  overBudget,
  placeProblem,
  playCompanyCard,
  recycleCompanyCard,
  startCompanyTurn,
  syncOutcome,
  type CompanyEffect,
} from './company'
import { botBuild, leanBuild } from './companyBot'
import { BRAND_COLORS, BRAND_LOGOS, BRAND_NAME_MAX, COMPANY, COMPANY_CARDS, DEFAULT_BRAND, HIRES } from './companyData'
import { MISSIONS } from './data'
import * as E from './engine'
import {
  anchorRect,
  boardCenter,
  castApi,
  coachSeen,
  commitPlay,
  companyApi,
  finishGame,
  flashNode,
  flashSlot,
  float,
  game,
  nodeRect,
  plaque,
  presentEndOfTurn,
  resetBoardUi,
  showBanner,
  toast,
  type CastSpec,
  ui,
  view,
  wait,
} from './store'
import type { CompanyBrand, CompanyCardId, GameState, Layer } from './types'

const over = (s: GameState) => (s.phase as GameState['phase']) === 'over'

// ───────────────────────── 招募與擺放 ─────────────────────────

export function startCompanyMode() {
  sfx.unlock()
  game.draft = playableDraft()
  game.draft.brand = loadBrand()
  game.screen = 'draft'
}

// ───── 公司名稱與 logo：玩家自己決定，記在這台裝置上，下一局沿用 ─────

const BRAND_KEY = 'csg-brand'

function loadBrand(): CompanyBrand {
  try {
    const raw = localStorage.getItem(BRAND_KEY)
    const b = raw ? (JSON.parse(raw) as Partial<CompanyBrand>) : {}
    return {
      name: typeof b.name === 'string' ? b.name.slice(0, BRAND_NAME_MAX) : DEFAULT_BRAND.name,
      logo: typeof b.logo === 'string' && BRAND_LOGOS.includes(b.logo) ? b.logo : DEFAULT_BRAND.logo,
      color: typeof b.color === 'string' && BRAND_COLORS.includes(b.color) ? b.color : DEFAULT_BRAND.color,
    }
  } catch {
    return { ...DEFAULT_BRAND }
  }
}

/** 改公司名稱、logo 圖示或底色 */
export function setBrand(patch: Partial<CompanyBrand>) {
  const d = game.draft
  if (!d) return
  if (patch.name !== undefined) patch.name = patch.name.slice(0, BRAND_NAME_MAX)
  Object.assign(d.brand, patch)
  try {
    localStorage.setItem(BRAND_KEY, JSON.stringify(d.brand))
  } catch {
    /* 無痕模式等存不了就算了 */
  }
}

/** 抽一個「組得出能開業的公司」的人力市場：用電腦的組法試一次，組不出來就重抽 */
function playableDraft() {
  let d = newDraft()
  for (let k = 0; k < 10; k++) {
    const trial = JSON.parse(JSON.stringify(d)) as typeof d
    botBuild(trial)
    if (!openErrors(trial).length) break
    d = newDraft()
  }
  return d
}

/** 從市場聘進公司（沒指定層就放第一個放得下的層） */
export function hireCandidate(uid: number, layer?: Layer) {
  const d = game.draft
  if (!d) return
  const c = Object.values(d.market).flat().find((x) => x.uid === uid)
  if (!c) return
  const to = layer ?? defaultLayer(d, c)
  // 放不下時說出真正的原因（例如基礎設施滿了），而不是籠統的「沒位置」
  const problem = to === null ? placeProblem(d, c, HIRES[c.hire].layers[0]) ?? '每一層都滿了' : hireTo(d, uid, to)
  if (problem) {
    sfx.deny()
    toast(problem)
    return
  }
  sfx.pick()
}

/** 公司裡的節點換一層 */
export function moveNode(uid: number, layer: Layer) {
  const d = game.draft
  if (!d) return
  const problem = moveTo(d, uid, layer)
  if (problem) {
    sfx.deny()
    toast(problem)
    return
  }
  sfx.click()
}

/** 快速配置：先把公司清空，再用電腦的組法排出一個能開業的方案 */
export function recommendBuild() {
  const d = game.draft
  if (!d) return
  for (const p of [...d.picks]) fire(d, p.uid)
  const before = Object.values(d.market).reduce((a, m) => a + m.length, 0)
  leanBuild(d)
  if (openErrors(d).length) {
    sfx.deny()
    toast('這次的人力市場排不出能開業的配置，請自己調整看看')
    return
  }
  sfx.draw()
  const more = Object.values(d.market).reduce((a, m) => a + m.length, 0) + d.picks.length - before
  toast(`快速配置：${d.picks.length} 個節點、每回合收益 +${forecast(d.picks, d.placement).net}K${more > 0 ? `（人力市場多了 ${more} 位二星、三星人選）` : ''}`, 'info')
}

/** 從公司移回市場 */
export function fireNode(uid: number) {
  const d = game.draft
  if (!d) return
  fire(d, uid)
  sfx.cancel()
}

/** 開始營運：駭客先手 */
export function openCompany() {
  const d = game.draft
  if (!d) return
  const errors = openErrors(d)
  if (errors.length) {
    sfx.deny()
    toast(errors[0])
    return
  }
  const s = buildCompanyGame(d)
  game.s = s
  game.screen = 'game'
  resetBoardUi()
  ui.intro = false
  ui.toast = null
  // 先看開場介紹（起手牌已經在手上），按「開門營業」駭客才開始行動
  ui.companyIntro = true
}

export function confirmCompanyIntro() {
  if (!ui.companyIntro) return
  ui.companyIntro = false
  sfx.click()
  void runSafely(hackerBotTurn)
}

// ───────────────────────── 電腦駭客的回合 ─────────────────────────

async function runSafely(fn: () => Promise<void>) {
  try {
    await fn()
  } catch (e) {
    console.error(e)
    ui.busy = !!game.s && over(game.s)
  }
}

/** 駭客的牌從畫面上方飛進來 */
const HACKER_FROM = () => ({ x: boardCenter(), y: -160, scale: 0.7 })

async function hackerBotTurn() {
  const s = game.s
  if (!s || over(s)) return
  ui.busy = true
  await showBanner('駭客行動中', 'danger', undefined, 900)
  for (let acts = 0; s.phase === 'hacker' && acts < 20; acts++) {
    const a = botNextAction(s)
    if (a.kind === 'end') break
    if (a.kind === 'recycle') {
      E.recycleCard(s, a.uid)
      continue
    }
    const entry = { id: a.uid, turn: s.turn, card: a.id, target: a.target ?? null, ok: null }
    ui.hackerLog.unshift(entry)
    await commitPlay(a.uid, a.target, HACKER_FROM())
    ui.hackerLog[0].ok = s.plays[s.plays.length - 1]?.ok ?? false
    if (over(s)) {
      syncOutcome(s)
      return
    }
    ui.busy = true
    await wait(250)
  }
  // 首回合一定要先出過牌才能結束；電腦真的沒牌可出時就直接放行
  if (!E.canEndTurn(s)) s.actedThisTurn = true
  await presentEndOfTurn()
  syncOutcome(s)
  if (over(s)) {
    await finishGame()
    return
  }
  const drew = startCompanyTurn(s)
  // 營收入帳：在公司資產上飄出這回合入帳多少
  const income = s.company!.income
  const money = anchorRect('money')
  float(money?.cx ?? boardCenter(), money?.cy ?? 200, `${income >= 0 ? '+' : ''}${income}K 入帳`, income >= 0 ? 'gold' : 'bad', 'coins')
  await wait(500)
  if (checkBlocked(s)) {
    await presentBlocked()
    await finishGame()
    return
  }
  if (s.company!.outcome === 'bankrupt') {
    await presentBankrupt()
    await finishGame()
    return
  }
  ui.freshCards = drew.map((c) => c.uid)
  const swaps = s.company!.freeSwaps
  await showBanner('公司回合', 'company', swaps ? `手牌滿了抽不到牌：這回合可以免費換牌 ${swaps} 次` : '拖曳手牌出牌，再按結束回合', swaps ? 1400 : 900)
  ui.freshCards.forEach((_, i) => setTimeout(() => sfx.draw(), i * 110))
  await wait(700)
  ui.freshCards = []
  ui.busy = false
  if (s.company!.turn === 1 && !coachSeen('company')) ui.coach = 0
}

// ───────────────────────── 公司出牌 ─────────────────────────

/** 拖曳放開：出牌（要指定目標的牌已經在拖曳時檢查過目標） */
function dropPlay(uid: number, target: string | undefined, from: CastSpec['from']) {
  const s = game.s
  if (!s?.company || ui.busy || s.phase !== 'company') return
  void runSafely(() => playCompany(uid, target, from))
}

/** 拖到換牌區：花錢換一張新的 */
function dropRecycle(uid: number) {
  const s = game.s
  if (!s?.company || ui.busy || s.phase !== 'company') return
  void runSafely(async () => {
    ui.busy = true
    ui.recycling = uid
    sfx.drop()
    await wait(280)
    const free = s.company!.freeSwaps > 0
    if (!free && overBudget(s, COMPANY.recycleCost)) {
      ui.recycling = null
      ui.busy = false
      sfx.deny()
      toast(`錢不夠：換牌要 ${COMPANY.recycleCost}K`)
      return
    }
    const fresh = recycleCompanyCard(s, uid)
    ui.recycling = null
    const pile = nodeRect(s.nodes[0].id)
    float(boardCenter(), (pile?.y ?? 300) + 40, free ? '免費換牌' : `−${COMPANY.recycleCost}K`, free ? 'good' : 'bad', free ? 'recycle' : 'coins')
    if (fresh) {
      ui.freshCards = [fresh.uid]
      sfx.draw()
      await wait(500)
      ui.freshCards = []
    }
    ui.busy = false
  })
}

companyApi.play = dropPlay
companyApi.recycle = dropRecycle

/** 公司牌的演出風格：稽核像掃描，經營牌是金色，其他是綠色的防守 */
function companyTheme(id: CompanyCardId): CastSpec['theme'] {
  const cat = COMPANY_CARDS[id].cat
  return cat === 'audit' ? 'scan' : cat === 'business' ? 'finish' : 'support'
}

/** 不用選目標的牌飛向哪裡：影響警戒的飛向警戒條，經營牌飛向公司資產 */
const COMPANY_AIM: Partial<Record<CompanyCardId, string>> = {
  pr: 'alert',
  monitor: 'alert',
  intel: 'alert',
}

async function playCompany(uid: number, target?: string, from?: CastSpec['from']) {
  const s = game.s!
  const co = s.company!
  const id = co.hand.find((c) => c.uid === uid)!.id
  ui.busy = true
  const aim = target ? nodeRect(target) : COMPANY_AIM[id] ? anchorRect(COMPANY_AIM[id]!) : null
  const to = aim ? { x: aim.cx, y: aim.cy } : { x: boardCenter(), y: 420 }
  ui.playing = { uid, x: to.x, y: to.y }
  sfx.drop()
  const spec: CastSpec = {
    card: id,
    company: true,
    cost: companyCardCost(s, id),
    from: from ?? { x: boardCenter(), y: view.h - 190, scale: 0.8 },
    to,
    theme: companyTheme(id),
    outcome: 'ok',
    onHit: async () => {
      const eff = playCompanyCard(s, uid, target)
      ui.playing = null
      float(to.x, to.y - 40, eff.cost ? `−${eff.cost}K` : '免費', eff.cost ? 'bad' : 'good', 'coins')
      await presentCompanyEffect(eff, COMPANY_CARDS[eff.card].name)
    },
  }
  if (castApi.run) await castApi.run(spec)
  else await spec.onHit()
  ui.playing = null
  ui.busy = false
  if (over(s)) {
    if (s.company?.outcome === 'blocked') await presentBlocked()
    if (s.company?.outcome === 'caught') await presentCaught()
    if (s.company?.outcome === 'bankrupt') await presentBankrupt()
    await finishGame()
  }
}

/** 破產：在公司資產上蓋章 */
async function presentBankrupt() {
  ui.busy = true
  sfx.fail()
  const at = anchorRect('money')
  plaque(at ? at.x + at.w + 200 : boardCenter(), at?.cy ?? 200, { title: '破產!', sub: '資產變成負的，手上也沒有能賺錢的牌了', tone: 'bad', icon: 'trending-down', style: 'stamp' }, 2600)
  await wait(2000)
}

/** 公司自己把警戒推到 10：在警戒條上蓋章 */
async function presentCaught() {
  ui.busy = true
  sfx.success()
  const at = anchorRect('alert')
  plaque(at?.cx ?? boardCenter(), (at?.cy ?? 60) + 110, { title: '抓到駭客!', sub: '警戒值到 10，駭客的行蹤曝光了', tone: 'good', icon: 'siren', style: 'stamp' }, 2600)
  await wait(2000)
}

/** 封死任務的演出：像駭客的「得手」一樣蓋章，並說明為什麼駭客已經不可能得手 */
async function presentBlocked() {
  const s = game.s!
  ui.busy = true
  const m = MISSIONS[s.mission]
  sfx.success()
  for (const n of s.nodes) flashNode(n.id, 'restore', 1600)
  plaque(
    boardCenter(),
    view.h * 0.42,
    {
      title: '封死任務!',
      sub: `駭客的任務是「${m.name}」：${m.goal}。但能走的入侵路線都被堵死了，他不可能得手`,
      tone: 'good',
      icon: 'brick-wall',
      style: 'stamp',
      wide: true,
    },
    3600,
  )
  await wait(3000)
}

async function presentCompanyEffect(eff: CompanyEffect, name: string) {
  const s = game.s!
  for (const r of eff.revealed) flashSlot(r.node, r.idx, 'reveal', 1300)
  for (const r of eff.fixed) flashSlot(r.node, r.idx, 'patch', 1500)
  for (const id of eff.recaptured) flashNode(id, 'restore', 1300)
  for (const id of eff.renewed) flashNode(id, 'pulse', 1100)
  // 抽到的牌從牌庫飛進手牌
  if (eff.drawn.length) {
    ui.freshCards = eff.drawn.map((c) => c.uid)
    eff.drawn.forEach((_, i) => setTimeout(() => sfx.draw(), i * 110))
  }
  if (eff.revealed.length) sfx.reveal()
  else if (eff.fixed.length) sfx.patch()
  else if (eff.recaptured.length) sfx.capture()
  else sfx.click()
  const at = eff.target ? nodeRect(eff.target) : null
  const found = eff.revealed.filter((r) => {
    const sl = E.node(s, r.node).slots[r.idx]
    return !sl.shield && !sl.fixed
  }).length
  const sub =
    eff.revealed.length ? (found ? `發現 ${found} 個弱點` : '沒有發現弱點')
    : eff.fixed.length ? eff.message || '弱點補好了'
    : eff.recaptured.length ? '奪回控制'
    : eff.renewed.length ? '換新了'
    : eff.message || undefined
  if (at) plaque(at.cx, at.cy - 6, { title: name, sub, tone: found ? 'bad' : 'good', icon: COMPANY_CARDS[eff.card].icon, style: 'tag' }, 1600)
  else if (eff.message) toast(eff.message)
  await wait(eff.revealed.length || eff.fixed.length || eff.drawn.length ? 650 : 350)
  ui.freshCards = []
}

export function companyEndTurn() {
  const s = game.s
  if (!s?.company || ui.busy || s.phase !== 'company') return
  void runSafely(async () => {
    ui.busy = true
    sfx.endTurn()
    endCompanyTurn(s)
    await wait(400)
    if (over(s)) {
      if (s.company?.outcome === 'bankrupt') await presentBankrupt()
      await finishGame()
      return
    }
    await hackerBotTurn()
  })
}

/** 公司模式再玩一局：回到招募 */
export function restartCompany() {
  startCompanyMode()
}
