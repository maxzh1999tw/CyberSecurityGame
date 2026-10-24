// 公司模式的規則：招募、擺放、經濟、公司的牌、勝負（不依賴畫面）
// 規則草案：docs/公司方模式設計.md
import { VULNS, VULN_RISK, repairTurnsOf, vulnPool } from './data.ts'
import {
  BASE_DECK,
  COMPANY,
  COMPANY_CARDS,
  DEFAULT_BRAND,
  FIX_VULN,
  HIRES,
  HIRE_KINDS,
  INFRA_SEATS,
  MACHINE_NAMES,
  PERSONAS,
  REQUIRED,
  TIER_ODDS,
  TIER_VULNS,
  tierStats,
} from './companyData.ts'
import type { Playability } from './engine.ts'
import {
  effective,
  isEmployee,
  newGame,
  node,
  pick,
  recaptureNode,
  rnd,
  isStuck,
  MAX_ALERT,
  rndInt,
  shuffle,
  startHackerTurn,
} from './engine.ts'
import type { Persona } from './companyData.ts'
import type {
  CompanyBrand,
  CompanyCardId,
  CompanyCardInst,
  CompanyState,
  GameNode,
  GameState,
  HireKind,
  Layer,
  MissionId,
  NodeKind,
  NodeRole,
  Slot,
  Tier,
  Tri,
  VulnId,
} from './types.ts'

// ───────────────────────── 招募：人力市場 ─────────────────────────

export interface Candidate {
  uid: number
  hire: HireKind
  tier: Tier
  name: string
  art: string
  role: NodeRole
  kind: NodeKind
  cost: number
  value: number
  /** 底下的牌：公司看不到 */
  slots: Slot[]
}

export type Placement = Record<number, Layer>

export interface DraftState {
  rng: number
  uidSeq: number
  assets: number
  /** 人力市場：每個分類都有一批候選人（遠多於需要） */
  market: Record<HireKind, Candidate[]>
  /** 已經放進公司的節點 */
  picks: Candidate[]
  /** 每個節點擺在哪一層 */
  placement: Placement
  usedNames: string[]
  /** 玩家自己取的公司名稱與 logo */
  brand: CompanyBrand
}

type Rng = { rng: number }

function rollTier(r: Rng): Tier {
  let x = rnd(r)
  for (const t of [1, 2, 3] as Tier[]) {
    x -= TIER_ODDS[t]
    if (x <= 0) return t
  }
  return 3
}

/**
 * 抽候選人底下的牌：弱點有幾個看等級（一星 3 個、二星 2 個、三星 1 個），其餘是防護，位置隨機。
 * 公司模式不分產業，這種節點可能有的弱點每一種機會都一樣。
 */
function rollSlots(r: Rng, kind: NodeKind, role: NodeRole, tier: Tier, count: number): Slot[] {
  const pool = vulnPool(kind, role).slice()
  const out: Slot[] = []
  for (let k = 0; k < count && pool.length; k++) {
    const vuln = pool.splice(rndInt(r, pool.length), 1)[0]
    out.push({ vuln, shield: false, vis: 0, fixed: false })
  }
  // 弱點以外的牌隨機挑幾張變成防護
  let shields = Math.max(0, out.length - TIER_VULNS[tier])
  while (shields > 0) {
    const sl = out[rndInt(r, out.length)]
    if (sl.shield) continue
    sl.shield = true
    shields -= 1
  }
  return out
}

/**
 * 人物：名字、頭像、星級固定成一組。挑一位還沒出現過、星級符合的人；
 * 這個星級的人都用完了，就改挑其他星級還沒出現過的人（同一個人不會出現兩次）。
 */
function personaFor(r: Rng, hire: 'staff' | 'exec' | 'it', tier: Tier, used: string[]): Persona {
  const free = PERSONAS[hire].filter((p) => !used.includes(p.name))
  const sameTier = free.filter((p) => p.tier === tier)
  const p = sameTier.length ? pick(r, sameTier) : free.length ? pick(r, free) : pick(r, PERSONAS[hire].filter((x) => x.tier === tier))
  used.push(p.name)
  return p
}

/** 機器：依等級取名，破爛的很陽春，頂規的聽起來很厲害 */
function machineName(r: Rng, hire: 'ai' | 'db' | 'backup' | 'infra', tier: Tier, used: string[]): string {
  const pool = MACHINE_NAMES[hire][tier]
  const free = pool.filter((x) => !used.includes(x))
  const name = free.length ? pick(r, free) : `${pick(r, pool)} ${used.length}`
  used.push(name)
  return name
}

/** 產生一位候選人（等級、名字、成本、產值、底下的牌都是隨機的） */
export function makeCandidate(r: Rng & { uidSeq: number }, hire: HireKind, used: string[], tier?: Tier): Candidate {
  const def = HIRES[hire]
  const want = tier ?? rollTier(r)
  // 人：名字、頭像、星級是固定的一組（星級跟著人走）；機器：名字看等級，頭像固定
  const person = hire === 'staff' || hire === 'exec' || hire === 'it' ? personaFor(r, hire, want, used) : null
  const t = person ? person.tier : want
  const { cost, value } = tierStats(hire, t)
  const within = ([lo, hi]: [number, number]) => lo + rndInt(r, hi - lo + 1)
  const role = person?.role ?? pick(r, def.roles)
  return {
    uid: r.uidSeq++,
    hire,
    tier: t,
    name: person ? person.name : machineName(r, hire as 'ai' | 'db' | 'backup' | 'infra', t, used),
    art: person ? person.art : pick(r, def.arts),
    role,
    kind: def.nodeKind,
    ...costAndValue(within(cost), def.productive ? within(value) : 0, def.productive),
    slots: rollSlots(r, def.nodeKind, role, t, def.slots),
  }
}

