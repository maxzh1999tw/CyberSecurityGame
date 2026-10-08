// 遊戲畫面的狀態與操作：把規則引擎和動畫串在一起
import { reactive } from 'vue'
import { sfx } from '../audio/sfx'
import { BACKUP_RESTORE_TURNS, CARDS, IT_PARALYZE_TURNS, SCENARIO_IDS, VULNS } from './data'
import * as E from './engine'
import type { Playability, StepOutcome } from './engine'
import type { CardId, GameState, MissionId, ScenarioId, Tri } from './types'

/** 設計基準：高 1080、寬至少 1920；寬螢幕會把舞台往左右延伸，不留黑邊 */
export const BASE_W = 1920
export const BASE_H = 1080
export const MAX_W = 2600
/** 底部手牌區的高度 */
export const HAND_ZONE = 300

export interface Rect {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

export interface DragState {
  uid: number
  id: CardId
  mode: 'node' | 'auto'
  x: number
  y: number
  sx: number
  sy: number
  moved: boolean
  overNode: string | null
  overPile: boolean
  tri: Tri | null
  pb: Playability
}

export interface Floater {
  id: number
  x: number
  y: number
  text: string
  tone: 'good' | 'bad' | 'info' | 'noise' | 'gold'
  icon?: string
}

/** 結果銘牌：一個事件一塊，標題 + 說明合成一個完整的牌子（不是兩個方塊疊在一起） */
export interface Plaque {
  id: number
  x: number
  y: number
  title: string
  sub?: string
  tone: 'good' | 'bad' | 'ice' | 'gold' | 'virus' | 'info'
  icon: string
  /** stamp：蓋章式（失敗、被擋下）；tag：一般 */
  style: 'stamp' | 'tag'
  /** 停留多久（毫秒） */
  ms: number
}

/** 兩點之間飛行的光點（病毒封包） */
export interface Beam {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  tone: 'virus'
}

/** 出牌演出：牌飛上場中央、射向目標，成功時爆開、失敗時撞碎或燒毀 */
export interface CastSpec {
  card: CardId
  from: { x: number; y: number; scale: number }
  to: { x: number; y: number }
  theme: 'scan' | 'hack' | 'frost' | 'alarm' | 'virus' | 'finish'
  /** ok：成功；blocked：被防護擋下（撞碎）；fizzle：什麼也沒發生（燒掉） */
  outcome: 'ok' | 'blocked' | 'fizzle'
  /** 命中的瞬間呼叫：真正套用牌的效果並播放畫面上的結果 */
  onHit: () => Promise<void>
}

export const castApi: { run: ((spec: CastSpec) => Promise<void>) | null } = { run: null }

export interface BannerState {
  id: number
  text: string
  sub?: string
  tone: 'company' | 'hacker' | 'danger'
}

export const view = reactive({ left: 0, top: 0, scale: 1, w: BASE_W, h: BASE_H })

/** 拖到這條線以上才算「打到場上」 */
export const playLine = () => view.h - HAND_ZONE
/** 手牌扇形的原點（舞台座標） */
export const handOrigin = () => ({ x: view.w / 2, y: view.h })

/** 依視窗大小決定舞台尺寸與縮放 */
export function fitStage(vw: number, vh: number) {
  const sc = Math.min(vw / BASE_W, vh / BASE_H)
  view.scale = sc
  view.w = Math.min(vw / sc, MAX_W)
  view.h = vh / sc
  view.left = (vw - view.w * sc) / 2
  view.top = 0
}

export const game = reactive({
  s: null as GameState | null,
  screen: 'menu' as 'menu' | 'game' | 'review' | 'quiz',
  quizKind: 'pre' as 'pre' | 'post',
  scenario: 'factory' as ScenarioId,
  mission: null as MissionId | null,
})

export const ui = reactive({
  drag: null as DragState | null,
  playing: null as { uid: number; x: number; y: number } | null,
  recycling: null as number | null,
  hoverCard: null as number | null,
  hoverNode: null as string | null,
  hoverAlert: false,
  nodeFx: {} as Record<string, string>,
  slotFx: {} as Record<string, string>,
  banner: null as BannerState | null,
  floaters: [] as Floater[],
  plaques: [] as Plaque[],
  beams: [] as Beam[],
  toast: null as { id: number; text: string } | null,
  busy: false,
  speed: 1,
  apShake: 0,
  alertShake: 0,
  intro: false,
  result: null as null | 'win' | 'lose',
  resultShown: false,
  muted: sfx.isMuted(),
  freshCards: [] as number[],
  help: false,
  menuOpen: false,
  /** 第一次遊玩的導覽步驟（null 代表不顯示） */
  coach: null as number | null,
})

/** 遊戲是否已經結束（避免型別縮窄誤判） */
function isOver(s: GameState): boolean {
  return (s.phase as GameState['phase']) === 'over'
}

// ───────────────────────── 座標工具 ─────────────────────────

export function toStage(cx: number, cy: number) {
  return { x: (cx - view.left) / view.scale, y: (cy - view.top) / view.scale }
}

function toRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  const x = (r.left - view.left) / view.scale
  const y = (r.top - view.top) / view.scale
  const w = r.width / view.scale
  const h = r.height / view.scale
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 }
}

