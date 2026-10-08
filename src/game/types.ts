// 遊戲規則用到的所有資料型別（純資料，不依賴畫面）

/** 三態判斷：Y 一定成立／N 一定不成立／M 不確定（還有蓋著的牌） */
export type Tri = 'Y' | 'N' | 'M'

export type Layer = 0 | 1 | 2 // 0 外圍、1 內網、2 核心
export type NodeKind = 'employee' | 'infra' | 'ai' | 'data'
export type NodeRole =
  | 'sales'
  | 'engineer'
  | 'boss'
  | 'ai'
  | 'it'
  | 'infra'
  | 'db'
  | 'backup'

export type VulnId =
  // 員工
  | 'curious'
  | 'lazy'
  | 'samepw'
  | 'gullible'
  | 'oversharer'
  | 'kind'
  | 'approver'
  // 基礎設施
  | 'weakpw'
  | 'openSea'
  | 'buggy'
  | 'legacy'
  | 'remote'
  | 'nolog'
  // 資料存取
  | 'allaccess'
  | 'nobackup'
  | 'plaintext'
  | 'privcloud'
  // AI 助理
  | 'masterkey'
  | 'nohuman'
  | 'selfupd'
  | 'obey'

export interface VulnCase {
  title: string
  text: string
}

export interface VulnDef {
  id: VulnId
  name: string
  kind: NodeKind
  /** 只會出現在這些角色的節點上（資料類才需要） */
  roles?: NodeRole[]
  icon: string
  /** 一句話說明（對應文件的弱點描述） */
  desc: string
  /** 規則類弱點：不論有沒有被揭露都會生效 */
  rule?: string
  /** 「已防護」牌的名稱 */
  shield: string
  /** 卡背：怎麼防 */
  fix: string
  /** 卡背：明天就能做的一件事 */
  tomorrow: string
  /** 卡背：真實案例 */
  case?: VulnCase
}

export type CardId =
  | 'scan'
  | 'osint'
  | 'smooth'
  | 'ally'
  | 'virus'
  | 'phish'
  | 'social'
  | 'cred'
  | 'brute'
  | 'tail'
  | 'mfa'
  | 'inject'
  | 'skill'
  | 'usb'
  | 'exploit'
  | 'lateral'
  | 'alarm'
  | 'wipe'
  | 'ransom'
  | 'bec'
  | 'exfil'
  | 'wreck'

export type Stage = '偵查' | '入侵' | '擴散' | '潛伏' | '得手'
export type CardCat = 'recon' | 'action' | 'paralyze' | 'finish'

export interface CardDef {
  id: CardId
  name: string
  stage: Stage
  cat: CardCat
  cost: number
  noise: number
  icon: string
  /** 條件（用 {v:弱點id} 標示弱點） */
  cond?: string
  /** 效果 */
  effect: string
  /** 偵查方式標籤 */
  mode?: 'active' | 'passive'
  trivia: string
  /** node：要拖到目標節點上；auto：拖到場上任何位置即可 */
  targeting: 'node' | 'auto'
}

export type MissionId = 'ransom' | 'espionage' | 'bossfraud' | 'airebel' | 'sabotage'

export interface MissionDef {
  id: MissionId
  name: string
  icon: string
  goal: string
  /** 開場劇本：這次為什麼要下手 */
  story: string
  teaches: string
  /** 這個任務會用到的「得手類」牌 */
  finisher?: CardId
}

export type ScenarioId = 'factory' | 'startup' | 'hospital' | 'school'

export interface ScenarioDef {
  id: ScenarioId
  name: string
  company: string
  icon: string
  tagline: string
  /** 開場劇本：公司背景 */
  story: string
  hue: number
  /** 弱點牌在牌堆裡的張數（沒寫就是 1） */
  vulnCopies: Partial<Record<VulnId, number>>
  /** 「已防護」牌在牌堆裡的張數（沒寫就是 1） */
  shieldCopies: Partial<Record<VulnId, number>>
}

/** 節點上的一個牌位（蓋著的牌） */
export interface Slot {
  vuln: VulnId
  /** true 代表這是「已防護」牌 */
  shield: boolean
  /** 0 蓋著／1 只有駭客知道／2 公開（公司也看得到） */
  vis: 0 | 1 | 2
  /** 弱點已被公司修補 */
  fixed: boolean
  /** 公開的弱點：公司修復的倒數（回合） */
  timer?: number
}

export interface Entry {
  node: string
  vuln: VulnId
}

export interface GameNode {
  id: string
  name: string
  role: NodeRole
  kind: NodeKind
  layer: Layer
  slots: Slot[]
  controlled: boolean
  /** 被控制的先後順序（越大越新） */
  controlSeq: number
  /** 被控制後，公司奪回的倒數（回合；0 代表沒在倒數） */
  timer: number
  /** 駭客已確認「這個節點沒有更多可用的弱點了」 */
  sealed: boolean
  /** 駭客當初用來入侵的弱點 */
  entry: Entry | null
  /** 癱瘓：剩餘回合數（0 代表沒有癱瘓）。IT 管理員每回合 -1；備份要等公司修復 */
  paralyzed: number
  /** 基礎設施專用：賽博病毒運作中 */
  virus: boolean
  /** 駭客已確認「不存在」的弱點 */
  excluded: Partial<Record<VulnId, true>>
}

export interface CardInst {
  uid: number
  id: CardId
}

export interface PlayLogEntry {
  turn: number
  card: CardId
  target?: string
  ok: boolean
  partial?: boolean
  captured: string[]
  entry?: Entry | null
}

export interface GameState {
  rng: number
  uidSeq: number
  scenario: ScenarioId
  mission: MissionId
  nodes: GameNode[]
  hand: CardInst[]
  deck: CardInst[]
  discard: CardInst[]
  turn: number
  ap: number
  apBase: number
  apBonus: number
  alert: number
  noiseThisTurn: number
  freePlayReady: boolean
  controlSeq: number
  hold: number
  phase: 'hacker' | 'company' | 'over'
  result: 'win' | 'lose' | null
  loseReason: string | null
  /** 本局出過的牌紀錄（覆盤用） */
  plays: PlayLogEntry[]
  /** 本局被利用過的弱點 */
  exploited: Entry[]
  /** 本局公司修補過的弱點次數 */
  patched: number
  recaptured: number
  noiseTotal: number
}