/** 賺錢的節點最差就是不賺不賠：薪水不會超過產值 */
function costAndValue(cost: number, value: number, productive: boolean) {
  return { cost: productive ? Math.min(cost, value) : cost, value }
}

const countOf = (picks: Candidate[], hire: HireKind) => picks.filter((p) => p.hire === hire).length

/** 這些基礎設施總共能支援幾個有產值的節點（看各自的等級） */
export const seatsOf = (picks: Array<{ hire: HireKind; tier: Tier }>) =>
  picks.filter((p) => p.hire === 'infra').reduce((a, p) => a + INFRA_SEATS[p.tier], 0)

/** 多台基礎設施的加價：第 2 台起每台每回合多付 extraInfraCost */
export const infraSurcharge = (infraCount: number) => Math.max(0, infraCount - 1) * COMPANY.extraInfraCost

/** 有產值的節點有幾個 */
export const productiveCount = (picks: Candidate[]) => picks.filter((p) => HIRES[p.hire].productive).length
/**
 * 組建時，基礎設施撐得住幾個有產值的節點（硬上限：滿了就不能再聘，要先多聘一台基礎設施）。
 * 還沒聘基礎設施時先當作有一台，玩家才能照自己的順序拖人進來；開業前會檢查真的有沒有聘。
 */
export const infraSeats = (picks: Candidate[]) => (countOf(picks, 'infra') ? seatsOf(picks) : INFRA_SEATS[3])

/** 還缺哪些必要的種類（缺幾個就列幾次） */
export function missingKinds(picks: Candidate[]): HireKind[] {
  const out: HireKind[] = []
  for (const hire of HIRE_KINDS) {
    for (let k = countOf(picks, hire); k < REQUIRED[hire]; k++) out.push(hire)
  }
  return out
}

export function newDraft(seed?: number): DraftState {
  const d: DraftState = {
    rng: seed ?? Math.floor(Math.random() * 2 ** 31),
    uidSeq: 1,
    assets: COMPANY.startAssets,
    market: { staff: [], exec: [], ai: [], it: [], infra: [], db: [], backup: [] },
    picks: [],
    placement: {},
    usedNames: [],
    brand: { ...DEFAULT_BRAND },
  }
  for (const hire of HIRE_KINDS) {
    // 每一類每個星級至少各有幾位（菜鳥／資深／王牌或破爛／標準／頂規；IT、主管、AI、基礎設施各 2 位），其餘隨機
    const per = COMPANY.marketPerTier[hire] ?? 1
    for (let k = 0; k < COMPANY.marketSize[hire]; k++) {
      const tier = k < 3 * per ? ((Math.floor(k / per) + 1) as Tier) : undefined
      d.market[hire].push(makeCandidate(d, hire, d.usedNames, tier))
    }
    sortMarket(d, hire)
  }
  return d
}

/** 依等級排好，同等級再看產值，方便比較 */
function sortMarket(d: DraftState, hire: HireKind) {
  d.market[hire].sort((a, b) => a.tier - b.tier || b.value - a.value || a.cost - b.cost)
}

/** 人力市場多刷幾位二星、三星的人選（快速配置不用一星排不到門檻時用） */
export function addMarketCandidates(d: DraftState, hires: HireKind[], perTier = 2) {
  for (const hire of hires) {
    for (const tier of [2, 3] as Tier[]) {
      for (let k = 0; k < perTier; k++) d.market[hire].push(makeCandidate(d, hire, d.usedNames, tier))
    }
    sortMarket(d, hire)
  }
}

export const LAYER_NAMES = ['外圍', '內網', '核心'] as const

export const layerCount = (d: DraftState, layer: Layer) => d.picks.filter((p) => d.placement[p.uid] === layer).length

/** 這位候選人能不能放進這一層；不行的話回傳原因 */
export function placeProblem(d: DraftState, c: Candidate, layer: Layer): string | null {
  if (!HIRES[c.hire].layers.includes(layer)) {
    return `${HIRES[c.hire].label}只能擺在${HIRES[c.hire].layers.map((l) => LAYER_NAMES[l]).join('或')}`
  }
  // 新聘賺錢的人：先看基礎設施撐不撐得住（這是最根本的原因），再看這一層滿了沒
  if (!d.picks.includes(c) && HIRES[c.hire].productive && productiveCount(d.picks) >= infraSeats(d.picks)) {
    return `基礎設施只能支援 ${infraSeats(d.picks)} 個有產值的節點：先多聘一台基礎設施`
  }
  const already = d.placement[c.uid] === layer && d.picks.includes(c)
  if (!already && layerCount(d, layer) >= COMPANY.layerMax) return `${LAYER_NAMES[layer]}已經滿了（最多 ${COMPANY.layerMax} 個）`
  return null
}

/** 這種節點預設擺哪一層：第一個放得下的層 */
export function defaultLayer(d: DraftState, c: Candidate): Layer | null {
  for (const layer of HIRES[c.hire].layers) if (!placeProblem(d, c, layer)) return layer
  return null
}

/** 從市場聘進公司，擺到指定的層 */
export function hireTo(d: DraftState, uid: number, layer: Layer): string | null {
  for (const hire of HIRE_KINDS) {
    const i = d.market[hire].findIndex((c) => c.uid === uid)
    if (i < 0) continue
    const c = d.market[hire][i]
    const problem = placeProblem(d, c, layer)
    if (problem) return problem
    d.market[hire].splice(i, 1)
    d.picks.push(c)
    d.placement[c.uid] = layer
    return null
  }
  return '找不到這位候選人'
}

/** 已經在公司裡的節點換一層 */
export function moveTo(d: DraftState, uid: number, layer: Layer): string | null {
  const c = d.picks.find((p) => p.uid === uid)
  if (!c) return '找不到這個節點'
  const problem = placeProblem(d, c, layer)
  if (problem) return problem
  d.placement[uid] = layer
  return null
}