const nodeEls = new Map<string, HTMLElement>()
const anchorEls = new Map<string, HTMLElement>()

export function registerNode(id: string, el: HTMLElement | null) {
  if (el) nodeEls.set(id, el)
  else nodeEls.delete(id)
}
export function registerAnchor(name: string, el: HTMLElement | null) {
  if (el) anchorEls.set(name, el)
  else anchorEls.delete(name)
}
export function nodeRect(id: string): Rect | null {
  const el = nodeEls.get(id)
  return el ? toRect(el) : null
}
export function anchorRect(name: string): Rect | null {
  const el = anchorEls.get(name)
  return el ? toRect(el) : null
}

// ───────────────────────── 時間與特效 ─────────────────────────

export const wait = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, Math.max(0, ms / ui.speed)))

let uidSeq = 1
const nextId = () => uidSeq++

export function float(x: number, y: number, text: string, tone: Floater['tone'] = 'info', icon?: string) {
  const f: Floater = { id: nextId(), x, y, text, tone, icon }
  ui.floaters.push(f)
  setTimeout(() => {
    const i = ui.floaters.findIndex((o) => o.id === f.id)
    if (i >= 0) ui.floaters.splice(i, 1)
  }, 1500)
}

/** 在節點旁放一塊結果銘牌；附近已經有牌子就往下錯開，避免疊在一起 */
export function plaque(x: number, y: number, p: Omit<Plaque, 'id' | 'x' | 'y' | 'style' | 'ms'> & { style?: Plaque['style'] }, ms = 2000) {
  let yy = y
  for (let k = 0; k < 4; k++) {
    const hit = ui.plaques.some((o) => Math.abs(o.x - x) < 300 && Math.abs(o.y - yy) < 92)
    if (!hit) break
    yy += 96
  }
  const item: Plaque = { id: nextId(), x, y: yy, style: 'tag', ms, ...p }
  ui.plaques.push(item)
  setTimeout(() => {
    const i = ui.plaques.findIndex((o) => o.id === item.id)
    if (i >= 0) ui.plaques.splice(i, 1)
  }, ms)
}

/** 放一顆從 A 飛到 B 的光點 */
export function beam(x1: number, y1: number, x2: number, y2: number) {
  const b: Beam = { id: nextId(), x1, y1, x2, y2, tone: 'virus' }
  ui.beams.push(b)
  setTimeout(() => {
    const i = ui.beams.findIndex((o) => o.id === b.id)
    if (i >= 0) ui.beams.splice(i, 1)
  }, 1200)
}

/** 節點上第 idx 格的大概位置（舞台座標） */
export function slotPos(nodeId: string, idx: number): { x: number; y: number } | null {
  const r = nodeRect(nodeId)
  if (!r) return null
  return { x: r.cx, y: r.y + 82 + idx * 38 + 16 }
}

