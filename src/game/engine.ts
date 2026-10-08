// 遊戲規則引擎：不依賴畫面，可以直接在 Node 裡跑模擬
import {
  BACKUP_RESTORE_TURNS,
  CARDS,
  CARD_IDS,
  IT_PARALYZE_TURNS,
  MISSIONS,
  MISSION_IDS,
  NODE_TEMPLATES,
  SCENARIOS,
  VULNS,
  ZONE_SPEED,
  recaptureName,
  recaptureTurnsOf,
  repairName,
  repairTurnsOf,
  vulnPool,
} from './data.ts'
import type {
  CardId,
  CardInst,
  Entry,
  GameNode,
  GameState,
  MissionId,
  ScenarioId,
  Slot,
  Tri,
  VulnId,
} from './types.ts'

export const BASE_AP = 3
/** 開局發幾張牌 */
export const OPENING_HAND = 5
/** 之後每回合抽幾張 */
export const DRAW_PER_TURN = 2
/** 手牌上限：滿了就不再抽 */
export const HAND_MAX = 8
/** 上回合沒用完的行動點，最多保留幾點到下一回合 */
export const AP_CARRY_MAX = 2
export const MAX_ALERT = 10

/** 每種牌在牌堆裡的張數（沒寫就是 1） */
export const CARD_COPIES: Partial<Record<CardId, number>> = {}

/** 平衡用的可調數值 */
export const TUNING = {
  /** 「已防護」牌相對於弱點牌的出現比重（1 = 一樣多；越小，開局越多弱點） */
  shieldWeight: 0.5,
}

/** 深拷貝（用 JSON，連 Vue 的響應式物件也能複製） */
function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

// ───────────────────────── 亂數 ─────────────────────────

export function rnd(s: { rng: number }): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0
  let t = s.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