/** 從公司移回市場 */
export function fire(d: DraftState, uid: number) {
  const i = d.picks.findIndex((p) => p.uid === uid)
  if (i < 0) return
  const c = d.picks.splice(i, 1)[0]
  delete d.placement[uid]
  // 放回市場時照等級排好（市場本來就是由低到高排）
  const list = d.market[c.hire]
  const at = list.findIndex((o) => o.tier > c.tier)
  list.splice(at < 0 ? list.length : at, 0, c)
}

// ───────────────────────── 擺放 ─────────────────────────

/** 擺放有哪些不合規則的地方 */
export function placementErrors(picks: Candidate[], placement: Placement): string[] {
  const errors: string[] = []
  for (const p of picks) {
    const layer = placement[p.uid]
    if (layer === undefined || !HIRES[p.hire].layers.includes(layer)) errors.push(`${p.name}不能擺在${LAYER_NAMES[layer ?? 0]}`)
  }
  for (const layer of [0, 1, 2] as Layer[]) {
    const n = picks.filter((p) => placement[p.uid] === layer).length
    if (n > COMPANY.layerMax) errors.push(`${LAYER_NAMES[layer]}最多 ${COMPANY.layerMax} 個節點`)
  }
  const at = (hire: HireKind, layer: Layer) => picks.filter((p) => p.hire === hire && placement[p.uid] === layer).length
  if (at('staff', 0) < COMPANY.minOuterStaff) errors.push(`外圍至少要有 ${COMPANY.minOuterStaff} 位一般員工`)
  if (at('it', 1) < 1) errors.push('內網至少要有 1 位 IT')
  if (at('infra', 1) < 1) errors.push('內網至少要有 1 台基礎設施')
  if (at('db', 2) < 1) errors.push('核心至少要有 1 個資料庫')
  if (at('backup', 2) < 1) errors.push('核心至少要有 1 個備份')
  const seats = seatsOf(picks)
  if (productiveCount(picks) > seats) {
    errors.push(`基礎設施最多支援 ${seats} 個有產值的節點，現在有 ${productiveCount(picks)} 個`)
  }
  return errors
}

/** 還不能開業的原因：擺放規則，以及每回合收益太低 */
export function openErrors(d: DraftState): string[] {
  const errors = placementErrors(d.picks, d.placement)
  const net = forecast(d.picks, d.placement).net
  if (net < COMPANY.minNet) errors.push(`每回合收益至少要 +${COMPANY.minNet}K（目前 ${net >= 0 ? '+' : ''}${net}K）`)
  return errors
}

/** 擺放時的營收試算：和 productionOf 同一套公式（還沒開局，全部節點都在運作） */
export function forecast(picks: Candidate[], placement: Placement) {
  const productive = picks.filter((p) => p.value > 0)
  let lead = 0
  for (const e of productive) {
    if (e.hire !== 'exec') continue
    const staff = productive.filter((p) => p.hire === 'staff' && placement[p.uid] === placement[e.uid]).length
    lead += Math.min(COMPANY.leadMax, staff) * COMPANY.leadValue
  }
  const gross = productive.reduce((a, p) => a + p.value, 0) + lead
  const surcharge = infraSurcharge(countOf(picks, 'infra'))
  const upkeep = picks.reduce((a, p) => a + p.cost, 0) + surcharge
  return { gross, lead, upkeep, surcharge, net: gross - upkeep }
}

// ───────────────────────── 開局 ─────────────────────────

function nodeFrom(c: Candidate, id: string, layer: Layer): GameNode {
  return {
    id,
    name: c.name,
    role: c.role,
    kind: c.kind,
    layer,
    art: c.art,
    slots: c.slots.map((sl) => ({ ...sl })),
    controlled: false,
    controlSeq: 0,
    timer: 0,
    sealed: false,
    entry: null,
    paralyzed: 0,
    virus: false,
    excluded: {},
    econ: { hire: c.hire, tier: c.tier, cost: c.cost, value: c.value },
  }
}

function buildDeck(s: GameState): CompanyCardInst[] {
  const ids: CompanyCardId[] = [...BASE_DECK]
  let staff = 0
  for (const n of s.nodes) {
    if (!n.econ) continue
    ids.push(...HIRES[n.econ.hire].cards)
    // 每 2 位一般員工帶進一張加班趕工
    if (n.econ.hire === 'staff' && ++staff % 2 === 0) ids.push('overtime')
  }
  return shuffle(s, ids.map((id) => ({ uid: s.uidSeq++, id })))
}

export interface CompanyGameOptions {
  seed?: number
  mission?: MissionId
}

/** 用招募與擺放好的公司開局；駭客先手（駭客的第 1 回合已經開始） */
export function buildCompanyGame(d: DraftState, opts: CompanyGameOptions = {}): GameState {
  const placement = d.placement
  const order: Layer[] = [2, 1, 0]
  const counters: Partial<Record<HireKind, number>> = {}
  const nodes: GameNode[] = []
  // 依層級由內到外排列，畫面上同層的節點順序固定
  for (const layer of order) {
    for (const c of d.picks) {
      if (placement[c.uid] !== layer) continue
      const k = (counters[c.hire] = (counters[c.hire] ?? 0) + 1)
      nodes.push(nodeFrom(c, `${c.hire}${k}`, layer))
    }
  }
  const s = newGame({ seed: opts.seed ?? d.rng, mission: opts.mission, nodes })
  s.company = {
    brand: { ...d.brand, name: d.brand.name.trim() || DEFAULT_BRAND.name },
    assets: d.assets,
    income: 0,
    hand: [],
    deck: [],
    discard: [],
    turn: 0,
    missionKnown: false,
    monitor: 0,
    insurance: false,
    debts: [],
    outcome: null,
    hackerAp: COMPANY.hackerAp,
    perfectStreak: 0,
    drawPerTurn: COMPANY.draw,
    freeSwaps: 0,
    trainingNext: false,
  }
  // 每回合抽幾張：開業時就固定，之後員工被控制、隔離、癱瘓都不會改變
  s.company.drawPerTurn = COMPANY.draw + Math.floor(staffCount(s) / COMPANY.staffPerDraw)
  s.company.deck = buildDeck(s)
  // 開場就抽好公司的起手牌：駭客行動時就能先看手牌盤算（第 1 個公司回合不再抽）
  drawCompany(s, COMPANY.openingHand)
  // 駭客的第 1 回合在開局時就開始了，補上公司模式的行動點加成
  s.apBase += s.company.hackerAp
  s.ap += s.company.hackerAp
  return s
}

