// 公司模式的內容：招募種類、等級數值、公司的牌（規則見 docs/公司方模式設計.md）
import type { CompanyCardDef, CompanyCardId, HireKind, Layer, NodeKind, NodeRole, Tier, VulnId } from './types.ts'

/** 可調的數值（之後用 scripts/sim-company.ts 調平衡）。金額單位都是 K（千元） */
export const COMPANY = {
  /** 開局資產 */
  startAssets: 100,
  /** 公司模式的駭客每回合多幾點行動點（公司會出牌應變，駭客需要更多手） */
  hackerAp: 1,
  /** 完美防禦要連續撐幾個公司回合才算贏 */
  perfectTurns: 1,
  /** 隔離節點：離線幾回合 */
  isolateTurns: 2,
  /** 警戒值至少要多少，才查得到駭客的任務（威脅情資） */
  intelAlert: 6,
  /** 人力市場每一類有幾位候選人（遠多於需要，讓玩家挑） */
  marketSize: { staff: 10, exec: 8, ai: 8, it: 8, infra: 8, db: 4, backup: 4 } as Record<HireKind, number>,
  /** 每一類每個星級至少幾位（沒寫就是 1） */
  marketPerTier: { exec: 2, ai: 2, it: 2, infra: 2 } as Partial<Record<HireKind, number>>,
  /** 每回合收益至少要多少才能開業 */
  minNet: 15,
  /** 每層最多幾個節點 */
  layerMax: 5,
  /** 外圍至少要有幾位一般員工 */
  minOuterStaff: 2,
  /** 限時特惠：資產立刻多多少（K） */
  promoBonus: 30,
  /** 每回合保底抽牌數；另外開業時每 staffPerDraw 位一般員工多抽 1 張（之後固定） */
  draw: 1,
  /** 幾位一般員工多抽 1 張 */
  staffPerDraw: 2,
  /** 第 2 台起的基礎設施：每台每回合多付的維護費（K）；壓住堆滿賺錢節點的收益上限 */
  extraInfraCost: 30,
  /** AI 比同等級員工便宜多少、多賺多少（K） */
  aiEdge: 2,
  /** 開業時的起手牌 */
  openingHand: 5,
  /** 公司手牌上限 */
  handMax: 8,
  /** 換牌：花多少錢把一張手牌換成新的 */
  recycleCost: 5,
  /** 回合開始時手牌滿了、抽不到牌：這回合可以免費換牌幾次 */
  fullHandSwaps: 2,
  /** 主管：同層每位一般員工多多少產值（K） */
  leadValue: 5,
  /** 每位主管最多帶幾位員工 */
  leadMax: 3,
  overtimeBonus: 20,
  investAmount: 40,
  investDebt: 6,
  investTurns: 4,
}

export interface HireDef {
  kind: HireKind
  label: string
  icon: string
  nodeKind: NodeKind
  /** 抽到時隨機選一個角色（決定弱點池與插圖） */
  roles: NodeRole[]
  layers: Layer[]
  productive: boolean
  /** 招募卡上印的效果（遊戲中的提示框也用這句） */
  effect: string
  /** 組建畫面的白話說明：能放在哪裡、至少要幾個、對公司有什麼用 */
  guide: string
  /** 帶進公司牌組的牌 */
  cards: CompanyCardId[]
  /** 底下幾張牌 */
  slots: number
  /** 頭像候選 */
  arts: string[]
}

