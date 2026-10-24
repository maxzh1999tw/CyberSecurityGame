// 遊戲畫面的狀態與操作：把規則引擎和動畫串在一起
import { reactive } from 'vue'
import { sfx } from '../audio/sfx'
import { BACKUP_RESTORE_TURNS, CARDS, INFRA_PARALYZE_TURNS, IT_PARALYZE_TURNS, MISSION_IDS, recaptureTurnsOf, SCENARIO_IDS, VULNS } from './data'
import * as E from './engine'
import type { Playability, StepOutcome } from './engine'
import { companyDeadReason, companyPlayability, type DraftState } from './company'
import { COMPANY_CARDS } from './companyData'
import type { CardId, CompanyCardId, GameState, MissionId, ScenarioId, Tri } from './types'

/** 設計基準：高 1080、寬至少 1920；寬螢幕會把舞台往左右延伸，不留黑邊 */
export const BASE_W = 1920
export const BASE_H = 1080
export const MAX_W = 2600
/** 底部手牌區的高度 */
export const HAND_ZONE = 300
/** 左右兩欄的寬度（舞台座標）；中間的棋盤區在兩欄之間 */
export const RAIL_LEFT = 350
export const RAIL_RIGHT = 280

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
  /** 駭客牌或公司牌（公司模式時是公司牌） */
  id: CardId | CompanyCardId
  pointerId: number
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
  /** 說明比較長（例如封死任務的原因）：牌子放寬 */
  wide?: boolean
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
  card: CardId | CompanyCardId
  /** 公司模式打出的公司牌（牌面不同） */
  company?: boolean
  /** 牌面上的費用（公司牌有 IT 折扣時和原價不同） */
  cost?: number
  from: { x: number; y: number; scale: number }
  to: { x: number; y: number }
  theme: 'scan' | 'hack' | 'frost' | 'alarm' | 'virus' | 'finish' | 'support'
  /** ok：成功；blocked：被防護擋下（撞碎）；fizzle：什麼也沒發生（燒掉） */
  outcome: 'ok' | 'blocked' | 'fizzle'
  /** 命中的瞬間呼叫：真正套用牌的效果並播放畫面上的結果 */
  onHit: () => Promise<void>
}

export const castApi: { run: ((spec: CastSpec) => Promise<void>) | null } = { run: null }

/** 公司模式：拖曳放開後交給 companyStore 出牌、換牌（避免兩個模組互相引用） */
export const companyApi: {
  play: ((uid: number, target: string | undefined, from: CastSpec['from']) => void) | null
  recycle: ((uid: number) => void) | null
} = { play: null, recycle: null }

/** 現在輪到誰出牌（駭客模式是駭客，公司模式是公司） */
const playerPhase = (s: GameState) => (s.mode === 'company' ? 'company' : 'hacker')
/** 玩家手上的牌 */
export const playerHand = (s: GameState): Array<{ uid: number; id: CardId | CompanyCardId }> =>
  s.mode === 'company' ? s.company?.hand ?? [] : s.hand
/** 玩家手上某張牌的可行性 */
export function playerPlayability(s: GameState, id: CardId | CompanyCardId): Playability {
  return s.mode === 'company' ? companyPlayability(s, id as CompanyCardId) : E.playability(s, id as CardId)
}

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
/** 棋盤區（兩欄之間）的水平中心：手牌、出牌演出都以它為中心 */
export const boardCenter = () => (RAIL_LEFT + view.w - RAIL_RIGHT) / 2
export const handOrigin = () => ({ x: boardCenter(), y: view.h })

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
  screen: 'menu' as 'menu' | 'game' | 'review' | 'quiz' | 'draft',
  quizKind: 'pre' as 'pre' | 'post',
  scenario: 'factory' as ScenarioId,
  mission: null as MissionId | null,
  /** 公司模式：組建中的公司 */
  draft: null as DraftState | null,
})