// ───────────────────────── 公司的知識 ─────────────────────────

/** 公司知道這張牌是什麼：被駭客揭露（公開），或公司自己稽核過 */
export const companyKnows = (sl: Slot) => sl.vis === 2 || !!sl.known

/**
 * 猜弱點的修補牌：公司看來這個節點有沒有這個弱點。
 * Y：已確認有；M：還不知道，可能有；N：不可能有（這種節點不會有、已確認是防護、或猜過確定沒有）。
 */
export function fixGuess(n: GameNode, v: VulnId): Tri {
  if (!vulnPool(n.kind, n.role).includes(v) || n.cleared?.includes(v)) return 'N'
  for (const sl of n.slots) {
    if (sl.vuln === v && companyKnows(sl)) return sl.shield || sl.fixed ? 'N' : 'Y'
  }
  return n.slots.every(companyKnows) ? 'N' : 'M'
}

/** 公司已知、而且還有效的弱點 */
export function knownVulns(n: GameNode): number[] {
  const out: number[] = []
  n.slots.forEach((sl, i) => {
    if (companyKnows(sl) && !sl.shield && !sl.fixed && effective(n, sl.vuln)) out.push(i)
  })
  return out
}

const unknownSlots = (n: GameNode) => n.slots.map((sl, i) => (companyKnows(sl) ? -1 : i)).filter((i) => i >= 0)

const isPerson = (n: GameNode) => isEmployee(n)
const isMachine = (n: GameNode) => n.role === 'infra' || n.role === 'db' || n.role === 'backup'
const hireOf = (n: GameNode) => n.econ?.hire
/** 這個節點這回合有在運作（沒被癱瘓、隔離、也不在受訓） */
const working = (n: GameNode) => n.paralyzed <= 0 && !n.isolated && !n.training

// ───────────────────────── 經濟 ─────────────────────────

export interface Production {
  /** 有產值節點的產值總和（含主管加成） */
  gross: number
  /** 主管帶來的加成 */
  lead: number
  /** 薪水與維護費（含多台基礎設施的加價） */
  upkeep: number
  /** 其中第 2 台起基礎設施的加價 */
  surcharge: number
  /** 拉攏投資的還款 */
  debt: number
  /** 每回合營收：下個公司回合開始時，照當時有在運作的節點入帳 */
  net: number
}

export function productionOf(s: GameState): Production {
  const co = s.company!
  const productive = s.nodes.filter((n) => n.econ && n.econ.value > 0 && working(n))
  // 主管：同層每位運作中的一般員工 +5K（每位主管最多帶 3 位）
  let lead = 0
  for (const e of productive) {
    if (hireOf(e) !== 'exec') continue
    const staff = productive.filter((n) => hireOf(n) === 'staff' && n.layer === e.layer).length
    lead += Math.min(COMPANY.leadMax, staff) * COMPANY.leadValue
  }
  const gross = productive.reduce((a, n) => a + n.econ!.value, 0) + lead
  const surcharge = infraSurcharge(s.nodes.filter((n) => hireOf(n) === 'infra').length)
  const upkeep = s.nodes.reduce((a, n) => a + (n.econ?.cost ?? 0), 0) + surcharge
  const debt = co.debts.reduce((a, x) => a + x.amount, 0)
  return {
    gross,
    lead,
    upkeep,
    surcharge,
    debt,
    net: gross - upkeep - debt,
  }
}

export function companyCardCost(_s: GameState, id: CompanyCardId): number {
  return COMPANY_CARDS[id].cost
}

// ───────────────────────── 公司的牌 ─────────────────────────

const severity = (v: VulnId) => VULN_RISK[v].severe + VULN_RISK[v].notice

/** 這張牌可以指定哪些節點 */
export function companyTargets(s: GameState, id: CompanyCardId): string[] {
  const ok = (f: (n: GameNode) => boolean) => s.nodes.filter(f).map((n) => n.id)
  switch (id) {
    case 'audit':
    case 'pentest':
      return ok((n) => unknownSlots(n).length > 0)
    case 'patch':
      return ok((n) => (isMachine(n) || n.kind === 'ai') && knownVulns(n).length > 0)
    case 'reminder':
      return ok((n) => isPerson(n) && !n.training && knownVulns(n).length > 0)
    case 'upgrade':
      return ok((n) => (isMachine(n) || n.kind === 'ai') && (n.econ?.tier ?? 3) < 3)
    case 'replace':
      return ok((n) => isPerson(n))
    case 'aiReview':
      return ok((n) => n.kind === 'ai' && knownVulns(n).length > 0)
    case 'recapture':
      return ok((n) => n.controlled)
    case 'isolate':
      return ok((n) => !n.isolated && (n.isolateReady ?? 0) <= (s.company?.turn ?? 0))
    case 'lockout':
      return ok((n) => n.controlled && isPerson(n))
    case 'failover':
      return ok((n) => n.role === 'infra' && n.paralyzed > 0)
    case 'restoreDrill':
      return ok((n) => n.role === 'backup' && (n.paralyzed > 0 || unknownSlots(n).length > 0))
    default: {
      // 猜弱點的修補牌：可能有這個弱點的節點都能指定；教育訓練中，同一層有員工可能有就能指定
      const v = FIX_VULN[id]
      if (!v) return []
      const group = trainingBoosts(s, id)
      return ok((n) => fixGuess(n, v) !== 'N' || (group && s.nodes.some((p) => p.layer === n.layer && isPerson(p) && fixGuess(p, v) !== 'N')))
    }
  }
}