const fxTokens: Record<string, number> = {}
export function flashNode(id: string, fx: string, ms = 1000) {
  ui.nodeFx[id] = fx
  const tok = nextId()
  fxTokens['n' + id] = tok
  setTimeout(() => {
    if (fxTokens['n' + id] === tok) delete ui.nodeFx[id]
  }, ms)
}
export function flashSlot(id: string, idx: number, fx: string, ms = 1100) {
  const k = id + ':' + idx
  ui.slotFx[k] = fx
  const tok = nextId()
  fxTokens['s' + k] = tok
  setTimeout(() => {
    if (fxTokens['s' + k] === tok) delete ui.slotFx[k]
  }, ms)
}

let toastTimer = 0
export function toast(text: string) {
  ui.toast = { id: nextId(), text }
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (ui.toast = null), 1800)
}

async function showBanner(text: string, tone: BannerState['tone'], sub?: string, ms = 1100) {
  const id = nextId()
  ui.banner = { id, text, tone, sub }
  sfx.banner()
  await wait(ms)
  if (ui.banner?.id === id) ui.banner = null
}

// ───────────────────────── 開局與流程 ─────────────────────────

/** 開始新的一局：企業情境與任務都是隨機抽的 */
export function startGame() {
  sfx.unlock()
  const scenario = SCENARIO_IDS[Math.floor(Math.random() * SCENARIO_IDS.length)] as ScenarioId
  game.scenario = scenario
  game.mission = null
  const s = E.newGame({ scenario })
  game.s = s
  game.screen = 'game'
  ui.result = null
  ui.resultShown = false
  ui.drag = null
  ui.playing = null
  ui.recycling = null
  ui.hoverCard = null
  ui.hoverNode = null
  ui.nodeFx = {}
  ui.slotFx = {}
  ui.floaters = []
  ui.plaques = []
  ui.beams = []
  ui.banner = null
  ui.speed = 1
  ui.coach = null
  ui.busy = true
  ui.intro = true
  ui.freshCards = game.s.hand.map((c) => c.uid)
}

/** 玩家看完開場劇本、按下「開始」之後才發牌 */
export function confirmIntro() {
  if (!ui.intro) return
  ui.intro = false
  ui.speed = 1
  sfx.yourTurn()
  void (async () => {
    await wait(450)
    const uids = game.s!.hand.map((c) => c.uid)
    uids.forEach((uid, i) =>
      setTimeout(() => {
        sfx.draw()
        ui.freshCards = ui.freshCards.filter((u) => u !== uid)
      }, i * 120),
    )
    await wait(uids.length * 120 + 600)
    ui.freshCards = []
    ui.busy = false
    if (!coachSeen()) ui.coach = 0
  })()
}

function coachSeen(): boolean {
  try {
    return localStorage.getItem('csg-coach') === '1'
  } catch {
    return true
  }
}

export function backToMenu() {
  game.screen = 'menu'
  ui.busy = false
  ui.speed = 1
}

export function playerHasMoves(s: GameState): boolean {
  return s.hand.some((c) => {
    const pb = E.playability(s, c.id)
    return pb.affordable && pb.status !== 'dead'
  })
}