export const HIRES: Record<HireKind, HireDef> = {
  staff: {
    kind: 'staff',
    label: '一般員工',
    icon: 'user-round',
    nodeKind: 'employee',
    roles: ['sales', 'engineer'],
    layers: [0, 1],
    productive: true,
    effect: '開業時每 2 位一般員工：每回合多抽 1 張牌',
    guide: '放在外圍或內網，外圍至少要有 2 位。公司主要靠他們賺錢；公司每回合保底抽 1 張，開業時每 2 位一般員工再多抽 1 張。被駭客控制時照常上班，但駭客每回合多 1 點行動點。',
    cards: ['reminder'],
    slots: 3,
    arts: ['sales', 'engineer', 'clerk', 'marketer', 'dev', 'newhire', 'worker', 'teacher', 'nurse'],
  },
  exec: {
    kind: 'exec',
    label: '主管',
    icon: 'crown',
    nodeKind: 'employee',
    roles: ['boss'],
    layers: [0, 1],
    productive: true,
    effect: '同層每位一般員工產值 +5K（最多 +15K）',
    guide: '放在外圍或內網，至少要有 1 位。同一層的每位一般員工產值 +5K（最多 +15K），記得和員工放在同一層。被駭客控制時，駭客每張牌的噪音 −1。',
    cards: ['invest', 'lockout', 'execCoach'],
    slots: 3,
    arts: ['boss', 'plantboss', 'ceo', 'director', 'chairman'],
  },
  ai: {
    kind: 'ai',
    label: 'AI',
    icon: 'cpu',
    nodeKind: 'ai',
    roles: ['ai'],
    layers: [0, 1, 2],
    productive: true,
    effect: '不能受訓；被駭客控制時，駭客每回合可免費出 1 張牌',
    guide: '哪一層都可以放，至少要有 1 個。產值高、維護費低，但不能受訓。被駭客控制時，駭客每回合可以免費出 1 張牌。',
    cards: ['monitor', 'aiReview'],
    slots: 3,
    arts: ['ai'],
  },
  it: {
    kind: 'it',
    label: 'IT',
    icon: 'wrench',
    nodeKind: 'employee',
    roles: ['it'],
    layers: [1],
    productive: false,
    effect: '只要還有一位 IT 沒被控制或癱瘓，公司就會持續奪回與修復',
    guide: '只能放在內網，至少要有 1 位。只要還有一位 IT 沒被控制或癱瘓，公司就會持續奪回與修復。',
    cards: ['patch'],
    slots: 3,
    arts: ['it', 'devops', 'medit', 'itteacher'],
  },
  infra: {
    kind: 'infra',
    label: '基礎設施',
    icon: 'server',
    nodeKind: 'infra',
    roles: ['infra'],
    layers: [1, 2],
    productive: false,
    effect: '能支援的有產值節點看等級：破爛 3、標準 4、頂規 6 個；滿了就不能再聘人',
    guide: '放在內網或核心，內網至少要有 1 台。有產值的人和 AI 要靠它支援才能上班。被癱瘓時修復與奪回都會暫停；被控制時駭客可以植入病毒。',
    cards: ['failover', 'upgrade'],
    slots: 3,
    arts: ['infra'],
  },
  db: {
    kind: 'db',
    label: '資料庫',
    icon: 'database',
    nodeKind: 'data',
    roles: ['db'],
    layers: [2],
    productive: false,
    effect: '資料分散：駭客要控制所有資料庫，才能完成勒索、竊取資料、內鬼資料外洩',
    guide: '只能放在核心，每間公司至少要有 1 個。駭客要控制所有資料庫，才能完成勒索、竊取資料、內鬼外洩，所以資料庫越多越難得手。',
    cards: ['fixWeakpw'],
    slots: 3,
    arts: ['db'],
  },
  backup: {
    kind: 'backup',
    label: '備份',
    icon: 'database-backup',
    nodeKind: 'data',
    roles: ['backup'],
    layers: [2],
    productive: false,
    effect: '所有備份都失效、受控或癱瘓，勒索才會得手；破壞備份一次只能癱瘓一個',
    guide: '只能放在核心，每間公司至少要有 1 個。所有備份都被控制或癱瘓時，駭客的勒索才會得手，IT、基礎設施、資料庫的奪回也會慢一半。',
    cards: ['restoreDrill'],
    slots: 2,
    arts: ['backup'],
  },
}

export const HIRE_KINDS = Object.keys(HIRES) as HireKind[]

/** 人力市場的分頁順序：由核心往外 */
export const MARKET_ORDER: HireKind[] = ['db', 'backup', 'infra', 'it', 'staff', 'exec', 'ai']