/** 公司現在能不能打這張牌（不看錢：成本可以把營收扣成負的） */
export function canPlayCompany(s: GameState, id: CompanyCardId): boolean {
  return s.phase === 'company' && companyCardUsable(s, id)
}

/** 資產付不起 cost：不能打這張牌、不能付費換牌 */
export function overBudget(s: GameState, cost: number): boolean {
  return cost > 0 && s.company!.assets - cost < 0
}

/** 這張牌在目前的局面有沒有用處（不管現在輪到誰；駭客回合時手牌也照這個顯示） */
export function companyCardUsable(s: GameState, id: CompanyCardId): boolean {
  const co = s.company
  if (!co) return false
  const def = COMPANY_CARDS[id]
  if (overBudget(s, companyCardCost(s, id))) return false
  if (def.target) return companyTargets(s, id).length > 0
  switch (id) {
    case 'intel':
      // 駭客露出夠多痕跡（警戒值夠高）才查得到他的目的
      return !co.missionKnown && s.alert >= COMPANY.intelAlert
    case 'monitor':
      return co.monitor === 0
    case 'invest':
      return s.nodes.some((n) => hireOf(n) === 'exec' && !n.controlled)
    case 'insurance':
      return !co.insurance
    case 'pr':
      return s.alert < MAX_ALERT
    case 'execCoach':
      return canDraw(s) && s.nodes.some((n) => hireOf(n) === 'exec' && !n.controlled)
    case 'training':
      return !co.trainingNext && s.nodes.some(isPerson)
    default:
      return true
  }
}

/** 牌庫或棄牌堆還有牌可以抽（打出去的那張不算） */
const canDraw = (s: GameState) => s.company!.deck.length + s.company!.discard.length > 0

/** 公司裡的一般員工（不管有沒有被控制、隔離） */
const staffCount = (s: GameState) => s.nodes.filter((n) => hireOf(n) === 'staff').length

export interface CompanyEffect {
  ok: boolean
  card: CompanyCardId
  target: string | null
  cost: number
  /** 公司這次看到的牌 */
  revealed: Array<{ node: string; idx: number }>
  /** 修好或變成防護的牌 */
  fixed: Array<{ node: string; idx: number }>
  /** 奪回的節點 */
  recaptured: string[]
  /** 換新的節點 */
  renewed: string[]
  /** 這張牌抽到的牌 */
  drawn: CompanyCardInst[]
  message: string
}

function revealForCompany(n: GameNode, idx: number, out: CompanyEffect) {
  const sl = n.slots[idx]
  sl.known = true
  // 公司知道的弱點開始修補倒數（和被駭客公開的弱點一樣）
  if (!sl.shield && !sl.fixed && effective(n, sl.vuln) && sl.timer === undefined) sl.timer = repairTurnsOf(sl.vuln)
  out.revealed.push({ node: n.id, idx })
}

/** 換新節點：新的牌、新的人或新的設備，駭客的控制一併清除 */
function renew(s: GameState, n: GameNode, tier: Tier) {
  const hire = n.econ!.hire
  const used = s.nodes.map((x) => x.name).filter((x) => x !== n.name)
  const fresh = makeCandidate(s as GameState & { uidSeq: number }, hire, used, tier)
  Object.assign(n, {
    name: fresh.name,
    art: fresh.art,
    role: fresh.role,
    slots: fresh.slots,
    controlled: false,
    entry: null,
    virus: false,
    paralyzed: 0,
    timer: 0,
    sealed: false,
    excluded: {},
    training: false,
    econ: { hire, tier: fresh.tier, cost: fresh.cost, value: fresh.value },
  })
}

/** 這張牌會不會被教育訓練放大：教育訓練生效中，而且它修的是員工會有的弱點 */
export function trainingBoosts(s: GameState, id: CompanyCardId): boolean {
  if (!s.company?.trainingNext) return false
  if (id === 'reminder') return true
  const v = FIX_VULN[id]
  return !!v && (VULNS[v].kinds?.includes('employee') ?? VULNS[v].kind === 'employee')
}

/** 教育訓練：目標那一層的所有員工（加上目標本身）一起修這個弱點，沒發現的也修好；員工下回合沒有產值 */
function trainLayer(s: GameState, t: GameNode, v: VulnId, eff: CompanyEffect) {
  s.company!.trainingNext = false
  const group = s.nodes.filter((n) => n === t || (n.layer === t.layer && isPerson(n)))
  for (const n of group) {
    if (isPerson(n)) n.training = true
    const idx = n.slots.findIndex((sl) => sl.vuln === v && !sl.shield && !sl.fixed)
    if (idx >= 0) {
      n.slots[idx].shield = true
      n.slots[idx].known = true
      eff.fixed.push({ node: n.id, idx })
    } else {
      n.cleared = [...(n.cleared ?? []), v]
    }
  }
  const people = group.filter(isPerson).length
  eff.ok = eff.fixed.length > 0
  eff.message = eff.ok
    ? `${LAYER_NAMES[t.layer]} ${people} 位員工受訓，修好 ${eff.fixed.length} 個「${VULNS[v].name}」`
    : `${LAYER_NAMES[t.layer]}沒有人有「${VULNS[v].name}」：大家白上了一堂課`
}

