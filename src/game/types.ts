// 遊戲規則用到的所有資料型別（純資料，不依賴畫面）

/** 三態判斷：Y 一定成立／N 一定不成立／M 不確定（還有蓋著的牌） */
export type Tri = 'Y' | 'N' | 'M'

export type Layer = 0 | 1 | 2 // 0 外圍、1 內網、2 核心
export type NodeKind = 'employee' | 'infra' | 'ai' | 'data'
/**
 * 節點角色決定規則與插圖；名稱由各公司的配置決定。
 * sales＝一般職員、engineer＝技術人員、boss＝主管、chairman＝董事長（也算主管級）。
 * 基礎設施與 AI 可能不只一個；IT、資料庫、備份每間公司各一個。
 */
export type NodeRole =
  | 'sales'
  | 'engineer'
  | 'boss'
  | 'chairman'
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
  /** 可跨多種節點出現；kind 保留作為主要分類與視覺樣式 */
  kinds?: NodeKind[]
  /** 只會出現在這些角色的節點上 */
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
  // 資源管理
  | 'wipelog'
  | 'proxy'
  | 'darkweb'
  | 'energy'
  | 'stash'

/** 支援：資源管理牌，不算在攻擊流程裡 */
export type Stage = '偵查' | '入侵' | '擴散' | '潛伏' | '得手' | '支援'
export type CardCat = 'recon' | 'action' | 'paralyze' | 'finish' | 'support'

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
  trivia: string
  /** node：要拖到目標節點上；auto：拖到場上任何位置即可 */
  targeting: 'node' | 'auto'
}

export type MissionId = 'ransom' | 'espionage' | 'bossfraud' | 'insiderleak' | 'sabotage'

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
  /** 這間公司的節點配置 */
  layout: NodeTemplate[]
}

/** 開局節點配置 */
export interface NodeTemplate {
  id: string
  name: string
  role: NodeRole
  kind: NodeKind
  layer: Layer
  /** 底下蓋幾張牌 */
  draw: number
  /** 頭像（沒寫就用角色預設的插圖） */
  art?: string
}

/** 節點上的一個牌位（蓋著的牌） */
export interface Slot {
  vuln: VulnId
  /** true 代表這是「已防護」牌 */
  shield: boolean
  /** 0 蓋著／2 公開（公司也看得到） */
  vis: 0 | 2
  /** 弱點已被公司修補 */
  fixed: boolean
  /** 公開的弱點：公司修復的倒數（回合） */
  timer?: number
  /** 公司模式：公司自己稽核過、知道這張牌是什麼（駭客看不到） */
  known?: boolean
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
  /** 頭像（沒寫就用角色預設的插圖） */
  art?: string
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
  /** 癱瘓：剩餘回合數（0 代表沒有癱瘓）。IT 與基礎設施每回合 -1；備份要等公司修復 */
  paralyzed: number
  /** 基礎設施專用：賽博病毒運作中 */
  virus: boolean
  /** 駭客已確認「不存在」的弱點 */
  excluded: Partial<Record<VulnId, true>>
  /** 公司模式：經營數值（駭客模式沒有） */
  econ?: NodeEcon
  /** 公司模式：被隔離離線（駭客不能對它出牌，它也不發揮作用） */
  isolated?: boolean
  /** 公司模式：隔離還剩幾回合（每個公司回合開始時減 1） */
  isolateLeft?: number
  /** 公司模式：解除隔離後，第幾個公司回合起才能再隔離 */
  isolateReady?: number
  /** 公司模式：公司用修補牌猜過、確定這個節點沒有的弱點 */
  cleared?: VulnId[]
  /** 公司模式：正在教育訓練（這個公司回合停工） */
  training?: boolean
}

/** 公司模式的招募種類 */
export type HireKind = 'staff' | 'exec' | 'ai' | 'it' | 'infra' | 'db' | 'backup'
/** 1 菜鳥／破爛、2 資深／標準、3 王牌／頂規 */
export type Tier = 1 | 2 | 3