/** 每種至少要招幾個（一般員工要能撐起外圍） */
export const REQUIRED: Record<HireKind, number> = {
  staff: 2,
  exec: 1,
  ai: 1,
  it: 1,
  infra: 1,
  db: 1,
  backup: 1,
}

export const TIER_NAME = {
  person: { 1: '菜鳥', 2: '資深', 3: '王牌' },
  machine: { 1: '破爛', 2: '標準', 3: '頂規' },
} as const

/** 抽到各等級的機率 */
export const TIER_ODDS: Record<Tier, number> = { 1: 0.4, 2: 0.4, 3: 0.2 }
/**
 * 有產值的人與 AI：等級越高越安全（弱點少），但淨賺越少；便宜的弱點多，但淨賺多。
 * 產值只隨等級小幅增加，薪水漲得比較快：一般員工每回合淨賺約 菜鳥 +13、資深 +7、王牌 0（薪水不會超過產值）。
 * 產值整體壓低，讓最省的開法接近開業門檻、堆滿賺錢節點的上限也不會太高（卡牌價錢是照開業門檻訂的）。
 */
/** 各等級的產值範圍（K；有產值的種類才有） */
export const TIER_VALUE: Record<Tier, [number, number]> = { 1: [18, 24], 2: [21, 27], 3: [24, 30] }
/** 有產值的人與 AI：各等級的薪水或維護費範圍（K） */
export const TIER_COST: Record<Tier, [number, number]> = { 1: [6, 10], 2: [15, 19], 3: [27, 31] }
/** 防守節點（IT、基礎設施、資料庫、備份）：各等級的維護費範圍（K）；沒有產值，所以比較便宜 */
export const TIER_UPKEEP: Record<Tier, [number, number]> = { 1: [4, 7], 2: [7, 10], 3: [13, 17] }
/** 基礎設施各等級能支援幾個有產值的節點：越貴支援越多，但每個位置也越貴 */
export const INFRA_SEATS: Record<Tier, number> = { 1: 3, 2: 4, 3: 6 }
/** 各等級底下有幾個弱點（其餘是防護）：越貴越少，但至少 1 個，駭客永遠有東西可以打 */
export const TIER_VULNS: Record<Tier, number> = { 1: 3, 2: 2, 3: 1 }

/** 這種節點在這個等級的成本與產值範圍（K） */
export function tierStats(hire: HireKind, tier: Tier): { cost: [number, number]; value: [number, number] } {
  const [lo, hi] = TIER_VALUE[tier]
  const [clo, chi] = TIER_COST[tier]
  if (!HIRES[hire].productive) return { cost: TIER_UPKEEP[tier], value: [0, 0] }
  // 主管：薪水高、自己產值低，靠帶人；AI：便宜又能賺，風險在弱點
  // 主管：自己產值低、薪水也比員工低一點，靠帶人；等級越高越接近不賺不賠（不會倒賠）
  if (hire === 'exec') return { cost: [Math.max(3, clo - 3), chi - 3], value: [Math.max(5, lo - 5), hi - 5] }
  if (hire === 'ai') {
    const e = COMPANY.aiEdge
    return { cost: [Math.max(5, clo - e), Math.max(8, chi - e)], value: [lo + e, hi + e] }
  }
  return { cost: [clo, chi], value: [lo, hi] }
}

/** 猜弱點的修補牌：每張對應一種弱點（像駭客的攻擊牌一樣，猜對節點才有用） */
export const FIX_VULN: Partial<Record<CompanyCardId, VulnId>> = {
  fixLegacy: 'legacy',
  fixWeakpw: 'weakpw',
  fixBuggy: 'buggy',
  fixKind: 'kind',
  fixGullible: 'gullible',
  fixCurious: 'curious',
  fixSamepw: 'samepw',
}