/** 公司出牌 */
export function playCompanyCard(s: GameState, uid: number, targetId?: string): CompanyEffect {
  const co = s.company
  if (!co) throw new Error('不是公司模式')
  const i = co.hand.findIndex((c) => c.uid === uid)
  if (i < 0) throw new Error('手上沒有這張牌')
  const id = co.hand[i].id
  const def = COMPANY_CARDS[id]
  if (!canPlayCompany(s, id)) throw new Error('現在不能打這張牌')
  const t = targetId ? node(s, targetId) : null
  if (def.target && (!t || !companyTargets(s, id).includes(t.id))) throw new Error('這個目標不能用')
  const cost = companyCardCost(s, id)
  co.assets -= cost
  const played = co.hand.splice(i, 1)
  const eff: CompanyEffect = { ok: true, card: id, target: t?.id ?? null, cost, revealed: [], fixed: [], recaptured: [], renewed: [], drawn: [], message: '' }

  switch (id) {
    case 'audit': {
      // 先揭露還藏著的弱點；這個節點已經沒有藏著的弱點，才會翻到防護
      const hidden = unknownSlots(t!)
      const bad = hidden.filter((i) => !t!.slots[i].shield && !t!.slots[i].fixed)
      const idx = pick(s, bad.length ? bad : hidden)
      revealForCompany(t!, idx, eff)
      break
    }
    case 'pentest':
      for (const idx of unknownSlots(t!)) revealForCompany(t!, idx, eff)
      break
    case 'intel':
      co.missionKnown = true
      break
    case 'patch':
    case 'aiReview': {
      // 先修最嚴重的已知弱點
      const idx = knownVulns(t!).sort((a, b) => severity(t!.slots[b].vuln) - severity(t!.slots[a].vuln))[0]
      t!.slots[idx].fixed = true
      eff.fixed.push({ node: t!.id, idx })
      break
    }
    case 'training':
      co.trainingNext = true
      eff.message = '下一張修補員工弱點的牌，會對整層員工生效'
      break
    case 'reminder': {
      const idx = knownVulns(t!).sort((a, b) => severity(t!.slots[b].vuln) - severity(t!.slots[a].vuln))[0]
      if (co.trainingNext) {
        trainLayer(s, t!, t!.slots[idx].vuln, eff)
        break
      }
      t!.slots[idx].shield = true
      t!.training = true
      eff.fixed.push({ node: t!.id, idx })
      break
    }
    default: {
      const v = FIX_VULN[id]
      if (!v) break
      if (trainingBoosts(s, id)) {
        trainLayer(s, t!, v, eff)
        break
      }
      // 猜猜看：這個節點真的有這個弱點就修好（公司也就確認了）；沒有就白費，但公司記住它沒有
      const idx = t!.slots.findIndex((sl) => sl.vuln === v && !sl.shield && !sl.fixed)
      if (idx >= 0) {
        t!.slots[idx].shield = true
        t!.slots[idx].known = true
        eff.fixed.push({ node: t!.id, idx })
      } else {
        eff.ok = false
        t!.cleared = [...(t!.cleared ?? []), v]
        eff.message = `${t!.name}沒有「${VULNS[v].name}」：白費了`
      }
      break
    }
    case 'upgrade':
      renew(s, t!, Math.min(3, (t!.econ?.tier ?? 1) + 1) as Tier)
      eff.renewed.push(t!.id)
      break
    case 'replace':
      renew(s, t!, (1 + rndInt(s, 3)) as Tier)
      eff.renewed.push(t!.id)
      break
    case 'recapture':
      recaptureNode(s, t!)
      eff.recaptured.push(t!.id)
      break
    case 'lockout':
      t!.controlled = false
      t!.entry = null
      t!.virus = false
      t!.timer = 0
      eff.recaptured.push(t!.id)
      break
    case 'isolate':
      t!.isolated = true
      t!.isolateLeft = COMPANY.isolateTurns
      break
    case 'monitor':
      co.monitor += 1
      break
    case 'failover':
      t!.paralyzed = 0
      break
    case 'restoreDrill':
      t!.paralyzed = 0
      for (const idx of unknownSlots(t!)) revealForCompany(t!, idx, eff)
      break
    case 'overtime': {
      co.assets += COMPANY.overtimeBonus
      // 過勞：隨機一位一般員工的一張防護變成蓋著的弱點
      const tired = s.nodes.filter((n) => hireOf(n) === 'staff' && n.slots.some((sl) => sl.shield))
      if (tired.length) {
        const n = pick(s, tired)
        const sl = pick(s, n.slots.filter((x) => x.shield))
        sl.shield = false
        sl.vis = 0
        sl.known = false
        eff.message = `${n.name}累到出錯了`
      }
      break
    }
    case 'invest':
      co.assets += COMPANY.investAmount
      co.debts.push({ amount: COMPANY.investDebt, turns: COMPANY.investTurns })
      break
    case 'marketing': {
      co.assets += productionOf(s).gross
      // 曝光的代價：駭客從公開資訊查到外圍一個還沒公開的弱點
      const leaks = s.nodes
        .filter((n) => n.layer === 0)
        .flatMap((n) => n.slots.map((sl, idx) => ({ n, sl, idx })))
        .filter(({ sl }) => !sl.shield && !sl.fixed && sl.vis !== 2)
      if (leaks.length) {
        const { n, sl, idx } = pick(s, leaks)
        sl.vis = 2
        if (effective(n, sl.vuln) && sl.timer === undefined) sl.timer = repairTurnsOf(sl.vuln)
        eff.revealed.push({ node: n.id, idx })
        eff.message = `駭客從公開資訊查到${n.name}的「${VULNS[sl.vuln].name}」`
      }
      break
    }
    case 'promo':
      co.assets += COMPANY.promoBonus
      s.alert = Math.max(0, s.alert - 1)
      break
    case 'insurance':
      co.insurance = true
      break
    case 'pr':
      s.alert = Math.min(MAX_ALERT, s.alert + 1)
      if (s.alert >= MAX_ALERT) {
        // 公司自己把警戒推滿：駭客的行蹤當場曝光
        co.outcome = 'caught'
        s.phase = 'over'
        s.result = 'lose'
        s.loseReason = '公司把警戒值推到 10，你被抓到了'
        eff.message = '警戒值 10：抓到駭客了！'
      }
      break
    case 'execCoach':
      eff.drawn = drawCompany(s, 2)
      break
  }
  co.discard.push(...played)
  if (eff.drawn.length) eff.message = `抽了 ${eff.drawn.length} 張牌`
  checkBlocked(s)
  checkBankrupt(s)
  return eff
}