export const ui = reactive({
  drag: null as DragState | null,
  playing: null as { uid: number; x: number; y: number } | null,
  recycling: null as number | null,
  hoverCard: null as number | null,
  hoverNode: null as string | null,
  hoverSlot: null as { nodeId: string; idx: number } | null,
  hoverAlert: false,
  nodeFx: {} as Record<string, string>,
  slotFx: {} as Record<string, string>,
  banner: null as BannerState | null,
  floaters: [] as Floater[],
  plaques: [] as Plaque[],
  beams: [] as Beam[],
  toast: null as { id: number; text: string; tone: 'bad' | 'info' } | null,
  busy: false,
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
  /** 公司模式：開業前的開場介紹 */
  companyIntro: false,
  /** 公司模式：駭客這局做過的事（右欄的駭客動態） */
  /** 公司模式右欄的駭客動態；ok 是 null 代表牌還在生效中 */
  hackerLog: [] as Array<{ id: number; turn: number; card: CardId; target: string | null; ok: boolean | null }>,
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
  new Promise<void>((r) => setTimeout(r, Math.max(0, ms)))

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
export function toast(text: string, tone: 'bad' | 'info' = 'bad') {
  ui.toast = { id: nextId(), text, tone }
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (ui.toast = null), 1800)
}

export async function showBanner(text: string, tone: BannerState['tone'], sub?: string, ms = 1100) {
  const id = nextId()
  ui.banner = { id, text, tone, sub }
  sfx.banner()
  await wait(ms)
  if (ui.banner?.id === id) ui.banner = null
}

// ───────────────────────── 開局與流程 ─────────────────────────

/** 開始新的一局：企業情境與任務都是隨機抽的（開場介紹時還能再換） */
export function startGame() {
  sfx.unlock()
  const scenario = SCENARIO_IDS[Math.floor(Math.random() * SCENARIO_IDS.length)] as ScenarioId
  dealGame(scenario)
}

/** 開場介紹時，用上下箭頭換目標企業或任務：照新的組合重新發一局 */
export function cycleIntro(kind: 'scenario' | 'mission', step: 1 | -1) {
  const s = game.s
  if (!s || !ui.intro) return
  const wrap = <T>(list: readonly T[], cur: T) => list[(list.indexOf(cur) + step + list.length) % list.length]
  sfx.pick()
  if (kind === 'scenario') dealGame(wrap(SCENARIO_IDS, s.scenario), s.mission)
  else dealGame(s.scenario, wrap(MISSION_IDS, s.mission))
}

function dealGame(scenario: ScenarioId, mission?: MissionId) {
  game.scenario = scenario
  game.mission = mission ?? null
  const s = E.newGame({ scenario, mission })
  game.s = s
  game.screen = 'game'
  resetBoardUi()
  ui.intro = true
  ui.freshCards = game.s.hand.map((c) => c.uid)
}

/** 開新局時清掉上一局留下的畫面狀態 */
export function resetBoardUi() {
  ui.result = null
  ui.resultShown = false
  ui.drag = null
  ui.playing = null
  ui.recycling = null
  ui.hoverCard = null
  ui.hoverNode = null
  ui.hoverSlot = null
  ui.nodeFx = {}
  ui.slotFx = {}
  ui.floaters = []
  ui.plaques = []
  ui.beams = []
  ui.banner = null
  ui.coach = null
  ui.busy = true
  ui.hackerLog = []
}

/** 玩家看完開場劇本、按下「開始」之後才發牌 */
export function confirmIntro() {
  if (!ui.intro) return
  ui.intro = false
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
    if (!coachSeen('hacker')) ui.coach = 0
  })()
}

/**
 * 回合開始的發牌：新抽的牌要在畫出來之前就標成 freshCards（先待在牌庫），
 * 原本的手牌往左讓位（約 .28 秒）之後，新牌就一張接一張飛進來。
 */
export async function dealFresh() {
  const uids = [...ui.freshCards]
  if (!uids.length) return
  await wait(280)
  uids.forEach((uid, i) =>
    setTimeout(() => {
      sfx.draw()
      ui.freshCards = ui.freshCards.filter((u) => u !== uid)
    }, i * 120),
  )
  await wait(uids.length * 120 + 300)
  ui.freshCards = []
}