/** 為什麼這張牌現在打不出去（給提示用） */
export function deadReason(s: GameState, id: CardId): string {
  const infra = E.node(s, 'infra')
  const db = E.node(s, 'db')
  const ai = E.node(s, 'ai')
  const boss = E.node(s, 'boss')
  switch (id) {
    case 'virus':
      return infra.virus ? '病毒已經在運作' : '需要先控制基礎設施'
    case 'alarm':
    case 'wipe':
      return infra.controlled ? '對方已經癱瘓了' : '需要先控制基礎設施'
    case 'ransom':
      return '需要先控制資料庫'
    case 'exfil':
      return '需要先控制 AI 助理'
    case 'wreck':
      return infra.controlled ? 'IT 管理員還能應變：先控制他，或同回合癱瘓他' : '需要先控制基礎設施'
    case 'bec':
      return boss.controlled ? '沒有可能受騙的員工' : '需要先控制主管'
    case 'lateral':
      return db.controlled ? '資料庫已經是你的了' : '還碰不到核心層'
    case 'brute':
    case 'exploit':
    case 'usb':
      return infra.controlled ? '基礎設施已經是你的了' : '碰不到基礎設施，或已確認沒有可用的弱點'
    case 'inject':
    case 'skill':
      return ai.controlled ? 'AI 助理已經是你的了' : '已確認沒有可用的弱點'
    case 'scan':
    case 'ally':
    case 'osint':
    case 'smooth':
      return '已經沒有蓋著的牌可以揭露'
    default:
      return '已確認沒有可利用的弱點'
  }
}

// ───────────────────────── 拖曳出牌 ─────────────────────────

function pointerNode(cx: number, cy: number): string | null {
  for (const [id, el] of nodeEls) {
    const r = el.getBoundingClientRect()
    if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return id
  }
  return null
}
function pointerOnPile(cx: number, cy: number): boolean {
  const el = anchorEls.get('pile')
  if (!el) return false
  const r = el.getBoundingClientRect()
  const pad = 14 * view.scale
  return cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad
}

function updateDrag(ev: PointerEvent) {
  const d = ui.drag
  const s = game.s
  if (!d || !s) return
  const p = toStage(ev.clientX, ev.clientY)
  d.x = p.x
  d.y = p.y
  if (!d.moved && Math.hypot(d.x - d.sx, d.y - d.sy) > 8) {
    d.moved = true
    sfx.pick()
  }
  d.overPile = pointerOnPile(ev.clientX, ev.clientY)
  d.overNode = pointerNode(ev.clientX, ev.clientY)
  if (d.mode === 'node') {
    d.tri = d.overNode && d.pb.targets[d.overNode] ? d.pb.targets[d.overNode] : null
  } else {
    d.tri = d.pb.status === 'dead' ? null : d.pb.autoTri
  }
}

function onMove(ev: PointerEvent) {
  updateDrag(ev)
}

function endDragListeners() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onCancel)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('contextmenu', onCtx)
  window.removeEventListener('blur', onCancel)
}

function onCancel() {
  if (ui.drag?.moved) sfx.cancel()
  ui.drag = null
  endDragListeners()
}
function onKey(ev: KeyboardEvent) {
  if (ev.key === 'Escape') onCancel()
}
function onCtx(ev: Event) {
  ev.preventDefault()
  onCancel()
}

function onUp(ev: PointerEvent) {
  const d = ui.drag
  const s = game.s
  endDragListeners()
  if (!d || !s) {
    ui.drag = null
    return
  }
  updateDrag(ev)
  ui.drag = null
  if (!d.moved) return
  const inst = s.hand.find((c) => c.uid === d.uid)
  if (!inst) return

  if (d.overPile) {
    void recycle(d.uid)
    return
  }
  const pb = E.playability(s, d.id)
  const overBoard = d.y < playLine()
  if (d.mode === 'node') {
    if (!d.overNode) {
      sfx.cancel()
      return
    }
    if (!pb.targets[d.overNode]) {
      deny(pb.status === 'dead' ? deadReason(s, d.id) : '這個目標不能用')
      return
    }
    if (s.ap < E.cardCost(s, d.id, d.overNode)) return denyAp()
    // 需要選目標的牌：放開前停在場下方中央
    void commitPlay(d.uid, d.overNode, { x: view.w / 2, y: view.h - 250, scale: 0.8 })
  } else {
    if (!overBoard) {
      sfx.cancel()
      return
    }
    if (pb.status === 'dead') return deny(deadReason(s, d.id))
    if (!pb.affordable) return denyAp()
    void commitPlay(d.uid, undefined, { x: d.x, y: d.y, scale: d.y < playLine() ? 0.82 : 0.9 })
  }
}