/** 公司牌的可行性，格式和駭客牌一樣，讓手牌與拖曳共用同一套畫面 */
export function companyPlayability(s: GameState, id: CompanyCardId): Playability {
  // 駭客回合時手牌照常顯示（只是先不能出），讓玩家可以先盤算
  const ok = companyCardUsable(s, id)
  const targets: Record<string, Tri> = {}
  const v = FIX_VULN[id]
  if (ok && COMPANY_CARDS[id].target) {
    for (const t of companyTargets(s, id)) targets[t] = v ? fixGuess(node(s, t), v) : 'Y'
  }
  // 猜弱點的牌：有確定的目標才是穩的，不然就是賭
  const sure = !v || Object.values(targets).includes('Y')
  return {
    cost: companyCardCost(s, id),
    free: false,
    // 公司沒有行動點：成本可以把營收扣成負的，所以輪到公司時都打得起
    affordable: s.phase === 'company',
    status: !ok ? 'dead' : sure ? 'sure' : 'maybe',
    targets,
    hint: [],
    autoTri: ok ? 'Y' : 'N',
  }
}

/** 這張公司牌現在為什麼打不出去 */
export function companyDeadReason(s: GameState, id: CompanyCardId): string {
  const co = s.company!
  const cost = companyCardCost(s, id)
  if (overBudget(s, cost)) return `錢不夠：資產只剩 ${co.assets}K`
  switch (id) {
    case 'audit':
    case 'pentest':
      return '所有節點的牌都已經確認過了'
    case 'intel':
      return co.missionKnown ? '已經知道駭客的任務了' : `警戒值要到 ${COMPANY.intelAlert} 以上才查得到駭客的任務（目前 ${s.alert}）`
    case 'patch':
      return '設備和 AI 上還沒有已知的弱點：先稽核找出來'
    case 'reminder':
      return '員工身上還沒有已知的弱點：先稽核找出來'
    case 'training':
      return s.company!.trainingNext ? '這回合已經安排教育訓練了' : '公司裡沒有員工'
    case 'aiReview':
      return 'AI 還沒有已知的弱點：先稽核找出來'
    case 'isolate':
      return '可以隔離的節點都剛解除隔離，下一回合才能再隔離'
    case 'upgrade':
      return '沒有可以升級的機器'
    case 'recapture':
      return '目前沒有被駭客控制的節點'
    case 'lockout':
      return '目前沒有被駭客控制的人'
    case 'failover':
      return '沒有癱瘓的基礎設施'
    case 'restoreDrill':
      return '備份都正常，牌也都確認過了'
    case 'monitor':
      return '監控已經開著了'
    case 'invest':
      return '需要一位沒被駭客控制的主管'
    case 'insurance':
      return co.insurance ? '保險已經生效中' : '現在不能用'
    case 'execCoach':
      return canDraw(s) ? '需要一位沒被駭客控制的主管' : '牌庫和棄牌堆都沒有牌了'
    default: {
      const v = FIX_VULN[id]
      return v ? `已經沒有可能有「${VULNS[v].name}」的節點了` : '現在不能用'
    }
  }
}

// ───────────────────────── 回合 ─────────────────────────

function drawCompany(s: GameState, n: number): CompanyCardInst[] {
  const co = s.company!
  const out: CompanyCardInst[] = []
  while (out.length < n && co.hand.length < COMPANY.handMax) {
    if (!co.deck.length) {
      if (!co.discard.length) break
      co.deck = shuffle(s, co.discard)
      co.discard = []
    }
    const c = co.deck.pop()!
    co.hand.push(c)
    out.push(c)
  }
  return out
}

/** 換牌：付錢把一張手牌丟進棄牌堆、抽一張新的（直接扣資產） */
export function recycleCompanyCard(s: GameState, uid: number): CompanyCardInst | null {
  const co = s.company
  if (!co || s.phase !== 'company') return null
  const i = co.hand.findIndex((c) => c.uid === uid)
  if (i < 0) return null
  // 手牌滿了抽不到牌的回合，先用掉免費的換牌次數；錢不夠就不能付費換牌
  if (!co.freeSwaps && overBudget(s, COMPANY.recycleCost)) return null
  if (co.freeSwaps > 0) co.freeSwaps -= 1
  else co.assets -= COMPANY.recycleCost
  const old = co.hand.splice(i, 1)[0]
  // 先抽再丟，避免牌堆見底時抽回同一張
  const fresh = drawCompany(s, 1)[0] ?? null
  co.discard.push(old)
  if (fresh) {
    co.hand.splice(co.hand.indexOf(fresh), 1)
    co.hand.splice(i, 0, fresh)
  }
  return fresh
}

/** 每回合抽幾張：開業時就固定（保底 1 張，每 2 位一般員工多 1 張），之後員工怎麼了都不會改變 */
export function companyDrawCount(s: GameState): number {
  return s.company!.drawPerTurn
}