/** 公司牌組裡，每局都有的基本牌 */
export const BASE_DECK: CompanyCardId[] = [
  'audit',
  'audit',
  'audit',
  'audit',
  'pentest',
  'pentest',
  'recapture',
  'recapture',
  'isolate',
  'intel',
  'replace',
  'insurance',
  'pr',
  'fixLegacy',
  'fixBuggy',
  'fixKind',
  'fixGullible',
  'fixCurious',
  'fixSamepw',
  'training',
  'marketing',
  'promo',
]

const c = (d: CompanyCardDef): CompanyCardDef => d

export const COMPANY_CARDS: Record<CompanyCardId, CompanyCardDef> = {
  // ───── 稽核 ─────
  audit: c({
    id: 'audit',
    name: '內部稽核',
    cat: 'audit',
    cost: 30,
    icon: 'clipboard-check',
    effect: '揭露目標 1 個弱點',
    target: 'any',
    trivia: '定期稽核，才知道自己有哪些弱點；駭客不會告訴你',
  }),
  pentest: c({
    id: 'pentest',
    name: '滲透測試',
    cat: 'audit',
    cost: 65,
    icon: 'swords',
    effect: '揭露目標所有蓋著的牌',
    target: 'any',
    trivia: '花錢請白帽駭客先打一次，比被真的駭客打便宜得多',
  }),
  intel: c({
    id: 'intel',
    name: '威脅情資',
    cat: 'audit',
    cost: 35,
    icon: 'binoculars',
    cond: '警戒值 6 以上',
    effect: '看見駭客的任務',
    trivia: '掌握攻擊者的目標與手法，防守才有重點',
  }),
  // ───── 修補與強化 ─────
  patch: c({
    id: 'patch',
    name: '修補漏洞',
    cat: 'harden',
    cost: 40,
    icon: 'wrench',
    effect: '修好目標設備或 AI 1 個已知弱點',
    target: 'machine',
    trivia: '已知漏洞公布後，越早修補，被利用的機會越小',
  }),
  reminder: c({
    id: 'reminder',
    name: '日常提醒',
    cat: 'harden',
    cost: 40,
    icon: 'bell-ring',
    effect: '修好目標員工 1 個已知弱點；他下回合沒有產值',
    target: 'person',
    trivia: '人的弱點要靠訓練補強，訓練期間也會影響工作進度',
  }),
  training: c({
    id: 'training',
    name: '教育訓練',
    cat: 'harden',
    cost: 0,
    icon: 'graduation-cap',
    effect: '這回合下一張修補員工弱點的牌，改成對同一層所有員工生效，沒發現的也修好；這些員工下回合沒有產值',
    trivia: '整個部門一起上課，比一個一個教有效率，但上課那天就沒人做事',
  }),
  upgrade: c({
    id: 'upgrade',
    name: '設備升級',
    cat: 'harden',
    cost: 70,
    icon: 'circle-arrow-up',
    effect: '換新目標機器或 AI：星級 +1、牌重抽，解除駭客控制',
    target: 'machine',
    trivia: '老舊設備不再有修補，汰換是唯一的辦法',
  }),
  replace: c({
    id: 'replace',
    name: '換人',
    cat: 'harden',
    cost: 40,
    icon: 'user-plus',
    effect: '把目標換成同種類的新人（星級隨機），解除駭客控制',
    target: 'person',
    trivia: '換人能擺脫舊的弱點，但新人有什麼弱點，還得重新認識',
  }),
  fixLegacy: c({
    id: 'fixLegacy',
    name: '軟體升級',
    cat: 'harden',
    cost: 30,
    icon: 'circle-arrow-up',
    effect: '修好目標的{v:legacy}',
    target: 'any',
    trivia: '老舊系統停止更新後，新發現的漏洞就永遠不會被修好',
  }),
  fixWeakpw: c({
    id: 'fixWeakpw',
    name: '密碼政策',
    cat: 'harden',
    cost: 30,
    icon: 'key-round',
    effect: '修好目標的{v:weakpw}',
    target: 'any',
    trivia: '強制密碼長度、禁止預設密碼，是最便宜也最有效的防護之一',
  }),
  fixBuggy: c({
    id: 'fixBuggy',
    name: '安全檢測',
    cat: 'harden',
    cost: 30,
    icon: 'bug',
    effect: '修好目標的{v:buggy}',
    target: 'any',
    trivia: '上線前做一次安全檢測，能抓出大部分常見的程式漏洞',
  }),
  fixKind: c({
    id: 'fixKind',
    name: '實體安全講習',
    cat: 'harden',
    cost: 30,
    icon: 'door-open',
    effect: '修好目標的{v:kind}',
    target: 'any',
    trivia: '別幫陌生人刷卡開門：尾隨進門是最簡單的入侵方式',
  }),
  fixGullible: c({
    id: 'fixGullible',
    name: '二次確認流程',
    cat: 'harden',
    cost: 30,
    icon: 'phone-call',
    effect: '修好目標的{v:gullible}',
    target: 'any',
    trivia: '轉帳、改帳號前打電話回撥確認，可以擋下大部分詐騙',
  }),
  fixCurious: c({
    id: 'fixCurious',
    name: '防釣魚演練',
    cat: 'harden',
    cost: 30,
    icon: 'fish',
    effect: '修好目標的{v:curious}',
    target: 'any',
    trivia: '定期的釣魚演練，讓員工習慣先停下來看清楚再點',
  }),
  fixSamepw: c({
    id: 'fixSamepw',
    name: '密碼管理工具',
    cat: 'harden',
    cost: 30,
    icon: 'key-square',
    effect: '修好目標的{v:samepw}',
    target: 'any',
    trivia: '每個網站用不同的密碼，一個外洩才不會全部淪陷',
  }),
  aiReview: c({
    id: 'aiReview',
    name: 'AI 權限盤點',
    cat: 'harden',
    cost: 40,
    icon: 'bot',
    effect: '修好目標 AI 1 個已知弱點',
    target: 'ai',
    trivia: '給 AI 最小權限，每個工具分開授權',
  }),
  // ───── 應變 ─────
  recapture: c({
    id: 'recapture',
    name: '奪回控制',
    cat: 'respond',
    cost: 70,
    icon: 'shield-check',
    effect: '奪回被控制的目標，並修補駭客用的入口',
    target: 'controlled',
    trivia: '清除入侵者之外，還要補上他進來的那個洞',
  }),
  isolate: c({
    id: 'isolate',
    name: '隔離節點',
    cat: 'respond',
    cost: 30,
    icon: 'unplug',
    effect: '目標離線 2 回合：駭客不能對它出牌，它也停止運作',
    target: 'any',
    trivia: '先把可疑的設備斷網，避免災情擴散',
  }),
  lockout: c({
    id: 'lockout',
    name: '封鎖帳號',
    cat: 'respond',
    cost: 40,
    icon: 'user-lock',
    effect: '立刻奪回被控制的人',
    target: 'controlledPerson',
    trivia: '發現帳號被盜，第一件事是停用它、重設密碼',
  }),
  monitor: c({
    id: 'monitor',
    name: '自動化監控',
    cat: 'respond',
    cost: 35,
    icon: 'cctv',
    effect: '下個駭客回合，駭客每張有噪音的牌噪音 +1',
    trivia: '集中監控與告警，讓入侵的動靜無所遁形',
  }),
  failover: c({
    id: 'failover',
    name: '備援切換',
    cat: 'respond',
    cost: 35,
    icon: 'arrow-left-right',
    effect: '解除目標基礎設施的癱瘓',
    target: 'infra',
    trivia: '備援系統能在主系統出事時立刻接手',
  }),
  restoreDrill: c({
    id: 'restoreDrill',
    name: '備份還原演練',
    cat: 'respond',
    cost: 35,
    icon: 'database-backup',
    effect: '恢復目標備份運作，並揭露它所有蓋著的牌',
    target: 'backup',
    trivia: '沒有測試過還原的備份，等於沒有備份',
  }),
  // ───── 經營與救急 ─────
  overtime: c({
    id: 'overtime',
    name: '加班趕工',
    cat: 'business',
    cost: 0,
    icon: 'coffee',
    effect: '資產 +20K；隨機一位一般員工的 1 張防護變回弱點',
    trivia: '過勞的人最容易點錯連結、忘記鎖螢幕',
  }),
  invest: c({
    id: 'invest',
    name: '拉攏投資',
    cat: 'business',
    cost: 0,
    icon: 'hand-coins',
    cond: '有未被控制的主管',
    effect: '資產 +40K；之後 4 回合，每回合營收 −6K',
    trivia: '募資能救急，但遲早要還',
  }),
  marketing: c({
    id: 'marketing',
    name: '行銷活動',
    cat: 'business',
    cost: 0,
    icon: 'trending-up',
    effect: '資產立刻多賺一回合的產值；駭客從公開資訊查到外圍 1 個弱點',
    trivia: '公司在網路上曝光越多，駭客能蒐集的情報也越多',
  }),
  promo: c({
    id: 'promo',
    name: '限時特惠',
    cat: 'business',
    cost: 0,
    icon: 'store',
    effect: '資產 +30K；警戒值 −1',
    trivia: '活動期間訂單和客服信暴增，釣魚信最容易混在裡面',
  }),
  // ───── 抽牌：想要更多選擇就得花時間或花錢 ─────
  execCoach: c({
    id: 'execCoach',
    name: '主管進修',
    cat: 'business',
    cost: 30,
    icon: 'graduation-cap',
    cond: '有未被控制的主管',
    effect: '抽 2 張牌',
    trivia: '主管懂資安，整個團隊才會跟著重視',
  }),
  insurance: c({
    id: 'insurance',
    name: '資安保險',
    cat: 'business',
    cost: 25,
    icon: 'umbrella',
    effect: '下次有節點被駭客控制時，資產 +50K',
    trivia: '資安保險能分散損失，但不能取代防護',
  }),
  pr: c({
    id: 'pr',
    name: '公關危機處理',
    cat: 'business',
    cost: 30,
    icon: 'megaphone',
    effect: '警戒值 +1',
    trivia: '對外說明、對內提高警覺，讓攻擊者更難隱身',
  }),
}