export function rndInt(s: { rng: number }, n: number): number {
  return Math.floor(rnd(s) * n)
}
export function pick<T>(s: { rng: number }, arr: readonly T[]): T {
  return arr[rndInt(s, arr.length)]
}
export function shuffle<T>(s: { rng: number }, arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = rndInt(s, i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ───────────────────────── 三態邏輯 ─────────────────────────

const yn = (b: boolean): Tri => (b ? 'Y' : 'N')
function and(...xs: Tri[]): Tri {
  if (xs.includes('N')) return 'N'
  return xs.every((x) => x === 'Y') ? 'Y' : 'M'
}
function or(...xs: Tri[]): Tri {
  if (xs.includes('Y')) return 'Y'
  return xs.every((x) => x === 'N') ? 'N' : 'M'
}

type Has = (n: GameNode, v: VulnId) => Tri

// ───────────────────────── 節點與弱點 ─────────────────────────

export function node(s: GameState, id: string): GameNode {
  const n = s.nodes.find((x) => x.id === id)
  if (!n) throw new Error('找不到節點 ' + id)
  return n
}

export function canHave(n: GameNode, v: VulnId): boolean {
  const d = VULNS[v]
  if (d.kind !== n.kind) return false
  if (d.roles && !d.roles.includes(n.role)) return false
  return true
}

/** 真實狀態：弱點是否有效（有對應的已防護牌，或已被公司修好，就無效） */
export function effective(n: GameNode, v: VulnId): boolean {
  let has = false
  for (const sl of n.slots) {
    if (sl.vuln !== v) continue
    if (sl.shield) return false
    if (!sl.fixed) has = true
  }
  return has
}

/** 駭客目前知道的狀態 */
export function knownHas(n: GameNode, v: VulnId): Tri {
  if (!canHave(n, v)) return 'N'
  let vs: Slot | undefined
  let ss: Slot | undefined
  for (const sl of n.slots) {
    if (sl.vuln !== v) continue
    if (sl.shield) ss = sl
    else vs = sl
  }
  if (ss && ss.vis > 0) return 'N'
  if (vs && vs.vis > 0) return vs.fixed ? 'N' : 'Y'
  if (n.excluded[v]) return 'N'
  if (n.sealed) return 'N'
  if (n.slots.every((sl) => sl.vis > 0)) return 'N'
  return 'M'
}

const trueHas: Has = (n, v) => yn(effective(n, v))

export function hiddenIdx(n: GameNode): number[] {
  const out: number[] = []
  n.slots.forEach((sl, i) => {
    if (sl.vis === 0) out.push(i)
  })
  return out
}

/**
 * 這個節點完全沒有弱點（每一格都是「已防護」）。
 * 它看起來和別的節點一樣蓋著牌；硬用偵查牌去翻，只會翻到「無懈可擊」。
 * 病毒等連鎖反應只會翻真正的弱點，不會浪費在這種節點上。
 */
export function isImpregnable(n: GameNode): boolean {
  return n.slots.every((sl) => sl.shield)
}

/** 還蓋著、而且真的能利用的弱點（搜尋類的牌只會翻到這些，不會翻到防護） */
function hiddenVulnIdx(n: GameNode): number[] {
  const out: number[] = []
  n.slots.forEach((sl, i) => {
    if (sl.vis === 0 && !sl.shield && !sl.fixed && effective(n, sl.vuln)) out.push(i)
  })
  return out
}

export interface SlotRef {
  node: string
  idx: number
}

/** 翻開一個弱點；公開（公司也看得到）的弱點會開始「修復倒數」 */
function revealVuln(n: GameNode, idx: number, vis: 1 | 2): SlotRef {
  const sl = n.slots[idx]
  if (sl.vis < vis) sl.vis = vis
  if (vis === 2 && sl.timer === undefined) sl.timer = repairTurnsOf(sl.vuln)
  return { node: n.id, idx }
}

function revealRandomOn(s: GameState, n: GameNode, count: number, vis: 1 | 2): { refs: SlotRef[]; dry: boolean } {
  const refs: SlotRef[] = []
  for (let k = 0; k < count; k++) {
    const h = hiddenVulnIdx(n)
    if (!h.length) break
    refs.push(revealVuln(n, pick(s, h), vis))
  }
  return { refs, dry: refs.length < count }
}

function revealRandomAnywhere(s: GameState, vis: 1 | 2): { refs: SlotRef[]; dry: boolean } {
  const all: SlotRef[] = []
  for (const n of s.nodes) for (const i of hiddenVulnIdx(n)) all.push({ node: n.id, idx: i })
  if (!all.length) return { refs: [], dry: true }
  const r = pick(s, all)
  return { refs: [revealVuln(node(s, r.node), r.idx, vis)], dry: false }
}

export function hiddenCount(s: GameState): number {
  let c = 0
  for (const n of s.nodes) c += hiddenIdx(n).length
  return c
}

// ───────────────────────── 控制狀態查詢 ─────────────────────────

export const isEmployee = (n: GameNode) => n.kind === 'employee'
export const ctrlCount = (s: GameState) => s.nodes.filter((n) => n.controlled).length
const outerCtrl = (s: GameState) => s.nodes.some((n) => n.layer === 0 && n.controlled)
const innerCtrl = (s: GameState) => s.nodes.some((n) => n.layer === 1 && n.controlled)
const empCtrl = (s: GameState) => s.nodes.some((n) => isEmployee(n) && n.controlled)

export function alertZone(a: number): 0 | 1 | 2 {
  return a >= 7 ? 2 : a >= 4 ? 1 : 0
}

/** 公司反應速度：警戒值越高，倒數走得越快 */
export const speedOf = (s: GameState): number => ZONE_SPEED[alertZone(s.alert)]

/** 以目前的速度，還要幾回合 */
export const etaOf = (timer: number, speed: number): number => Math.max(1, Math.ceil(timer / speed - 1e-9))

/** 能否攻擊到這個節點（層級規則） */
function reach(s: GameState, H: Has, n: GameNode): Tri {
  if (n.layer === 0) return 'Y'
  const outer = yn(outerCtrl(s))
  if (n.layer === 1) {
    if (n.role === 'infra') return or(outer, H(n, 'remote'))
    return outer
  }
  const inner = yn(innerCtrl(s))
  const infra = node(s, 'infra')
  const sea = and(H(infra, 'openSea'), outer)
  if (n.role === 'db') {
    const ai = node(s, 'ai')
    return or(
      inner,
      sea,
      and(H(n, 'allaccess'), yn(empCtrl(s))),
      and(yn(ai.controlled), H(ai, 'masterkey')),
    )
  }
  return or(inner, sea)
}

/** 駭客目前看到的「能不能攻擊到這個節點」 */
export function reachKnown(s: GameState, n: GameNode): Tri {
  return reach(s, knownHas, n)
}

/** 實際走進這個節點時，用到的「規則類」弱點（成功時要一併翻開） */
function reachUsed(s: GameState, n: GameNode): Entry[] {
  if (n.layer === 1 && n.role === 'infra' && !outerCtrl(s) && effective(n, 'remote')) {
    return [{ node: n.id, vuln: 'remote' }]
  }
  if (n.layer === 2 && !innerCtrl(s)) {
    const infra = node(s, 'infra')
    const db = node(s, 'db')
    const ai = node(s, 'ai')
    if (outerCtrl(s) && effective(infra, 'openSea')) return [{ node: infra.id, vuln: 'openSea' }]
    if (n.role === 'db' && empCtrl(s) && effective(db, 'allaccess')) return [{ node: db.id, vuln: 'allaccess' }]
    if (n.role === 'db' && ai.controlled && effective(ai, 'masterkey')) return [{ node: ai.id, vuln: 'masterkey' }]
  }
  return []
}

// ───────────────────────── 牌的條件 ─────────────────────────

function implicitTarget(s: GameState, id: CardId): GameNode | null {
  switch (id) {
    case 'brute':
    case 'usb':
    case 'exploit':
    case 'virus':
    case 'wreck':
      return node(s, 'infra')
    case 'inject':
    case 'skill':
    case 'ally':
    case 'exfil':
      return node(s, 'ai')
    case 'lateral':
    case 'ransom':
      return node(s, 'db')
    case 'alarm':
      return node(s, 'it')
    case 'wipe':
      return node(s, 'backup')
    default:
      return null
  }
}

/** 這張牌的條件在某個「視角」下成立嗎 */
export function condition(s: GameState, H: Has, id: CardId, t: GameNode | null): Tri {
  const infra = node(s, 'infra')
  const ai = node(s, 'ai')
  const db = node(s, 'db')
  const backup = node(s, 'backup')
  const emps = s.nodes.filter(isEmployee)
  switch (id) {
    case 'scan':
    case 'osint':
    case 'ally':
      return 'Y'
    case 'smooth':
      return or(...emps.map((e) => H(e, 'gullible')))
    case 'virus':
      return yn(infra.controlled)
    case 'phish':
      return t ? and(reach(s, H, t), H(t, 'curious')) : 'N'
    case 'social':
      return t ? and(reach(s, H, t), H(t, 'gullible')) : 'N'
    case 'cred':
      return t ? and(reach(s, H, t), H(t, 'samepw')) : 'N'
    case 'tail':
      return t ? and(reach(s, H, t), or(H(t, 'lazy'), H(t, 'kind'))) : 'N'
    case 'mfa':
      return t ? and(reach(s, H, t), H(t, 'approver')) : 'N'
    case 'brute':
      return and(reach(s, H, infra), or(H(infra, 'weakpw'), H(infra, 'remote')))
    case 'exploit':
      return and(reach(s, H, infra), or(H(infra, 'buggy'), H(infra, 'legacy')))
    case 'inject':
      return or(H(ai, 'obey'), H(ai, 'nohuman'))
    case 'skill':
      return or(yn(empCtrl(s)), H(ai, 'selfupd'))
    case 'usb':
      return or(yn(empCtrl(s)), ...emps.map((e) => or(H(e, 'curious'), H(e, 'gullible'))))
    case 'lateral':
      return reach(s, H, db)
    case 'alarm':
    case 'wipe':
      return yn(infra.controlled)
    case 'ransom':
      return and(yn(db.controlled), or(H(backup, 'nobackup'), yn(backup.paralyzed > 0)))
    case 'bec':
      return t ? and(yn(node(s, 'boss').controlled), H(t, 'gullible')) : 'N'
    case 'exfil':
      return and(yn(ai.controlled), or(H(ai, 'masterkey'), H(ai, 'nohuman')))
    case 'wreck': {
      const it = node(s, 'it')
      return and(yn(infra.controlled), yn(it.controlled || it.paralyzed > 0))
    }
    // 資源管理牌：沒有「需要哪個弱點」的條件，能不能打看 legal
    case 'wipelog':
    case 'proxy':
    case 'darkweb':
    case 'energy':
    case 'stash':
      return 'Y'
  }
}

/** 條件裡「弱點存不存在」這一類的檢查點（失敗時用來推論「確定不存在」） */
function tested(s: GameState, id: CardId, t: GameNode | null): Array<[GameNode, VulnId]> {
  const infra = node(s, 'infra')
  const ai = node(s, 'ai')
  const db = node(s, 'db')
  const backup = node(s, 'backup')
  const emps = s.nodes.filter(isEmployee)
  switch (id) {
    case 'smooth':
      return emps.map((e) => [e, 'gullible'])
    case 'phish':
      return t ? [[t, 'curious']] : []
    case 'social':
    case 'bec':
      return t ? [[t, 'gullible']] : []
    case 'cred':
      return t ? [[t, 'samepw']] : []
    case 'tail':
      return t
        ? [
            [t, 'lazy'],
            [t, 'kind'],
          ]
        : []
    case 'mfa':
      return t ? [[t, 'approver']] : []
    case 'brute':
      return [
        [infra, 'weakpw'],
        [infra, 'remote'],
      ]
    case 'exploit':
      return [
        [infra, 'buggy'],
        [infra, 'legacy'],
      ]
    case 'inject':
      return [
        [ai, 'obey'],
        [ai, 'nohuman'],
      ]
    case 'skill':
      return [[ai, 'selfupd']]
    case 'usb':
      return emps.flatMap((e) => [
        [e, 'curious'] as [GameNode, VulnId],
        [e, 'gullible'] as [GameNode, VulnId],
      ])
    case 'lateral':
      return [
        [infra, 'openSea'],
        [db, 'allaccess'],
        [ai, 'masterkey'],
      ]
    case 'ransom':
      return [[backup, 'nobackup']]
    case 'exfil':
      return [
        [ai, 'masterkey'],
        [ai, 'nohuman'],
      ]
    default:
      return []
  }
}

/** 卡牌在公開規則上的合法性（跟駭客知道多少無關） */
function legal(s: GameState, id: CardId, t: GameNode | null): boolean {
  const infra = node(s, 'infra')
  const db = node(s, 'db')
  const ai = node(s, 'ai')
  switch (id) {
    case 'scan':
      return s.nodes.some((n) => !n.sealed && hiddenIdx(n).length > 0)
    case 'osint':
    case 'smooth':
      return !!t && !t.sealed && hiddenIdx(t).length > 0 && (id === 'smooth' || isEmployee(t))
    case 'ally':
      return !ai.sealed && hiddenIdx(ai).length > 0
    case 'virus':
      return infra.controlled && !infra.virus
    case 'phish':
    case 'social':
    case 'cred':
    case 'tail':
    case 'mfa':
      return !!t && isEmployee(t) && !t.controlled
    case 'bec':
      return !!t && isEmployee(t) && t.role !== 'boss'
    case 'brute':
    case 'exploit':
    case 'usb':
      return !infra.controlled
    case 'inject':
    case 'skill':
      return !ai.controlled
    case 'lateral':
      return !db.controlled
    case 'alarm':
      // 還在癱瘓中也可以再打一次，把時間延長
      return node(s, 'it').paralyzed <= IT_PARALYZE_TURNS - 1
    case 'wipe':
      return node(s, 'backup').paralyzed === 0
    case 'ransom':
      return db.controlled
    case 'exfil':
      return ai.controlled
    case 'wreck':
      return infra.controlled
    case 'wipelog':
    case 'proxy':
      return s.alert >= 1
    case 'darkweb':
      // 這張牌打出去之後，手牌一定有空位；只要牌堆或棄牌堆還有牌可抽
      return s.deck.length + s.discard.length > 0
    case 'energy':
      return true
    case 'stash':
      return s.carryBoost === 0
  }
}

// ───────────────────────── 出牌可行性（給畫面用） ─────────────────────────

export interface Playability {
  cost: number
  free: boolean
  affordable: boolean
  /** dead：目前沒有任何合法打法；maybe：有但要賭；sure：確定成功 */
  status: 'dead' | 'maybe' | 'sure'
  /** 需要選目標的牌：可選的節點與預測 */
  targets: Record<string, Tri>
  /** 自動目標的牌：會影響的節點 */
  hint: string[]
  autoTri: Tri
}

export function isFree(s: GameState, id: CardId): boolean {
  return s.freePlayReady && node(s, 'ai').controlled && CARDS[id].cost === 1
}

/** 實際費用；對已知是「社群分享狂」的員工用肉搜情報，費用 -1 */
export function cardCost(s: GameState, id: CardId, targetId?: string): number {
  if (isFree(s, id)) return 0
  let c = CARDS[id].cost
  if (id === 'osint' && targetId && knownHas(node(s, targetId), 'oversharer') === 'Y') c -= 1
  return c
}

const NODE_TARGET_POOL: Partial<Record<CardId, (n: GameNode) => boolean>> = {
  osint: isEmployee,
  smooth: () => true,
  phish: isEmployee,
  social: isEmployee,
  cred: isEmployee,
  tail: isEmployee,
  mfa: isEmployee,
  bec: isEmployee,
}

/** 駭客視角的預測 */
export function predict(s: GameState, id: CardId, targetId?: string): Tri {
  const t = targetId ? node(s, targetId) : implicitTarget(s, id)
  if (!legal(s, id, t)) return 'N'
  return condition(s, knownHas, id, t)
}

export function hintNodes(s: GameState, id: CardId): string[] {
  switch (id) {
    case 'scan':
      return s.nodes.filter((n) => !n.sealed && hiddenIdx(n).length).map((n) => n.id)
    case 'usb':
      return ['infra', 'db']
    case 'ransom':
      return ['db', 'backup']
    case 'exfil':
      return ['ai', 'db']
    case 'wreck':
      return ['infra', 'it']
    case 'smooth':
      return []
    default: {
      const t = implicitTarget(s, id)
      return t ? [t.id] : []
    }
  }
}

export function playability(s: GameState, id: CardId): Playability {
  const def = CARDS[id]
  const cost = cardCost(s, id)
  // 肉搜情報：只要有一個已知的「社群分享狂」，最低費用就是 1
  let minCost = cost
  if (id === 'osint') for (const n of s.nodes) if (isEmployee(n)) minCost = Math.min(minCost, cardCost(s, id, n.id))
  const base: Playability = {
    cost,
    free: cost === 0 && def.cost > 0,
    affordable: s.ap >= minCost && s.phase === 'hacker',
    status: 'dead',
    targets: {},
    hint: [],
    autoTri: 'N',
  }
  if (def.targeting === 'node') {
    const pool = NODE_TARGET_POOL[id] ?? (() => false)
    let best: Tri = 'N'
    for (const n of s.nodes) {
      if (!pool(n)) continue
      const tri = predict(s, id, n.id)
      if (tri === 'N') continue
      base.targets[n.id] = tri
      best = best === 'Y' || tri === 'Y' ? 'Y' : 'M'
    }
    base.autoTri = best
    base.status = best === 'N' ? 'dead' : best === 'Y' ? 'sure' : 'maybe'
  } else {
    const tri = predict(s, id)
    base.autoTri = tri
    base.status = tri === 'N' ? 'dead' : tri === 'Y' ? 'sure' : 'maybe'
    if (tri !== 'N') base.hint = hintNodes(s, id)
  }
  return base
}

// ───────────────────────── 出牌結算 ─────────────────────────

/** 取得節點的控制權：開始「奪回倒數」，並把用到的弱點（含走進來的捷徑）翻開讓駭客知道 */
function capture(s: GameState, n: GameNode, entry: Entry | null, out: SlotRef[], used: Entry[] = []) {
  n.controlled = true
  n.controlSeq = ++s.controlSeq
  n.entry = entry
  n.timer = recaptureTurnsOf(n.role)
  for (const e of entry ? [entry, ...used] : used) {
    const en = node(s, e.node)
    const idx = en.slots.findIndex((sl) => sl.vuln === e.vuln && !sl.shield)
    if (idx >= 0 && en.slots[idx].vis === 0) {
      en.slots[idx].vis = 1
      out.push({ node: en.id, idx })
    }
    s.exploited.push(e)
  }
}

function entryFor(s: GameState, id: CardId, t: GameNode | null): Entry | null {
  const infra = node(s, 'infra')
  const ai = node(s, 'ai')
  switch (id) {
    case 'phish':
      return t ? { node: t.id, vuln: 'curious' } : null
    case 'social':
      return t ? { node: t.id, vuln: 'gullible' } : null
    case 'cred':
      return t ? { node: t.id, vuln: 'samepw' } : null
    case 'mfa':
      return t ? { node: t.id, vuln: 'approver' } : null
    case 'tail':
      return t ? { node: t.id, vuln: effective(t, 'lazy') ? 'lazy' : 'kind' } : null
    case 'brute':
      return { node: infra.id, vuln: effective(infra, 'weakpw') ? 'weakpw' : 'remote' }
    case 'exploit':
      return { node: infra.id, vuln: effective(infra, 'buggy') ? 'buggy' : 'legacy' }
    case 'inject':
      return { node: ai.id, vuln: effective(ai, 'obey') ? 'obey' : 'nohuman' }
    case 'skill':
      return empCtrl(s) ? null : { node: ai.id, vuln: 'selfupd' }
    case 'usb': {
      if (empCtrl(s)) return null
      const cands: Entry[] = []
      for (const e of s.nodes.filter(isEmployee)) {
        if (effective(e, 'curious')) cands.push({ node: e.id, vuln: 'curious' })
        if (effective(e, 'gullible')) cands.push({ node: e.id, vuln: 'gullible' })
      }
      return cands.length ? pick(s, cands) : null
    }
    default:
      return null
  }
}

export interface Effect {
  ok: boolean
  partial: boolean
  captured: string[]
  revealed: SlotRef[]
  /** 搜尋後發現「已經沒有更多可用弱點」的節點 */
  dry: string[]
  excluded: Array<{ node: string; vuln: VulnId }>
  paralyzed: string | null
  virus: boolean
  finish: boolean
  entry: Entry | null
  /** 資源管理牌：警戒值實際降了多少（負數） */
  alertDelta: number
  /** 資源管理牌：這次抽到的牌 */
  drawn: CardInst[]
  /** 資源管理牌：本回合多拿到的行動點 */
  apGain: number
  /** 囤積補給：本回合保留上限提高了 */
  stash: boolean
}

/** 只處理「牌的效果」，不含費用與噪音 */
export function resolve(s: GameState, id: CardId, t: GameNode | null): Effect {
  const eff: Effect = {
    ok: false,
    partial: false,
    captured: [],
    revealed: [],
    dry: [],
    excluded: [],
    paralyzed: null,
    virus: false,
    finish: false,
    entry: null,
    alertDelta: 0,
    drawn: [],
    apGain: 0,
    stash: false,
  }
  const infra = node(s, 'infra')
  const ai = node(s, 'ai')
  const db = node(s, 'db')
  const backup = node(s, 'backup')
  const ok = condition(s, trueHas, id, t) === 'Y'
  eff.ok = ok
  if (ok) {
    switch (id) {
      case 'scan': {
        const r = revealRandomAnywhere(s, 2)
        eff.revealed.push(...r.refs)
        if (r.dry) {
          // 整個公司都掃不到更多弱點了
          for (const n of s.nodes) {
            n.sealed = true
            eff.dry.push(n.id)
          }
        }
        break
      }
      case 'osint':
      case 'smooth': {
        if (!t) break
        const r = revealRandomOn(s, t, 1, 1)
        eff.revealed.push(...r.refs)
        if (r.dry) {
          t.sealed = true
          eff.dry.push(t.id)
        }
        break
      }
      case 'ally': {
        const r = revealRandomOn(s, ai, effective(ai, 'selfupd') ? 2 : 1, 1)
        eff.revealed.push(...r.refs)
        if (r.dry) {
          ai.sealed = true
          eff.dry.push(ai.id)
        }
        break
      }
      case 'virus':
        infra.virus = true
        eff.virus = true
        break
      case 'phish':
      case 'social':
      case 'cred':
      case 'tail':
      case 'mfa':
        if (t) {
          eff.entry = entryFor(s, id, t)
          capture(s, t, eff.entry, eff.revealed)
          eff.captured.push(t.id)
        }
        break
      case 'brute':
      case 'exploit': {
        const used = reachUsed(s, infra)
        eff.entry = entryFor(s, id, infra)
        capture(s, infra, eff.entry, eff.revealed, used)
        eff.captured.push(infra.id)
        break
      }
      case 'inject':
      case 'skill':
        eff.entry = entryFor(s, id, ai)
        capture(s, ai, eff.entry, eff.revealed)
        eff.captured.push(ai.id)
        break
      case 'usb':
        eff.entry = entryFor(s, id, infra)
        capture(s, infra, eff.entry, eff.revealed)
        eff.captured.push(infra.id)
        if (effective(infra, 'openSea') && !db.controlled) {
          capture(s, db, { node: infra.id, vuln: 'openSea' }, eff.revealed)
          eff.captured.push(db.id)
        }
        break
      case 'lateral': {
        const used = reachUsed(s, db)
        eff.entry = used[0] ?? null
        capture(s, db, eff.entry, eff.revealed, used.slice(1))
        eff.captured.push(db.id)
        break
      }
      case 'alarm': {
        const it = node(s, 'it')
        it.paralyzed = IT_PARALYZE_TURNS
        eff.paralyzed = it.id
        break
      }
      case 'wipe':
        backup.paralyzed = BACKUP_RESTORE_TURNS
        eff.paralyzed = backup.id
        break
      case 'ransom':
      case 'bec':
      case 'exfil':
      case 'wreck':
        eff.finish = true
        break
      case 'wipelog':
      case 'proxy': {
        const before = s.alert
        s.alert = Math.max(0, s.alert - (id === 'proxy' ? 3 : 2))
        eff.alertDelta = s.alert - before
        break
      }
      case 'darkweb':
        eff.drawn = drawCards(s, 2)
        break
      case 'energy':
        s.ap += 2
        eff.apGain = 2
        break
      case 'stash':
        s.carryBoost = 2
        eff.stash = true
        break
    }
  } else {
    // 勒索軟體：資料庫已被控制，但備份完好 → 公司還原（順便看到備份為什麼救得回來）
    if (id === 'ransom' && db.controlled) {
      eff.partial = true
      backup.slots.forEach((sl, i) => {
        if (sl.vis === 0) {
          sl.vis = 1
          eff.revealed.push({ node: backup.id, idx: i })
        }
      })
    }
    // 失敗也有收穫：看到是哪一道防護擋住了你；或是確認這個弱點不存在（搜尋類的牌不會翻出防護）
    for (const [n, v] of tested(s, id, t)) {
      const H: Has = (nn, vv) => (nn === n && vv === v ? 'Y' : trueHas(nn, vv))
      if (condition(s, H, id, t) !== 'Y') continue
      if (knownHas(n, v) === 'N') continue
      const si = CARDS[id].cat === 'recon' ? -1 : n.slots.findIndex((sl) => sl.vuln === v && sl.shield)
      if (si >= 0) {
        if (n.slots[si].vis === 0) {
          n.slots[si].vis = 1
          eff.revealed.push({ node: n.id, idx: si })
        }
      } else {
        n.excluded[v] = true
        eff.excluded.push({ node: n.id, vuln: v })
      }
    }
  }
  return eff
}

export interface PlayResult {
  card: CardId
  target: string | null
  effect: Effect
  cost: number
  free: boolean
  refund: number
  noise: number
  win: boolean
  lose: boolean
}

export function playCard(s: GameState, uid: number, targetId?: string): PlayResult {
  const idx = s.hand.findIndex((c) => c.uid === uid)
  if (idx < 0) throw new Error('手上沒有這張牌')
  const inst = s.hand[idx]
  const id = inst.id
  const def = CARDS[id]
  if (s.phase !== 'hacker') throw new Error('現在不是你的回合')
  const t = targetId ? node(s, targetId) : implicitTarget(s, id)
  const free = isFree(s, id)
  const cost = cardCost(s, id, t?.id)
  const knownDiscount = id === 'osint' && cost < def.cost && !free
  if (s.ap < cost) throw new Error('行動點不足')
  s.ap -= cost
  if (free) s.freePlayReady = false
  s.hand.splice(idx, 1)
  // 暗網情報要抽牌：先抽完再把自己放進棄牌堆，免得牌堆見底時又抽回自己
  const holdDiscard = id === 'darkweb'
  if (!holdDiscard) s.discard.push(inst)

  const effect = resolve(s, id, t)
  if (holdDiscard) s.discard.push(inst)

  let refund = 0
  if (id === 'osint' && t && !knownDiscount && effective(t, 'oversharer')) {
    refund = 1
    s.ap += 1
  }

  s.plays.push({
    turn: s.turn,
    card: id,
    target: t?.id,
    ok: effect.ok,
    partial: effect.partial,
    captured: effect.captured.slice(),
    entry: effect.entry,
  })

  const result: PlayResult = {
    card: id,
    target: t?.id ?? null,
    effect,
    cost,
    free,
    refund,
    noise: 0,
    win: false,
    lose: false,
  }

  // 先判定勝利，再計算噪音
  if (effect.finish && isFinisherOfMission(s, id)) {
    result.win = true
    s.phase = 'over'
    s.result = 'win'
    return result
  }

  const noise = noiseOf(s, def.noise)
  result.noise = noise
  s.alert = Math.min(MAX_ALERT, s.alert + noise)
  s.noiseThisTurn += noise
  s.noiseTotal += noise
  if (s.alert >= MAX_ALERT) {
    result.lose = true
    s.phase = 'over'
    s.result = 'lose'
    s.loseReason = '警戒值達到 10，被公司抓到了'
  }
  return result
}

/** 換牌：把一張用不到的牌丟進棄牌堆，換一張新的（要花行動點） */
export const RECYCLE_COST = 1

export function canRecycle(s: GameState): boolean {
  return s.phase === 'hacker' && s.ap >= RECYCLE_COST && (s.deck.length > 0 || s.discard.length > 0)
}

export function recycleCard(s: GameState, uid: number): CardInst | null {
  const idx = s.hand.findIndex((c) => c.uid === uid)
  if (idx < 0 || !canRecycle(s)) return null
  const old = s.hand[idx]
  s.ap -= RECYCLE_COST
  // 先抽新牌，再把舊牌放進棄牌堆（避免馬上抽回同一張）
  const fresh = drawCard(s)
  s.hand.splice(idx, 1)
  s.discard.push(old)
  if (fresh) s.hand.splice(idx, 0, fresh)
  return fresh
}

export function noiseOf(s: GameState, base: number): number {
  return effective(node(s, 'infra'), 'nolog') ? Math.ceil(base / 2) : base
}

function isFinisherOfMission(s: GameState, id: CardId): boolean {
  return MISSIONS[s.mission].finisher === id
}

// ───────────────────────── 任務進度 ─────────────────────────

/** 取得資料庫（含「私人雲端」的捷徑） */
export function dbAccess(s: GameState): boolean {
  const db = node(s, 'db')
  if (db.controlled) return true
  return s.mission === 'espionage' && effective(db, 'privcloud') && empCtrl(s)
}

export function holdNeeded(s: GameState): number {
  if (s.mission === 'espionage') return effective(node(s, 'db'), 'plaintext') ? 1 : 2
  return 0
}

function holdCheck(s: GameState): boolean {
  if (s.mission === 'espionage') {
    s.hold = dbAccess(s) ? s.hold + 1 : 0
    return s.hold >= holdNeeded(s) && s.alert <= 6
  }
  return false
}

// ───────────────────────── 回合：駭客階段 ─────────────────────────

export function drawCard(s: GameState): CardInst | null {
  if (!s.deck.length) {
    if (!s.discard.length) return null
    s.deck = shuffle(s, s.discard)
    s.discard = []
  }
  return s.deck.pop() ?? null
}

/** 抽最多 n 張牌；手牌滿 8 張就不再抽 */
export function drawCards(s: GameState, n: number): CardInst[] {
  const out: CardInst[] = []
  while (out.length < n && s.hand.length < HAND_MAX) {
    const c = drawCard(s)
    if (!c) break
    s.hand.push(c)
    out.push(c)
  }
  return out
}

export function apBonusOf(s: GameState): number {
  return s.nodes.filter((n) => isEmployee(n) && n.role !== 'it' && n.controlled).length
}

export function startHackerTurn(s: GameState): CardInst[] {
  // 上回合沒用完的行動點，最多保留 2 點（囤積補給可以再多留 2 點）
  const carry = s.turn > 0 ? Math.min(AP_CARRY_MAX + s.carryBoost, Math.max(0, s.ap)) : 0
  s.turn += 1
  s.apBase = BASE_AP
  s.apBonus = apBonusOf(s)
  s.apCarry = carry
  s.carryBoost = 0
  s.ap = s.apBase + s.apBonus + s.apCarry
  s.noiseThisTurn = 0
  s.freePlayReady = node(s, 'ai').controlled
  s.phase = 'hacker'
  // 第一回合發開局手牌；之後每回合抽 2 張
  return drawCards(s, s.turn === 1 ? OPENING_HAND : DRAW_PER_TURN)
}

// ───────────────────────── 回合結束：公司的反應倒數 ─────────────────────────
//
// 沒有「公司回合」。每個公開的弱點、每個被控制的節點都有自己的倒數；
// 回合結束時倒數往前走，歸零就修復／奪回。
//  - 公開的弱點（主動掃描翻開的）才會被修復；隱密偵查公司不知道。
//  - 警戒值越高，倒數走得越快。
//  - IT 管理員被你控制：修復暫停；被癱瘓：修復與奪回都暫停。

export type BlockReason = 'itControlled' | 'itParalyzed' | null

export function repairBlock(s: GameState): BlockReason {
  const it = node(s, 'it')
  if (it.paralyzed > 0) return 'itParalyzed'
  if (it.controlled) return 'itControlled'
  return null
}
export function recaptureBlock(s: GameState): BlockReason {
  return node(s, 'it').paralyzed > 0 ? 'itParalyzed' : null
}

export interface Upcoming {
  kind: 'repair' | 'recapture' | 'restore'
  node: string
  idx: number
  vuln: VulnId | null
  /** 以目前的速度，還要幾回合 */
  eta: number
  frozen: boolean
}

/** 目前所有進行中的倒數（由快到慢） */
export function upcoming(s: GameState): Upcoming[] {
  const speed = speedOf(s)
  const rb = repairBlock(s) !== null
  const cb = recaptureBlock(s) !== null
  const out: Upcoming[] = []
  for (const n of s.nodes) {
    n.slots.forEach((sl, i) => {
      if (sl.shield || sl.fixed || sl.vis !== 2 || sl.timer === undefined) return
      if (!effective(n, sl.vuln)) return
      out.push({ kind: 'repair', node: n.id, idx: i, vuln: sl.vuln, eta: etaOf(sl.timer, speed), frozen: rb })
    })
    if (n.role === 'backup' && n.paralyzed > 0) {
      out.push({ kind: 'restore', node: n.id, idx: -1, vuln: null, eta: etaOf(n.paralyzed, speed), frozen: rb })
    }
    if (n.controlled) {
      out.push({ kind: 'recapture', node: n.id, idx: -1, vuln: n.entry?.vuln ?? null, eta: etaOf(n.timer, speed), frozen: cb })
    }
  }
  return out.sort((a, b) => a.eta - b.eta)
}

export interface RepairStep {
  t: 'repair'
  node: string
  idx: number
  vuln: VulnId
  name: string
}
export interface RestoreStep {
  t: 'restore'
}
export interface RecaptureStep {
  t: 'recapture'
  node: string
  name: string
  patched: SlotRef | null
}
export interface FrozenStep {
  t: 'frozen'
  reason: Exclude<BlockReason, null>
  /** 修復與奪回是否都暫停 */
  both: boolean
}
export interface StandingStep {
  t: 'standing'
  revealed: SlotRef[]
}
export interface CooldownStep {
  t: 'cooldown'
  delta: number
}
export interface EndStep {
  t: 'end'
  result: 'win' | 'lose' | null
}
export type StepOutcome = RepairStep | RestoreStep | RecaptureStep | FrozenStep | StandingStep | CooldownStep | EndStep

/** 奪回節點：回到未控制，而且當初入侵用的弱點會被修補 */
function recapture(s: GameState, n: GameNode): SlotRef | null {
  n.controlled = false
  n.virus = false
  n.timer = 0
  s.recaptured += 1
  let ref: SlotRef | null = null
  if (n.entry) {
    const en = node(s, n.entry.node)
    const idx = en.slots.findIndex((sl) => sl.vuln === n.entry!.vuln && !sl.shield)
    if (idx >= 0) {
      en.slots[idx].fixed = true
      en.slots[idx].vis = 2
      ref = { node: en.id, idx }
    }
  }
  n.entry = null
  return ref
}

const EPS = 1e-9

/** 回合結束：倒數往前走。一步一步 yield，畫面可以邊播動畫邊推進 */
export function* endOfTurn(s: GameState): Generator<StepOutcome, void, void> {
  s.phase = 'company'
  const speed = speedOf(s)
  const rb = repairBlock(s)
  const cb = recaptureBlock(s)
  const it = node(s, 'it')

  // 公司被卡住：倒數暫停
  const ups = upcoming(s)
  const stuckRepair = rb !== null && ups.some((u) => u.kind !== 'recapture')
  const stuckRecap = cb !== null && ups.some((u) => u.kind === 'recapture')
  if (stuckRepair || stuckRecap) {
    yield { t: 'frozen', reason: it.paralyzed > 0 ? 'itParalyzed' : 'itControlled', both: cb !== null }
  }

  // 修復公開的弱點
  if (!rb) {
    const done: Array<{ n: GameNode; i: number }> = []
    for (const n of s.nodes) {
      n.slots.forEach((sl, i) => {
        if (sl.shield || sl.fixed || sl.vis !== 2 || sl.timer === undefined) return
        if (!effective(n, sl.vuln)) return
        sl.timer -= speed
        if (sl.timer <= EPS) done.push({ n, i })
      })
    }
    for (const { n, i } of done) {
      const sl = n.slots[i]
      sl.fixed = true
      s.patched += 1
      yield { t: 'repair', node: n.id, idx: i, vuln: sl.vuln, name: repairName(sl.vuln) }
    }
    // 備份復原
    const b = node(s, 'backup')
    if (b.paralyzed > 0) {
      b.paralyzed -= speed
      if (b.paralyzed <= EPS) {
        b.paralyzed = 0
        yield { t: 'restore' }
      }
    }
  }

  // 奪回被控制的節點
  if (!cb) {
    const list = s.nodes.filter((n) => n.controlled).sort((a, b) => a.controlSeq - b.controlSeq)
    for (const n of list) {
      n.timer -= speed
      if (n.timer <= EPS) {
        const name = recaptureName(n.entry?.vuln ?? null)
        const ref = recapture(s, n)
        yield { t: 'recapture', node: n.id, name, patched: ref }
      }
    }
  }

  // 常駐效果：賽博病毒
  const infra = node(s, 'infra')
  const revealed: SlotRef[] = []
  if (infra.controlled && infra.virus) revealed.push(...revealRandomAnywhere(s, 1).refs)
  yield { t: 'standing', revealed }

  // IT 管理員的癱瘓倒數
  if (it.paralyzed > 0) it.paralyzed -= 1

  // 冷卻
  let delta = 0
  if (s.noiseThisTurn <= 2 && s.alert > 0) {
    s.alert -= 1
    delta = -1
  }
  yield { t: 'cooldown', delta }

  // 檢查勝負
  if (holdCheck(s)) {
    s.phase = 'over'
    s.result = 'win'
  } else if (isStuck(s)) {
    s.phase = 'over'
    s.result = 'lose'
    s.loseReason = '公司補好了你需要的弱點，攻擊路線被封死了'
  }
  yield { t: 'end', result: s.result }
}

/** 不管怎麼打都已經不可能達成任務（路線被封死） */
export function isStuck(s: GameState): boolean {
  return !routeExists(s)
}

/** 給模擬器用：一次跑完回合結束並開始下一個駭客回合 */
export function endTurn(s: GameState): void {
  for (const _ of endOfTurn(s)) {
    // 逐步推進
  }
  if (s.phase !== 'over') startHackerTurn(s)
}

// ───────────────────────── 開局 ─────────────────────────

function newNode(id: string, name: string, role: GameNode['role'], kind: GameNode['kind'], layer: GameNode['layer'], slots: Slot[]): GameNode {
  return {
    id,
    name,
    role,
    kind,
    layer,
    slots,
    controlled: false,
    controlSeq: 0,
    timer: 0,
    sealed: false,
    entry: null,
    paralyzed: 0,
    virus: false,
    excluded: {},
  }
}

/**
 * 抽節點底下的牌。每種弱點在同一個節點上只會出現一次：
 * 要嘛是弱點牌、要嘛是它的「已防護」牌——不會同時出現，所以開局的弱點不會被自己的防護抵銷。
 */
function drawSlots(
  s: GameState,
  scenario: ScenarioId,
  kind: GameNode['kind'],
  role: GameNode['role'],
  count: number,
): Slot[] {
  const sc = SCENARIOS[scenario]
  const vw = (v: VulnId) => sc.vulnCopies[v] ?? 1
  const sw = (v: VulnId) => (sc.shieldCopies[v] ?? 1) * TUNING.shieldWeight
  const pool = vulnPool(kind, role).slice()
  const out: Slot[] = []
  for (let k = 0; k < count && pool.length; k++) {
    const total = pool.reduce((a, v) => a + vw(v) + sw(v), 0)
    let r = rnd(s) * total
    let at = 0
    for (let i = 0; i < pool.length; i++) {
      r -= vw(pool[i]) + sw(pool[i])
      if (r <= 0) {
        at = i
        break
      }
    }
    const v = pool.splice(at, 1)[0]
    const shield = rnd(s) < sw(v) / (vw(v) + sw(v))
    out.push({ vuln: v, shield, vis: 0, fixed: false })
  }
  return out
}

/** 理想打法下能控制到哪裡（忽略費用、噪音與公司的反應） */
function idealClosure(s0: GameState): GameState {
  const s = clone(s0)
  const ids: CardId[] = ['phish', 'social', 'cred', 'tail', 'mfa', 'brute', 'exploit', 'inject', 'skill', 'usb', 'lateral', 'alarm', 'wipe']
  let changed = true
  let guard = 0
  while (changed && guard++ < 20) {
    changed = false
    for (const id of ids) {
      const targets: Array<GameNode | null> =
        CARDS[id].targeting === 'node'
          ? s.nodes.filter((n) => isEmployee(n) && !n.controlled)
          : [implicitTarget(s, id)]
      for (const t of targets) {
        if (!legal(s, id, t)) continue
        if (condition(s, trueHas, id, t) !== 'Y') continue
        const before = ctrlCount(s) + s.nodes.filter((n) => n.paralyzed > 0).length
        resolve(s, id, t)
        if (ctrlCount(s) + s.nodes.filter((n) => n.paralyzed > 0).length !== before) changed = true
      }
    }
  }
  return s
}

/**
 * 這一局根本用不上的牌：需要的弱點，整個公司裡完全沒有。
 * 只看「有沒有」——弱點不管是蓋著、翻開、還是之後被公司修好，都算有；
 * 目標已經被控制也不影響。所以結果在一局裡不會變，開局算一次就好。
 */
export function uselessCards(s0: GameState): CardId[] {
  // 理想打法打到底的世界：能控制的都控制了，各條路線需要的前置條件就都看得到
  const c = idealClosure(initialWorld(s0))
  const usable = (id: CardId): boolean => {
    // 偵查牌（掃描、肉搜、盟友）與這局的得手牌，沒有「缺哪個弱點」的問題
    if (id === 'scan' || id === 'osint' || id === 'ally' || CARDS[id].cat === 'finish' || CARDS[id].cat === 'support') return true
    if (id === 'virus') return node(c, 'infra').controlled
    if (id === 'smooth') return condition(c, trueHas, id, null) === 'Y'
    const targets = CARDS[id].targeting === 'node' ? c.nodes.filter(isEmployee) : [implicitTarget(c, id)]
    return targets.some((t) => {
      // 把目標當成「還沒被控制」來判斷，才不會因為它剛好被打下來了，就誤以為牌用不上
      const x = clone(c)
      const xt = t ? node(x, t.id) : null
      if (xt) xt.controlled = false
      return condition(x, trueHas, id, xt) === 'Y'
    })
  }
  return CARD_IDS.filter((id) => !usable(id))
}

export function routeExists(s: GameState): boolean {
  const c = idealClosure(s)
  const boss = node(c, 'boss')
  const ai = node(c, 'ai')
  const db = node(c, 'db')
  const backup = node(c, 'backup')
  switch (s.mission) {
    case 'ransom':
      return db.controlled && (effective(backup, 'nobackup') || backup.paralyzed > 0)
    case 'espionage':
      return dbAccess(c)
    case 'bossfraud':
      return boss.controlled && c.nodes.some((e) => isEmployee(e) && e.id !== 'boss' && effective(e, 'gullible'))
    case 'airebel':
      return ai.controlled && (effective(ai, 'masterkey') || effective(ai, 'nohuman'))
    case 'sabotage': {
      const infra = node(c, 'infra')
      const it = node(c, 'it')
      return infra.controlled && (it.controlled || it.paralyzed > 0)
    }
  }
}

const KEY_VULNS: VulnId[] = [
  'curious',
  'gullible',
  'samepw',
  'lazy',
  'kind',
  'approver',
  'weakpw',
  'buggy',
  'legacy',
  'remote',
  'openSea',
  'obey',
  'nohuman',
  'selfupd',
  'masterkey',
  'allaccess',
  'privcloud',
  'nobackup',
]

/** 把某個弱點放進節點：同一個弱點的防護牌直接變成弱點牌，否則蓋掉一張防護牌或隨機一張 */
function plant(s: GameState, n: GameNode, v: VulnId) {
  const same = n.slots.findIndex((sl) => sl.vuln === v)
  if (same >= 0) {
    n.slots[same] = { vuln: v, shield: false, vis: 0, fixed: false }
    return
  }
  const sh = n.slots.map((sl, i) => (sl.shield ? i : -1)).filter((i) => i >= 0)
  const at = sh.length ? pick(s, sh) : rndInt(s, n.slots.length)
  n.slots[at] = { vuln: v, shield: false, vis: 0, fixed: false }
}

function ensureSolvable(s: GameState) {
  for (let round = 0; round < 6 && !routeExists(s); round++) {
    const cands: Array<{ n: GameNode; v: VulnId }> = []
    for (const n of s.nodes) {
      for (const v of KEY_VULNS) {
        if (!canHave(n, v) || effective(n, v)) continue
        cands.push({ n, v })
      }
    }
    const order = shuffle(s, cands)
    let done = false
    for (const c of order) {
      const trial = clone(s)
      plant(trial, node(trial, c.n.id), c.v)
      if (routeExists(trial)) {
        plant(s, c.n, c.v)
        done = true
        break
      }
    }
    if (!done && order.length) plant(s, order[0].n, order[0].v)
  }
}

export interface NewGameOptions {
  seed?: number
  scenario?: ScenarioId
  mission?: MissionId
}

export function newGame(opts: NewGameOptions = {}): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31)
  const s: GameState = {
    rng: seed,
    uidSeq: 1,
    scenario: opts.scenario ?? 'factory',
    mission: 'ransom',
    nodes: [],
    hand: [],
    deck: [],
    discard: [],
    turn: 0,
    ap: 0,
    apBase: BASE_AP,
    apBonus: 0,
    apCarry: 0,
    carryBoost: 0,
    alert: 0,
    noiseThisTurn: 0,
    freePlayReady: false,
    controlSeq: 0,
    hold: 0,
    phase: 'hacker',
    result: null,
    loseReason: null,
    plays: [],
    exploited: [],
    patched: 0,
    recaptured: 0,
    noiseTotal: 0,
  }
  s.mission = opts.mission ?? pick(s, MISSION_IDS)
  for (const t of NODE_TEMPLATES) {
    s.nodes.push(newNode(t.id, t.name, t.role, t.kind, t.layer, drawSlots(s, s.scenario, t.kind, t.role, t.draw)))
  }
  ensureSolvable(s)
  // 還是無解（例如「假老闆詐騙」需要同時湊齊兩個條件）：整副重抽
  for (let a = 0; a < 40 && !routeExists(s); a++) {
    for (const n of s.nodes) {
      const t = NODE_TEMPLATES.find((x) => x.id === n.id)!
      n.slots = drawSlots(s, s.scenario, t.kind, t.role, t.draw)
    }
    ensureSolvable(s)
  }
  // 手牌牌堆：只放這個任務用得到的「得手」牌；需要的弱點場上完全沒有的牌，整張不放進牌堆
  const finisher = MISSIONS[s.mission].finisher
  const useless = uselessCards(s)
  const deck: CardInst[] = []
  for (const id of CARD_IDS) {
    if (CARDS[id].cat === 'finish' && id !== finisher) continue
    if (useless.includes(id)) continue
    const n = CARD_COPIES[id] ?? 1
    for (let i = 0; i < n; i++) deck.push({ uid: s.uidSeq++, id })
  }
  s.deck = shuffle(s, deck)
  startHackerTurn(s)
  return s
}