/** 駭客回合結束後，輪到公司：先照目前有在運作的節點把營收入帳，再抽牌 */
export function startCompanyTurn(s: GameState): CompanyCardInst[] {
  const co = s.company!
  co.turn += 1
  s.phase = 'company'
  // 入帳：上回合受訓、這段時間被隔離或癱瘓的節點，這次就沒有產值
  co.income = productionOf(s).net
  co.assets += co.income
  for (const d of co.debts) d.turns -= 1
  co.debts = co.debts.filter((d) => d.turns > 0)
  for (const n of s.nodes) n.training = false
  // 隔離倒數：時間到就恢復連線，同一個節點要隔一回合才能再隔離
  for (const n of s.nodes) {
    if (!n.isolated) continue
    n.isolateLeft = (n.isolateLeft ?? 1) - 1
    if (n.isolateLeft > 0) continue
    n.isolated = false
    n.isolateReady = co.turn + 1
  }
  co.freeSwaps = 0
  // 起手牌在開局時就抽了，第 1 回合不再抽
  const want = co.turn === 1 ? 0 : companyDrawCount(s)
  const drew = drawCompany(s, want)
  // 手牌滿了、一張都沒抽到：這回合給免費換牌，卡住的牌才換得掉（有抽到一張就不算）
  if (want > 0 && drew.length === 0 && co.hand.length >= COMPANY.handMax) co.freeSwaps = COMPANY.fullHandSwaps
  // 抽完牌再看：入帳後資產是負的、手上又沒有能救的牌就破產
  checkBankrupt(s)
  return drew
}

/** 能讓公司加錢的牌（都是免費的經營牌） */
const EARNERS: CompanyCardId[] = ['overtime', 'invest', 'marketing', 'promo']

/** 破產：入帳後資產是負的，而且手上沒有能加錢的牌可以救，不用等回合結束 */
export function checkBankrupt(s: GameState): boolean {
  const co = s.company
  if (!co || co.outcome || s.phase !== 'company') return false
  if (co.assets >= 0) return false
  if (co.hand.some((c) => EARNERS.includes(c.id) && canPlayCompany(s, c.id))) return false
  goBankrupt(s)
  return true
}

function goBankrupt(s: GameState) {
  s.company!.outcome = 'bankrupt'
  s.phase = 'over'
  s.result = 'win'
}

/** 完美防禦的進度：所有牌都確認過、沒有有效弱點、沒有節點被控制 */
export function defenseProgress(s: GameState) {
  let total = 0
  let known = 0
  let vulns = 0
  for (const n of s.nodes) {
    for (const sl of n.slots) {
      total += 1
      if (companyKnows(sl)) known += 1
      if (!sl.shield && !sl.fixed) vulns += 1
    }
  }
  const controlled = s.nodes.filter((n) => n.controlled).length
  return { total, known, vulns, controlled, perfect: known === total && vulns === 0 && controlled === 0 }
}

/** 把駭客那邊的勝負，換成公司這邊的結局 */
export function syncOutcome(s: GameState) {
  const co = s.company
  if (!co || co.outcome || s.phase !== 'over') return
  co.outcome = s.result === 'win' ? 'breached' : 'caught'
}

export interface CompanyTurnEnd {
  outcome: CompanyState['outcome']
}

/** 公司回合結束：判定破產與完美防禦，然後輪到駭客（錢在下回合開始時才入帳） */
export function endCompanyTurn(s: GameState): CompanyTurnEnd {
  const co = s.company!
  co.trainingNext = false
  co.perfectStreak = co.income > 0 && defenseProgress(s).perfect ? co.perfectStreak + 1 : 0
  // 入帳後資產是負的、這回合又沒有用賺錢的牌救回來：破產
  if (co.assets < 0) {
    goBankrupt(s)
  } else if (co.perfectStreak >= COMPANY.perfectTurns) {
    co.outcome = 'perfect'
    s.phase = 'over'
    s.result = 'lose'
    s.loseReason = '公司達成完美防禦'
  } else if (!checkBlocked(s)) {
    startHackerTurn(s)
  }
  return { outcome: co.outcome }
}

/**
 * 公司眼中的局面：還沒確認的牌一律當作弱點（防護要稽核過才算數），
 * 封死任務才是公司自己確認做到的，不會用到公司還不知道的資訊。
 */
function companyView(s: GameState): GameState {
  const v = JSON.parse(JSON.stringify(s)) as GameState
  for (const n of v.nodes) {
    for (const sl of n.slots) {
      if (companyKnows(sl)) continue
      sl.shield = false
      sl.fixed = false
    }
  }
  return v
}

/**
 * 封死任務：公司已經看到駭客的任務，而且就算還沒確認的牌全是弱點，駭客也不可能達成，公司當場獲勝。
 * 出牌補好弱點、看到任務、自動修補完成時都要檢查。
 */
export function checkBlocked(s: GameState): boolean {
  const co = s.company
  if (!co || co.outcome || s.phase === 'over' || !co.missionKnown) return false
  if (!isStuck(companyView(s))) return false
  co.outcome = 'blocked'
  s.phase = 'over'
  s.result = 'lose'
  s.loseReason = '公司看穿了你的任務，攻擊路線都被封死了'
  return true
}

/** 結局的說明（公司視角） */
export const OUTCOME_TEXT: Record<NonNullable<CompanyState['outcome']>, { win: boolean; title: string; text: string }> = {
  perfect: { win: true, title: '完美防禦', text: '所有弱點都確認並補好了，公司也保持盈餘' },
  caught: { win: true, title: '抓到駭客', text: '警戒值到 10，駭客的行蹤曝光了' },
  blocked: { win: true, title: '封死任務', text: '看穿了駭客的任務，也把所有入侵路線都堵死了' },
  breached: { win: false, title: '被駭客得手', text: '駭客完成了任務' },
  bankrupt: { win: false, title: '破產', text: '資產變成負的，公司撐不下去了' },
}

export const vulnName = (v: VulnId) => VULNS[v].name