/** 第一次導覽看過了沒（駭客模式、公司模式、組建公司分開記） */
export type CoachMode = 'hacker' | 'company' | 'recruit'
export const coachKey = (mode: CoachMode) => (mode === 'hacker' ? 'csg-coach' : `csg-coach-${mode}`)
export function coachSeen(mode: CoachMode): boolean {
  try {
    return localStorage.getItem(coachKey(mode)) === '1'
  } catch {
    return true
  }
}

export function backToMenu() {
  game.screen = 'menu'
  ui.busy = false
}

export function playerHasMoves(s: GameState): boolean {
  return s.hand.some((c) => {
    const pb = E.playability(s, c.id)
    return pb.affordable && pb.status !== 'dead'
  })
}

/** 為什麼這張牌現在打不出去（給提示用） */
export function deadReason(s: GameState, id: CardId): string {
  const allDb = E.dbAccess(s)
  const infraCtrl = E.infraCtrl(s)
  const execCtrl = E.execCtrl(s)
  // 還沒開放的基礎設施／AI：指定目標的牌會被層級擋住
  const infraOpen = E.infras(s).some((n) => E.reachKnown(s, n) === 'Y')
  const canReveal = (n: (typeof s.nodes)[number]) => E.canRecon(s, n) && !n.sealed && E.hiddenIdx(n).length > 0
  const hasLockedReveal = (onlyEmployees = false) =>
    s.nodes.some((n) => (!onlyEmployees || E.isEmployee(n)) && !E.canRecon(s, n) && !n.sealed && E.hiddenIdx(n).length > 0)
  const revealReason = (onlyEmployees = false) => {
    if (s.nodes.some((n) => (!onlyEmployees || E.isEmployee(n)) && canReveal(n))) return '已經沒有可偵查的目標'
    return hasLockedReveal(onlyEmployees)
      ? '弱點所在層尚未開放偵查；先控制前一層節點'
      : '已經沒有蓋著的牌可以揭露'
  }
  switch (id) {
    case 'virus':
      if (!infraCtrl) return '需要先控制基礎設施與任一員工'
      return E.infras(s).every((n) => !n.controlled || n.virus) ? '已控制的基礎設施都已經有病毒在運作' : '需要先控制任一員工'
    case 'alarm':
      return E.its(s).every((n) => n.paralyzed > 1) ? 'IT 仍在癱瘓中' : '需要基礎設施與員工入口，請查看牌面前置條件'
    case 'wipe':
      return E.backups(s).every((n) => n.paralyzed > 0) ? '備份已經癱瘓' : '尚未取得破壞備份所需的入口或權限，請查看牌面條件'
    case 'ransom':
      return allDb ? '還有備份可以還原；讓所有備份失效、受控或癱瘓' : '需要先控制所有資料庫'
    case 'exfil':
      return '需要先控制一名員工與所有資料庫'
    case 'wreck':
      return infraCtrl ? 'IT 還能應變：先控制他，或同回合癱瘓他' : '需要先控制基礎設施'
    case 'bec':
      if (!infraCtrl && !execCtrl) return '需要先控制基礎設施與主管級員工'
      if (!infraCtrl) return '需要先控制基礎設施'
      if (!execCtrl) return '需要先控制主管級員工'
      return '沒有可攻擊且有「好騙」弱點的員工'
    case 'lateral':
      return '選擇已控制節點；同層或下方一層須有未控制節點'
    case 'brute':
    case 'exploit':
    case 'cred':
      return '目前沒有可攻擊且符合弱點條件的目標；先建立入口或尋找其他目標'
    case 'usb':
      if (!infraOpen) return '基礎設施尚未開放；先控制外圍節點或揭露通往它的捷徑'
      return '需要先控制員工，或嘗試可接觸且離席未鎖屏的員工端'
    case 'tail':
      if (!infraOpen) return '基礎設施尚未開放；先控制外圍節點或揭露通往它的捷徑'
      return `可接觸的員工都沒有「${VULNS.kind.name}」弱點`
    case 'inject':
      return `需要控制 IT，或可攻擊的 AI 有「${VULNS.obey.name}」／「${VULNS.nohuman.name}」弱點`
    case 'skill':
      return `需要控制員工，或可攻擊的 AI 有「${VULNS.selfupd.name}」弱點`
    case 'scan':
      return revealReason()
    case 'osint':
      return revealReason(true)
    case 'smooth': {
      const hasControlledEmployee = s.nodes.some((n) => E.isEmployee(n) && n.controlled)
      const reconEmployees = s.nodes.filter(
        (n) => E.isEmployee(n) && E.canRecon(s, n) && !n.sealed && E.hiddenIdx(n).length > 0,
      )
      if (hasControlledEmployee || reconEmployees.length === 0) return revealReason(true)
      return `可偵查員工都沒有「${VULNS.gullible.name}」或「${VULNS.oversharer.name}」弱點`
    }
    case 'ally':
      return E.ais(s).some((n) => !E.canRecon(s, n) && !n.sealed && E.hiddenIdx(n).length > 0)
        ? 'AI 所在層尚未開放偵查；先控制前一層節點'
        : '已經沒有蓋著的牌可以揭露'
    case 'wipelog':
    case 'proxy':
      return '警戒值已經是 0'
    case 'darkweb':
      return '牌堆已經沒有牌可以抽'
    case 'stash':
      return '這回合已經囤積過了'
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
  if (ui.drag && ev.pointerId !== ui.drag.pointerId) return
  updateDrag(ev)
}

function endDragListeners() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onCancel)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('contextmenu', onCtx)
  window.removeEventListener('blur', onBlur)
}