/** 覆盤用：回到「開局的世界」（沒人被控制、修補過的弱點還原） */
function initialWorld(s: GameState): GameState {
  const c = clone(s)
  for (const n of c.nodes) {
    n.controlled = false
    n.entry = null
    n.virus = false
    n.timer = 0
    n.paralyzed = 0
    for (const sl of n.slots) {
      sl.fixed = false
      delete sl.timer
    }
  }
  return c
}

/** 覆盤用：假設開局前某個弱點就被修好了，這局的攻擊路線還走得通嗎 */
export function routeWithout(s: GameState, e: Entry): boolean {
  const c = initialWorld(s)
  const n = node(c, e.node)
  for (const sl of n.slots) if (sl.vuln === e.vuln && !sl.shield) sl.fixed = true
  return routeExists(c)
}

/** 覆盤用：這個世界裡的「單點弱點」——只要修好它，任務的攻擊路線就整個走不通 */
export function criticalVulns(s: GameState): Entry[] {
  const base = initialWorld(s)
  if (!routeExists(base)) return []
  const out: Entry[] = []
  const seen = new Set<string>()
  for (const n of base.nodes) {
    for (const sl of n.slots) {
      if (sl.shield || !effective(n, sl.vuln)) continue
      const key = n.id + ':' + sl.vuln
      if (seen.has(key)) continue
      seen.add(key)
      if (!routeWithout(s, { node: n.id, vuln: sl.vuln })) out.push({ node: n.id, vuln: sl.vuln })
    }
  }
  return out
}