export const COMPANY_CARD_IDS = Object.keys(COMPANY_CARDS) as CompanyCardId[]

export const COMPANY_CAT_NAME = {
  audit: '稽核',
  harden: '強化',
  respond: '應變',
  business: '經營',
} as const

// ───── 公司名稱與 logo ─────

export const BRAND_NAME_MAX = 12
export const BRAND_LOGOS = [
  'building-2', 'store', 'factory', 'hospital', 'school', 'rocket', 'briefcase-business',
  'cpu', 'bot', 'cloud', 'database', 'globe', 'shield-check', 'lightbulb',
  'coffee', 'piggy-bank', 'hand-coins', 'handshake', 'crown', 'trophy', 'star',
  'flame', 'zap', 'waves', 'sparkles', 'target', 'heart-handshake', 'users',
]
export const BRAND_COLORS = ['#2a5fb0', '#1d3557', '#1f8f86', '#2c8f66', '#b0862a', '#c9772b', '#c2412f', '#7b5cc4']
export const DEFAULT_BRAND = { name: '我的公司', logo: 'building-2', color: '#2a5fb0' }

// ───── 候選人的名字 ─────

/** 人物：名字、頭像、星級是固定的一組；薪水、產值、底下的牌另外隨機抽 */
export interface Persona {
  name: string
  art: string
  tier: Tier
  /** 弱點池與插圖用的角色（一般員工才需要分業務型、技術型） */
  role?: NodeRole
}