function onCancel(ev?: PointerEvent) {
  if (ev && ui.drag && ev.pointerId !== ui.drag.pointerId) return
  if (ui.drag?.moved) sfx.cancel()
  ui.drag = null
  endDragListeners()
}
function onBlur() {
  onCancel()
}
export function cancelPointerDrag() {
  onCancel()
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
  if (d && ev.pointerId !== d.pointerId) return
  const s = game.s
  endDragListeners()
  if (!d || !s) {
    ui.drag = null
    return
  }
  updateDrag(ev)
  ui.drag = null
  if (!d.moved) return
  const inst = playerHand(s).find((c) => c.uid === d.uid)
  if (!inst) return

  if (s.mode === 'company') return dropCompanyCard(s, d)
  if (d.overPile) {
    void recycle(d.uid)
    return
  }
  const pb = E.playability(s, d.id as CardId)
  const overBoard = d.y < playLine()
  if (d.mode === 'node') {
    if (!d.overNode) {
      sfx.cancel()
      return
    }
    if (!pb.targets[d.overNode]) {
      if (E.reachKnown(s, E.node(s, d.overNode)) !== 'Y') {
        deny('目標尚未解鎖，請先建立入口')
        return
      }
      deny(pb.status === 'dead' ? deadReason(s, d.id as CardId) : '這個目標不能用')
      return
    }
    if (s.ap < E.cardCost(s, d.id as CardId, d.overNode)) return denyAp()
    // 需要選目標的牌：放開前停在場下方中央
    void commitPlay(d.uid, d.overNode, { x: boardCenter(), y: view.h - 250, scale: 0.8 })
  } else {
    if (!overBoard) {
      sfx.cancel()
      return
    }
    if (pb.status === 'dead') return deny(deadReason(s, d.id as CardId))
    if (!pb.affordable) return denyAp()
    void commitPlay(d.uid, undefined, { x: d.x, y: d.y, scale: d.y < playLine() ? 0.82 : 0.9 })
  }
}