function deny(text: string) {
  sfx.deny()
  toast(text)
}
function denyAp() {
  sfx.deny()
  ui.apShake++
  toast('行動點不足')
}

export function pointerDownCard(uid: number, ev: PointerEvent) {
  const s = game.s
  if (!s || ui.busy || s.phase !== 'hacker' || ev.button !== 0) return
  const inst = s.hand.find((c) => c.uid === uid)
  if (!inst) return
  sfx.unlock()
  const p = toStage(ev.clientX, ev.clientY)
  const pb = E.playability(s, inst.id)
  ui.drag = {
    uid,
    id: inst.id,
    mode: CARDS[inst.id].targeting,
    x: p.x,
    y: p.y,
    sx: p.x,
    sy: p.y,
    moved: false,
    overNode: null,
    overPile: false,
    tri: null,
    pb,
  }
  ui.hoverCard = null
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
  window.addEventListener('contextmenu', onCtx)
  window.addEventListener('blur', onCancel)
}

// ───────────────────────── 出牌與演出 ─────────────────────────

/** 萬一出錯，也不能讓畫面卡死在「忙碌中」 */
async function safely(fn: () => Promise<void>) {
  try {
    await fn()
  } catch (e) {
    console.error(e)
    ui.playing = null
    ui.recycling = null
    ui.drag = null
      ui.banner = null
    ui.speed = 1
    ui.busy = !!game.s && game.s.phase === 'over'
  }
}

const cloneState = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

export function commitPlay(uid: number, targetId?: string, from?: CastSpec['from']) {
  return safely(() => commitPlayInner(uid, targetId, from))
}

/** 這張牌的演出風格 */
function themeOf(id: CardId): CastSpec['theme'] {
  if (id === 'virus') return 'virus'
  if (id === 'alarm') return 'alarm'
  switch (CARDS[id].cat) {
    case 'recon':
      return 'scan'
    case 'finish':
      return 'finish'
    case 'paralyze':
      return 'frost'
    default:
      return 'hack'
  }
}

async function commitPlayInner(uid: number, targetId?: string, from?: CastSpec['from']) {
  const s = game.s
  if (!s) return
  ui.busy = true
  const id = s.hand.find((c) => c.uid === uid)!.id

  // 先在複製的局面上預演一次：結果由局面裡的亂數決定，預演和真正打出去的結果一模一樣。
  // 這樣才能在命中之前就決定要「成功爆開」還是「失敗撞碎／燒掉」；命中之前畫面完全不會洩漏結果。
  const sim = cloneState(s)
  let preview: E.PlayResult | null = null
  try {
    preview = E.playCard(sim, uid, targetId)
  } catch {
    preview = null
  }

  // 飛行的終點：目標節點；不用選目標的牌，飛向它實際影響的節點
  const ef = preview?.effect
  const aimId = targetId ?? ef?.captured[0] ?? ef?.paralyzed ?? ef?.revealed[0]?.node ?? E.hintNodes(s, id)[0] ?? null
  const aimRect = aimId ? nodeRect(aimId) : null
  const tx = aimRect ? aimRect.cx : view.w / 2
  const ty = aimRect ? aimRect.cy : 420

  let outcome: CastSpec['outcome'] = 'ok'
  if (ef && !ef.ok) {
    const hitShield = ef.partial || ef.revealed.some((rv) => sim.nodes.find((n) => n.id === rv.node)?.slots[rv.idx]?.shield)
    outcome = hitShield ? 'blocked' : 'fizzle'
  }

  const alertBefore = s.alert
  ui.playing = { uid, x: tx, y: ty }
  sfx.drop()
  const spec: CastSpec = {
    card: id,
    from: from ?? { x: view.w / 2, y: view.h - 190, scale: 0.8 },
    to: { x: tx, y: ty },
    theme: themeOf(id),
    outcome,
    onHit: async () => {
      const r = E.playCard(s, uid, targetId)
      ui.playing = null
      await presentPlay(r, aimId, alertBefore)
    },
  }
  if (castApi.run) {
    await castApi.run(spec)
  } else {
    await wait(300)
    await spec.onHit()
  }
  ui.playing = null

  if (isOver(s)) {
    await finishGame()
    return
  }
  ui.busy = false
}