export const PERSONAS: Record<'staff' | 'exec' | 'it', Persona[]> = {
  staff: [
    { name: '新人小柔', art: 'newhire', tier: 1, role: 'sales' },
    { name: '工讀生小傑', art: 'student', tier: 1, role: 'sales' },
    { name: '客服小美', art: 'sales', tier: 1, role: 'sales' },
    { name: '行銷小安', art: 'marketer', tier: 1, role: 'sales' },
    { name: '會計王姐', art: 'clerk', tier: 2, role: 'sales' },
    { name: '前端阿傑', art: 'dev', tier: 2, role: 'engineer' },
    { name: '倉管老陳', art: 'worker', tier: 2, role: 'engineer' },
    { name: '講師林老師', art: 'teacher', tier: 2, role: 'sales' },
    { name: '工程師阿明', art: 'engineer', tier: 3, role: 'engineer' },
    { name: '駐廠護理師小芳', art: 'nurse', tier: 3, role: 'sales' },
    { name: '研究員阿哲', art: 'doctor', tier: 3, role: 'engineer' },
  ],
  exec: [
    { name: '組長阿誠', art: 'teamlead', tier: 1 },
    { name: '課長老李', art: 'section', tier: 1 },
    { name: '業務經理趙姐', art: 'salesmgr', tier: 1 },
    { name: '王經理', art: 'boss', tier: 2 },
    { name: '陳廠長', art: 'plantboss', tier: 2 },
    { name: '林總監', art: 'director', tier: 2 },
    { name: '吳執行長', art: 'ceo', tier: 3 },
    { name: '財務長周姐', art: 'cfo', tier: 3 },
    { name: '黃董事長', art: 'chairman', tier: 3 },
  ],
  it: [
    { name: '網管小葉', art: 'netadmin', tier: 1 },
    { name: '資訊助理小琪', art: 'helpdesk', tier: 1 },
    { name: '維運阿凱', art: 'devops', tier: 1 },
    { name: '老 IT 阿明', art: 'it', tier: 2 },
    { name: '資訊室阿德', art: 'medit', tier: 2 },
    { name: '系統工程師老吳', art: 'sysadmin', tier: 2 },
    { name: '資安專家大傑', art: 'itteacher', tier: 3 },
    { name: '資安分析師凱文', art: 'secops', tier: 3 },
    { name: '雲端架構師安娜', art: 'cloud', tier: 3 },
  ],
}