/** 公司牌放開：拖到換牌區換牌、拖到節點或場上出牌（和駭客牌同樣的操作） */
function dropCompanyCard(s: GameState, d: DragState) {
  const id = d.id as CompanyCardId
  if (d.overPile) {
    companyApi.recycle?.(d.uid)
    return
  }
  const pb = companyPlayability(s, id)
  if (d.mode === 'node') {
    if (!d.overNode) {
      sfx.cancel()
      return
    }
    if (pb.status === 'dead') return deny(companyDeadReason(s, id))
    if (!pb.targets[d.overNode]) return deny(`「${COMPANY_CARDS[id].name}」不能用在${E.node(s, d.overNode).name}`)
    companyApi.play?.(d.uid, d.overNode, { x: boardCenter(), y: view.h - 250, scale: 0.8 })
    return
  }
  if (d.y >= playLine()) {
    sfx.cancel()
    return
  }
  if (pb.status === 'dead') return deny(companyDeadReason(s, id))
  companyApi.play?.(d.uid, undefined, { x: d.x, y: d.y, scale: 0.82 })
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

export function pointerDownCard(uid: number, ev: PointerEvent, current: PointerEvent = ev) {
  const s = game.s
  if (!s || ui.busy || s.phase !== playerPhase(s) || ev.button !== 0) return
  const inst = playerHand(s).find((c) => c.uid === uid)
  if (!inst) return
  sfx.unlock()
  const start = toStage(ev.clientX, ev.clientY)
  const p = toStage(current.clientX, current.clientY)
  const pb = playerPlayability(s, inst.id)
  const mode: DragState['mode'] =
    s.mode === 'company' ? (COMPANY_CARDS[inst.id as CompanyCardId].target ? 'node' : 'auto') : CARDS[inst.id as CardId].targeting
  ui.drag = {
    uid,
    id: inst.id,
    pointerId: ev.pointerId,
    mode,
    x: p.x,
    y: p.y,
    sx: start.x,
    sy: start.y,
    moved: false,
    overNode: null,
    overPile: false,
    tri: null,
    pb,
  }
  ui.hoverCard = null
  ui.hoverNode = null
  ui.hoverSlot = null
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
  window.addEventListener('contextmenu', onCtx)
  window.addEventListener('blur', onBlur)
  if (current.clientX !== ev.clientX || current.clientY !== ev.clientY) updateDrag(current)
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
    case 'support':
      return 'support'
    default:
      return 'hack'
  }
}