/** 一個節點上這次發生的事，濃縮成一塊銘牌 */
type Note = Omit<Plaque, 'id' | 'x' | 'y' | 'ms'>

async function presentPlay(r: E.PlayResult, aimId: string | null, alertBefore: number) {
  const s = game.s!
  const ef = r.effect
  const def = CARDS[r.card]
  const failNode = r.target ?? aimId

  // 這次翻開了什麼（依節點整理）
  const found = new Map<string, string[]>()
  const blocked = new Map<string, string>()
  for (const rv of ef.revealed) {
    const sl = E.node(s, rv.node).slots[rv.idx]
    if (sl.shield) blocked.set(rv.node, VULNS[sl.vuln].shield)
    else found.set(rv.node, [...(found.get(rv.node) ?? []), VULNS[sl.vuln].name])
  }
  const quote = (list: string[]) => list.map((n) => `「${n}」`).join('、')
  const notes = new Map<string, Note>()

  if (ef.ok) {
    if (ef.captured.length) {
      sfx.capture()
      for (const id of ef.captured) {
        flashNode(id, 'capture', 1500)
        const used = found.get(id)
        notes.set(id, { title: '控制!', sub: used ? `利用${quote(used)}` : undefined, tone: 'good', icon: 'skull', style: 'stamp' })
      }
      for (const [id, list] of found) {
        if (!notes.has(id)) notes.set(id, { title: '利用捷徑', sub: quote(list), tone: 'gold', icon: 'door-open', style: 'tag' })
      }
    } else if (def.cat === 'paralyze' && ef.paralyzed) {
      sfx.paralyze()
      flashNode(ef.paralyzed, 'paralyze', 1500)
      notes.set(ef.paralyzed, {
        title: '癱瘓',
        sub: ef.paralyzed === 'it' ? `修復與奪回暫停 ${IT_PARALYZE_TURNS} 回合` : `約 ${BACKUP_RESTORE_TURNS} 回合後才會恢復`,
        tone: 'ice',
        icon: 'snowflake',
        style: 'stamp',
      })
    } else if (ef.virus) {
      sfx.infect()
      flashNode('infra', 'infect', 1900)
      notes.set('infra', { title: '被感染', sub: '病毒開始潛伏，每回合回報一個弱點', tone: 'virus', icon: 'bug', style: 'stamp' })
    } else if (ef.finish) {
      sfx.success()
      const id = aimId ?? 'db'
      notes.set(id, { title: '得手!', tone: 'gold', icon: 'flag', style: 'stamp' })
    } else if (ef.revealed.length) {
      sfx.reveal()
      for (const [id, list] of found) notes.set(id, { title: '發現弱點', sub: quote(list), tone: 'gold', icon: 'scan-eye', style: 'tag' })
    }
  } else if (ef.partial) {
    sfx.fail()
    flashNode('db', 'fail', 1000)
    notes.set('db', { title: '被還原', sub: '公司從備份還原了資料', tone: 'bad', icon: 'database-backup', style: 'stamp' })
  } else {
    sfx.fail()
    if (failNode) flashNode(failNode, 'fail', 1000)
    const gone = new Map<string, string[]>()
    for (const e of ef.excluded) gone.set(e.node, [...(gone.get(e.node) ?? []), E_vulnName(e.vuln)])
    if (failNode) {
      const b = blocked.get(failNode)
      const g = gone.get(failNode)
      notes.set(failNode, {
        title: '失敗',
        sub: b ? `被「${b}」擋下` : g ? `沒有${quote(g)}` : undefined,
        tone: 'bad',
        icon: 'shield-x',
        style: 'stamp',
      })
    }
    for (const [id, b] of blocked) {
      if (!notes.has(id)) notes.set(id, { title: '被擋下', sub: `「${b}」`, tone: 'bad', icon: 'shield-check', style: 'stamp' })
    }
    for (const [id, g] of gone) {
      if (!notes.has(id)) notes.set(id, { title: '排除', sub: `沒有${quote(g)}`, tone: 'info', icon: 'eye-off', style: 'tag' })
    }
  }

  for (const rv of ef.revealed) flashSlot(rv.node, rv.idx, 'reveal')

  if (ef.dry.length > 2) {
    plaque(view.w / 2, 400, { title: '掃描完畢', sub: '整間公司沒有更多弱點了', tone: 'info', icon: 'scan-eye' })
  } else {
    for (const id of ef.dry) {
      if (!notes.has(id)) notes.set(id, { title: '查無更多', sub: '沒有更多可用的弱點', tone: 'info', icon: 'scan-eye', style: 'tag' })
    }
  }

  for (const [id, note] of notes) {
    const rr = nodeRect(id)
    if (rr) plaque(rr.cx, rr.cy - 6, note)
  }

  if (r.refund) {
    ui.apShake++
    const rr = aimId ? nodeRect(aimId) : null
    float(rr?.cx ?? view.w / 2, (rr?.cy ?? 420) + 70, '省下 1 點', 'gold', 'zap')
  }
  if (r.noise > 0) {
    const ar = anchorRect('alert')
    if (ar) float(ar.cx, ar.cy + 50, `+${r.noise}`, 'noise')
    sfx.noiseUp(r.noise)
    ui.alertShake++
  } else if (!r.win && s.alert === alertBefore) {
    /* 沒有噪音 */
  }
  await wait(750)
}