export interface NodeEcon {
  hire: HireKind
  tier: Tier
  /** 每回合薪水或維護費 */
  cost: number
  /** 每回合產值（防守節點為 0） */
  value: number
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
  /** 沒寫就是原本的駭客模式 */
  mode?: 'hacker' | 'company'
  /** 公司模式：公司方的經營狀態 */
  company?: CompanyState
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
  /** 本回合是否實際出牌或換牌；首回合不能直接空過。 */
  actedThisTurn: boolean
  apBase: number
  apBonus: number
  /** 上回合沒用完、保留到這回合的行動點 */
  apCarry: number
  /** 這回合結束時，可保留行動點的上限加成（囤積補給） */
  carryBoost: number
  alert: number
  noiseThisTurn: number
  /** 這回合還剩幾次免費出牌（回合開始時每控制一個 AI 給一次） */
  freePlays: number
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

// ───────────────────────── 公司模式 ─────────────────────────

export type CompanyCardId =
  // 稽核
  | 'audit'
  | 'pentest'
  | 'intel'
  // 修補與強化
  | 'patch'
  | 'training'
  | 'reminder'
  | 'upgrade'
  | 'replace'
  | 'fixLegacy'
  | 'fixWeakpw'
  | 'fixBuggy'
  | 'fixKind'
  | 'fixGullible'
  | 'fixCurious'
  | 'fixSamepw'
  | 'aiReview'
  // 應變
  | 'recapture'
  | 'isolate'
  | 'lockout'
  | 'monitor'
  | 'failover'
  | 'restoreDrill'
  // 經營與救急
  | 'overtime'
  | 'invest'
  | 'marketing'
  | 'promo'
  | 'insurance'
  | 'pr'
  // 抽牌
  | 'execCoach'

export type CompanyCardCat = 'audit' | 'harden' | 'respond' | 'business'

export interface CompanyCardDef {
  id: CompanyCardId
  name: string
  cat: CompanyCardCat
  cost: number
  icon: string
  /** 什麼情況才能打（跟駭客的牌一樣，弱點用 {v:id} 標籤） */
  cond?: string
  effect: string
  /** 要指定哪種節點（沒寫就是不用選目標） */
  target?: 'any' | 'person' | 'machine' | 'ai' | 'db' | 'backup' | 'infra' | 'controlled' | 'controlledPerson'
  trivia: string
}

export interface CompanyCardInst {
  uid: number
  id: CompanyCardId
}

/** 公司方玩家自己取的公司名稱與 logo */
export interface CompanyBrand {
  name: string
  /** logo 圖示名稱 */
  logo: string
  /** logo 底色 */
  color: string
}

export interface CompanyState {
  /** 公司名稱與 logo */
  brand: CompanyBrand
  /** 資產（K）：每回合開始時營收入帳，出牌、換牌直接扣；變成負的就破產 */
  assets: number
  /** 這回合開始時入帳的營收（完美防禦要它是正的） */
  income: number
  hand: CompanyCardInst[]
  deck: CompanyCardInst[]
  discard: CompanyCardInst[]
  /** 公司回合數 */
  turn: number
  /** 已經用威脅情資看見駭客任務 */
  missionKnown: boolean
  /** 自動化監控：下個駭客回合每張有噪音的牌噪音 +N */
  monitor: number
  /** 資安保險：下次節點被控制時理賠 */
  insurance: boolean
  /** 拉攏投資的還款：每回合營收 −amount，還剩幾回合 */
  debts: Array<{ amount: number; turns: number }>
  /** 這局怎麼結束的 */
  outcome: 'perfect' | 'caught' | 'blocked' | 'breached' | 'bankrupt' | null
  /** 駭客每回合多拿的行動點 */
  hackerAp: number
  /** 已經連續幾個公司回合結束時達成完美防禦 */
  perfectStreak: number
  /** 每回合抽幾張：開業時就固定，員工之後被癱瘓、控制、隔離都不會改變 */
  drawPerTurn: number
  /** 這回合還剩幾次免費換牌（手牌滿了抽不到牌時給的補償） */
  freeSwaps: number
  /** 教育訓練：這回合下一張修補員工弱點的牌，對目標那一層的所有員工生效 */
  trainingNext: boolean
}