/** 資源管理牌飛向畫面上的哪個位置 */
const SUPPORT_AIM: Partial<Record<CardId, string>> = {
  wipelog: 'alert',
  proxy: 'alert',
  darkweb: 'deck',
  energy: 'ap',
  stash: 'ap',
}
/** 公司模式：右下角是公司自己的牌堆，駭客的支援牌改飛向右上角駭客的資訊（手牌、行動點） */
const HACKER_AIM: Record<string, string> = { deck: 'hackerDeck', ap: 'hackerAp' }
const aimAnchor = (s: GameState, id: CardId) => {
  const a = SUPPORT_AIM[id]
  return a && s.mode === 'company' ? HACKER_AIM[a] ?? a : a
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
  const aim = aimAnchor(s, id)
  const aimRect = aim ? anchorRect(aim) : aimId ? nodeRect(aimId) : null
  const tx = aimRect ? aimRect.cx : boardCenter()
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
    from: from ?? { x: boardCenter(), y: view.h - 190, scale: 0.8 },
    to: { x: tx, y: ty },
    theme: id === 'tail' && ef?.paralyzed ? 'frost' : themeOf(id),
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

/**
 * 公司模式從公司的角度看駭客那一方的事件：駭客成功（控制、得手、利用捷徑）是紅色警報，
 * 駭客失敗、公司修好或奪回是綠色。駭客模式維持原樣。
 */
const COMPANY_TITLE: Record<string, string> = {
  '控制!': '被入侵!',
  '控制延長': '入侵延長',
  '利用捷徑': '被抄捷徑',
  '癱瘓': '被癱瘓',
  '得手!': '駭客得手!',
  '發現弱點': '弱點曝光',
  '被還原': '從備份還原',
  '失敗': '擋下攻擊',
  '被擋下': '防護擋下',
  '被修復': '修補完成',
  '被奪回': '奪回控制',
}
function hackerPlaque(x: number, y: number, p: Parameters<typeof plaque>[2], ms?: number) {
  if (game.s?.mode === 'company') {
    const tone: Plaque['tone'] = p.tone === 'good' || p.tone === 'gold' ? 'bad' : p.tone === 'bad' ? 'good' : p.tone
    p = { ...p, title: COMPANY_TITLE[p.title] ?? p.title, tone }
  }
  plaque(x, y, p, ms)
}

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
      if (r.card === 'lateral' && r.target) {
        const source = nodeRect(r.target)
        for (const id of ef.captured) {
          const destination = nodeRect(id)
          if (source && destination) beam(source.cx, source.cy, destination.cx, destination.cy)
        }
        await wait(420)
      }
      sfx.capture()
      const extended = new Set(ef.extended)
      for (const id of ef.captured) {
        flashNode(id, 'capture', 1500)
        const used = found.get(id)
        notes.set(id, extended.has(id)
          ? { title: '控制延長', sub: `倒數 +${recaptureTurnsOf(E.node(s, id).role)}`, tone: 'good', icon: 'skull', style: 'stamp' }
          : { title: '控制!', sub: used ? `利用${quote(used)}` : undefined, tone: 'good', icon: 'skull', style: 'stamp' })
      }
      for (const [id, list] of found) {
        if (!notes.has(id)) notes.set(id, { title: '利用捷徑', sub: quote(list), tone: 'gold', icon: 'door-open', style: 'tag' })
      }
    } else if (ef.paralyzed) {
      sfx.paralyze()
      flashNode(ef.paralyzed, 'paralyze', 1500)
      const role = E.node(s, ef.paralyzed).role
      notes.set(ef.paralyzed, {
        title: role === 'infra' ? '網路中斷' : '癱瘓',
        sub: role === 'it'
          ? `修復與奪回暫停 ${IT_PARALYZE_TURNS} 回合`
          : role === 'infra'
            ? `修復與奪回暫停 ${INFRA_PARALYZE_TURNS} 回合`
            : `約 ${BACKUP_RESTORE_TURNS} 回合後才會恢復`,
        tone: 'ice',
        icon: 'snowflake',
        style: 'stamp',
      })
    } else if (ef.virus) {
      sfx.infect()
      const infected = r.target ?? 'infra'
      flashNode(infected, 'infect', 1900)
      notes.set(infected, { title: '被感染', sub: '病毒開始潛伏，每回合回報一個弱點', tone: 'virus', icon: 'bug', style: 'stamp' })
    } else if (ef.finish) {
      sfx.success()
      const id = aimId ?? E.dbs(s)[0]?.id ?? ''
      notes.set(id, { title: '得手!', tone: 'gold', icon: 'flag', style: 'stamp' })
    } else if (def.cat === 'support') {
      await presentSupport(r)
    } else if (ef.revealed.length) {
      sfx.reveal()
      for (const [id, list] of found) notes.set(id, { title: '發現弱點', sub: quote(list), tone: 'gold', icon: 'scan-eye', style: 'tag' })
    }
  } else if (ef.partial) {
    sfx.fail()
    const restored = E.dbs(s)[0]?.id ?? ''
    flashNode(restored, 'fail', 1000)
    notes.set(restored, { title: '被還原', sub: '公司從備份還原了資料', tone: 'bad', icon: 'database-backup', style: 'stamp' })
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

  // 完全沒有弱點的節點：蓋著的牌其中一張翻成「無懈可擊」
  for (const id of ef.dry) {
    const n = E.node(s, id)
    if (!E.isImpregnable(n)) continue
    const at = n.slots.findIndex((sl) => sl.vis === 0)
    if (at >= 0) flashSlot(id, at, 'reveal', 1400)
  }
  if (ef.dry.length > 2) {
    hackerPlaque(boardCenter(), 400, { title: '掃描完畢', sub: '整間公司沒有更多弱點了', tone: 'info', icon: 'scan-eye' })
  } else {
    for (const id of ef.dry) {
      if (notes.has(id)) continue
      notes.set(
        id,
        E.isImpregnable(E.node(s, id))
          ? { title: '無懈可擊', sub: '這裡沒有任何可利用的弱點', tone: 'ice', icon: 'shield-check', style: 'stamp' }
          : { title: '查無更多', sub: '沒有更多可用的弱點', tone: 'info', icon: 'scan-eye', style: 'tag' },
      )
    }
  }

  for (const [id, note] of notes) {
    const rr = nodeRect(id)
    if (rr) hackerPlaque(rr.cx, rr.cy - 6, note)
  }

  if (r.refund) {
    ui.apShake++
    const rr = aimId ? nodeRect(aimId) : null
    float(rr?.cx ?? boardCenter(), (rr?.cy ?? 420) + 70, '省下 1 點', s.mode === 'company' ? 'bad' : 'gold', 'zap')
  }
  if (r.noise > 0) {
    const ar = anchorRect('alert')
    if (ar) float(ar.cx, ar.cy + 50, `+${r.noise}`, s.mode === 'company' ? 'good' : 'noise')
    sfx.noiseUp(r.noise)
    ui.alertShake++
  } else if (!r.win && s.alert === alertBefore) {
    /* 沒有噪音 */
  }
  await wait(750)
}