function E_vulnName(v: string) {
  return VULNS[v as keyof typeof VULNS]?.name ?? v
}

// ───────────────────────── 換牌 ─────────────────────────

export function recycle(uid: number) {
  return safely(() => recycleInner(uid))
}

async function recycleInner(uid: number) {
  const s = game.s
  if (!s || ui.busy) return
  if (!E.canRecycle(s)) return denyAp()
  ui.busy = true
  ui.recycling = uid
  sfx.drop()
  await wait(280)
  const fresh = E.recycleCard(s, uid)
  ui.recycling = null
  if (fresh) {
    ui.freshCards = [fresh.uid]
    sfx.draw()
    await wait(500)
    ui.freshCards = []
  }
  ui.busy = false
}

// ───────────────────────── 結束回合：公司的倒數往前走 ─────────────────────────

export function endTurn() {
  return safely(endTurnInner)
}

async function endTurnInner() {
  const s = game.s
  if (!s || ui.busy || s.phase !== 'hacker') return
  ui.busy = true
  ui.drag = null
  ui.hoverCard = null
  sfx.endTurn()
  ui.speed = 1
  await wait(350)

  const gen = E.endOfTurn(s)
  let step = gen.next()
  while (!step.done) {
    await presentStep(step.value)
    if (isOver(s)) break
    step = gen.next()
  }
  ui.speed = 1
  if (isOver(s)) {
    await finishGame()
    return
  }
  const before = new Set(s.hand.map((c) => c.uid))
  E.startHackerTurn(s)
  ui.freshCards = s.hand.filter((c) => !before.has(c.uid)).map((c) => c.uid)
  await showBanner('你的回合', 'hacker', undefined, 700)
  ui.freshCards.forEach((_, i) => setTimeout(() => sfx.draw(), i * 110))
  await wait(700)
  ui.freshCards = []
  ui.busy = false
}