/** 機器的名字：依等級取名，越高級聽起來越厲害 */
export const MACHINE_NAMES: Record<'ai' | 'db' | 'backup' | 'infra', Record<Tier, string[]>> = {
  ai: {
    1: ['小幫手 AI', '客服機器人小 A', 'AI 實習生', '問答小精靈'],
    2: ['SigmaAI', '靈犀助理', '小星 AI', '智匯助理', '雅典娜 AI', '神經元 Pro', '獵戶座副駕', '智腦 Plus'],
    3: ['天樞 AGI', '歐米伽大腦', '普羅米修斯-X', '宙斯智能'],
  },
  db: {
    1: ['LoveSQL 資料庫', 'Excel 大表單', '小倉庫資料庫', '舊版 Access'],
    2: ['大雄 SQL', '穩穩資料庫', '藍鯨資料庫', '青松資料庫', '神諭資料庫', '芒果大數據', '磐石資料中心', '鍛造資料庫'],
    3: ['量子帳本', '泰坦資料庫', '無限資料核心', '極光資料庫'],
  },
  backup: {
    1: ['隨身碟備份', '外接硬碟', '老電腦備份機', '小保險箱'],
    2: ['時光保險庫', 'NAS 備份機', '備份小幫手', '影印貓備份', '鋼鐵保險庫', '雲端守門人', '快照護盾', '檔案方舟'],
    3: ['冰河要塞', '永恆檔案庫', '鑽石金庫', '萬年備份'],
  },
  infra: {
    1: ['二手伺服器', '舊機房主機', '桌機改裝主機', '雜牌交換器'],
    2: ['標準機櫃', '迅捷交換器', '辦公室路由器', '藍盒伺服器', '獵鷹防火牆', '超網格叢集', '鋼核伺服器', '網路守衛'],
    3: ['神盾企業機房', '奧林帕斯平台', '泰坦資料中心', '哨兵 X'],
  },
}