/** 資源管理牌的結果：在對應的位置（警戒條、行動點、牌堆）旁放銘牌 */
async function presentSupport(r: E.PlayResult) {
  const ef = r.effect
  const where = game.s ? aimAnchor(game.s, r.card) : SUPPORT_AIM[r.card]
  const ar = where ? anchorRect(where) : null
  const x = Math.max(340, Math.min(view.w - 340, ar?.cx ?? boardCenter()))
  const y = ar?.cy ?? 420
  switch (r.card) {
    case 'wipelog':
    case 'proxy':
      sfx.coolDown()
      ui.alertShake++
      hackerPlaque(x, y + 92, {
        title: `警戒 ${ef.alertDelta}`,
        sub: r.card === 'wipelog' ? '日誌被清掉了' : '追查的人迷路了',
        tone: 'ice',
        icon: CARDS[r.card].icon,
        style: 'stamp',
      })
      break
    case 'darkweb': {
      const n = ef.drawn.length
      hackerPlaque(x, y - 96, {
        title: n ? `抽 ${n} 張` : '沒有抽到牌',
        sub: n < 2 ? `手牌最多 ${E.HAND_MAX} 張` : undefined,
        tone: 'gold',
        icon: 'package-search',
        style: 'tag',
      })
      if (n) {
        // 新抽到的牌從牌堆飛進手牌
        ui.freshCards = ef.drawn.map((c) => c.uid)
        ef.drawn.forEach((_, i) => setTimeout(() => sfx.draw(), i * 110))
        await wait(650)
        ui.freshCards = []
      }
      break
    }
    case 'energy':
      sfx.success()
      ui.apShake++
      hackerPlaque(x, y - 96, { title: '行動點 +2', sub: '本回合', tone: 'good', icon: 'coffee', style: 'stamp' })
      break
    case 'stash':
      sfx.reveal()
      ui.apShake++
      hackerPlaque(x, y - 96, {
        title: '保留上限 4',
        sub: '回合結束最多保留 4 點行動點',
        tone: 'gold',
        icon: 'piggy-bank',
        style: 'tag',
      })
      break
  }
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
  const inst = s.hand.find((c) => c.uid === uid)
  if (!inst) return
  if (E.isMissionCard(s, inst.id)) return deny('任務關鍵牌已保留，不能換掉；達成條件後即可打出')
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
  if (!E.canEndTurn(s)) return deny('首回合請先出牌或換牌')
  ui.busy = true
  ui.drag = null
  ui.hoverCard = null
  ui.hoverNode = null
  ui.hoverSlot = null
  sfx.endTurn()
  await wait(350)

  await presentEndOfTurn()
  if (isOver(s)) {
    await finishGame()
    return
  }
  const before = new Set(s.hand.map((c) => c.uid))
  const drew = E.startHackerTurn(s)
  ui.freshCards = s.hand.filter((c) => !before.has(c.uid)).map((c) => c.uid)
  if (drew.length < E.DRAW_PER_TURN && s.hand.length >= E.HAND_MAX) toast(`手牌已滿 ${E.HAND_MAX} 張，這回合少抽了`)
  // 橫幅和發牌一起進行：舊牌讓位後馬上補上新牌，不用等橫幅播完
  await Promise.all([showBanner('你的回合', 'hacker', undefined, 700), dealFresh()])
  ui.busy = false
}