async function presentStep(step: StepOutcome) {
  const s = game.s!
  switch (step.t) {
    case 'frozen': {
      const it = nodeRect('it')
      if (it) {
        plaque(it.cx, it.cy - 6, {
          title: step.both ? '公司全面停擺' : '修復暫停',
          sub: step.both ? 'IT 管理員被癱瘓：修復與奪回都停了' : 'IT 管理員被你控制',
          tone: 'ice',
          icon: 'snowflake',
          style: 'tag',
        })
      }
      sfx.paralyze()
      await wait(750)
      break
    }
    case 'repair': {
      sfx.patch()
      flashSlot(step.node, step.idx, 'patch', 1800)
      const rr = nodeRect(step.node)
      if (rr) plaque(rr.cx, rr.cy - 6, { title: '被修復', sub: `「${E_vulnName(step.vuln)}」`, tone: 'bad', icon: 'wrench', style: 'stamp' })
      await wait(600)
      await showBanner('弱點被修復', 'company', step.name, 1000)
      await wait(500)
      break
    }
    case 'restore': {
      sfx.patch()
      flashNode('backup', 'restore', 1400)
      const rr = nodeRect('backup')
      if (rr) plaque(rr.cx, rr.cy - 6, { title: '備份恢復', sub: '備份又能正常運作了', tone: 'bad', icon: 'database-backup', style: 'stamp' })
      await wait(1300)
      break
    }
    case 'recapture': {
      sfx.recapture()
      flashNode(step.node, 'recapture', 1600)
      const rr = nodeRect(step.node)
      if (rr) plaque(rr.cx, rr.cy - 6, { title: '被奪回', sub: step.name, tone: 'bad', icon: 'shield-alert', style: 'stamp' })
      if (step.patched) flashSlot(step.patched.node, step.patched.idx, 'patch', 1800)
      await wait(600)
      await showBanner('節點被奪回', 'danger', step.name, 1100)
      await wait(500)
      break
    }
    case 'standing': {
      if (step.revealed.length) {
        // 病毒觸發：基礎設施先脈動一下 → 封包飛向被翻開的弱點 → 該格亮起，並寫出翻到了什麼
        const inf = nodeRect('infra')
        sfx.virusPing()
        flashNode('infra', 'pulse', 1100)
        if (inf) plaque(inf.cx, inf.cy - 6, { title: '病毒觸發', sub: '賽博病毒回報中', tone: 'virus', icon: 'bug', style: 'tag' }, 1500)
        await wait(650)
        for (const r of step.revealed) {
          const sp = slotPos(r.node, r.idx)
          if (inf && sp) beam(inf.cx, inf.cy, sp.x, sp.y)
          await wait(520)
          sfx.reveal()
          flashSlot(r.node, r.idx, 'virus', 1800)
          const sl = E.node(s, r.node).slots[r.idx]
          const rr = nodeRect(r.node)
          if (rr) {
            plaque(
              rr.cx,
              rr.cy - 6,
              { title: '病毒發現', sub: `「${E_vulnName(sl.vuln)}」・${E.node(s, r.node).name}`, tone: 'virus', icon: 'bug', style: 'stamp' },
              1900,
            )
          }
        }
        await wait(950)
      }
      break
    }
    case 'cooldown': {
      if (step.delta < 0) {
        const ar = anchorRect('alert')
        if (ar) float(ar.cx, ar.cy + 50, `${step.delta}`, 'good', 'snowflake')
        sfx.coolDown()
        ui.alertShake++
        await wait(700)
      }
      break
    }
    case 'end':
      break
  }
}

// ───────────────────────── 結束 ─────────────────────────

async function finishGame() {
  const s = game.s!
  ui.result = s.result
  ui.busy = true
  await wait(700)
  if (s.result === 'win') sfx.win()
  else sfx.lose()
  ui.resultShown = true
}

export function openReview() {
  game.screen = 'review'
}

export function openQuiz(kind: 'pre' | 'post') {
  game.quizKind = kind
  game.screen = 'quiz'
}

export function toggleMute() {
  ui.muted = !ui.muted
  sfx.setMuted(ui.muted)
  if (!ui.muted) sfx.click()
}

export function toggleFullscreen() {
  try {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  } catch {
    /* 瀏覽器不允許就算了 */
  }
}

export function fastForward() {
  if (ui.busy && !ui.resultShown && !ui.intro) ui.speed = 4
}