/** 播放駭客回合結束的每一步（公司模式的電腦駭客也用這個） */
export async function presentEndOfTurn() {
  const s = game.s!
  const gen = E.endOfTurn(s)
  let step = gen.next()
  while (!step.done) {
    await presentStep(step.value)
    if (isOver(s)) break
    step = gen.next()
  }
}

async function presentStep(step: StepOutcome) {
  const s = game.s!
  switch (step.t) {
    case 'frozen': {
      const infraPaused = step.reason === 'infraParalyzed'
      const downInfra = E.infras(s).find((n) => n.paralyzed > 0)
      const it = E.its(s)[0]
      const anchor = nodeRect(infraPaused && downInfra ? downInfra.id : it?.id ?? '')
      if (anchor) {
        hackerPlaque(anchor.cx, anchor.cy - 6, {
          title: step.both ? '公司全面停擺' : '修復暫停',
          sub: infraPaused
            ? '網路中斷：修復與奪回都停了'
            : step.both
              ? `${it?.name ?? 'IT'}被癱瘓：修復與奪回都停了`
              : `${it?.name ?? 'IT'}${s.mode === 'company' ? '被駭客控制' : '被你控制'}`,
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
      if (rr) hackerPlaque(rr.cx, rr.cy - 6, { title: '被修復', sub: `「${E_vulnName(step.vuln)}」`, tone: 'bad', icon: 'wrench', style: 'stamp' })
      await wait(600)
      await showBanner('弱點被修復', 'company', step.name, 1000)
      await wait(500)
      break
    }
    case 'restore': {
      sfx.patch()
      flashNode(step.node, 'restore', 1400)
      const rr = nodeRect(step.node)
      if (rr) hackerPlaque(rr.cx, rr.cy - 6, { title: '備份恢復', sub: '備份又能正常運作了', tone: 'bad', icon: 'database-backup', style: 'stamp' })
      await wait(1300)
      break
    }
    case 'recapture': {
      sfx.recapture()
      flashNode(step.node, 'recapture', 1600)
      const rr = nodeRect(step.node)
      if (rr) hackerPlaque(rr.cx, rr.cy - 6, { title: '被奪回', sub: step.name, tone: 'bad', icon: 'shield-alert', style: 'stamp' })
      if (step.patched) flashSlot(step.patched.node, step.patched.idx, 'patch', 1800)
      await wait(600)
      if (s.mode === 'company') await showBanner('奪回控制', 'company', step.name, 1100)
      else await showBanner('節點被奪回', 'danger', step.name, 1100)
      await wait(500)
      break
    }
    case 'standing': {
      if (step.revealed.length) {
        // 病毒觸發：被感染的基礎設施先脈動一下 → 封包飛向被翻開的弱點 → 該格亮起，並寫出翻到了什麼
        sfx.virusPing()
        for (const id of new Set(step.from)) {
          const inf = nodeRect(id)
          flashNode(id, 'pulse', 1100)
          if (inf) hackerPlaque(inf.cx, inf.cy - 6, { title: '病毒觸發', sub: '賽博病毒回報中', tone: 'virus', icon: 'bug', style: 'tag' }, 1500)
        }
        await wait(650)
        for (const [i, r] of step.revealed.entries()) {
          const inf = nodeRect(step.from[i])
          const sp = slotPos(r.node, r.idx)
          if (inf && sp) beam(inf.cx, inf.cy, sp.x, sp.y)
          await wait(520)
          sfx.reveal()
          flashSlot(r.node, r.idx, 'virus', 1800)
          const sl = E.node(s, r.node).slots[r.idx]
          const rr = nodeRect(r.node)
          if (rr) {
            hackerPlaque(
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
        if (ar) float(ar.cx, ar.cy + 50, `${step.delta}`, s.mode === 'company' ? 'bad' : 'good', 'snowflake')
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

export async function finishGame() {
  const s = game.s!
  ui.result = s.result
  ui.busy = true
  await wait(700)
  // 公司模式：駭客輸了才是玩家贏
  const won = s.mode === 'company' ? s.result === 'lose' : s.result === 'win'
  if (won) sfx.win()
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
