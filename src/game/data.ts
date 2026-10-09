// 所有遊戲內容：弱點、手牌、事件、任務、企業情境（文字來源：資安桌游.md）
import type {
  CardDef,
  CardId,
  MissionDef,
  MissionId,
  NodeKind,
  NodeRole,
  ScenarioDef,
  ScenarioId,
  VulnDef,
  VulnId,
} from './types.ts'

const v = (d: VulnDef): VulnDef => d

export const VULNS: Record<VulnId, VulnDef> = {
  // ───── 員工 ─────
  curious: v({
    id: 'curious',
    name: '好奇寶寶',
    kind: 'employee',
    icon: 'mouse-pointer-click',
    desc: '會隨意點擊 Email 或陌生連結',
    shield: '已完成釣魚演練',
    fix: '教育訓練、釣魚演練、建立可疑郵件回報管道',
    tomorrow: '點連結前先看寄件人網域，可疑就按回報',
  }),
  lazy: v({
    id: 'lazy',
    name: '工作習慣很差',
    kind: 'employee',
    icon: 'monitor-off',
    desc: '離開座位不鎖螢幕，讓他人有機會操作公司電腦',
    shield: '已啟用自動鎖定螢幕',
    fix: '螢幕自動鎖定、下班登出或關機',
    tomorrow: '離開座位按 Win+L',
  }),
  samepw: v({
    id: 'samepw',
    name: '一碼超人',
    kind: 'employee',
    icon: 'copy',
    desc: '工作與私人都用同一份密碼',
    shield: '已使用密碼管理工具',
    fix: '每個服務用不同密碼，使用密碼管理工具，開雙重驗證',
    tomorrow: '把信箱、銀行、公司帳號換成各自獨立的密碼',
  }),
  gullible: v({
    id: 'gullible',
    name: '好騙',
    kind: 'employee',
    icon: 'handshake',
    desc: '輕易相信騙局',
    shield: '已建立二次確認流程',
    fix: '轉帳、改帳號等流程一律用另一個管道回撥確認',
    tomorrow: '遇到「急、保密、要匯款」，先打電話給本人確認',
    case: {
      title: 'MGM 飯店集團',
      text: '2023 年美國 MGM 飯店集團，駭客打電話給 IT 客服冒充員工',
    },
  }),
  oversharer: v({
    id: 'oversharer',
    name: '社群分享狂',
    kind: 'employee',
    icon: 'share-2',
    desc: '在網路上公開工作資訊',
    rule: '對他使用「肉搜情報」費用 -1',
    shield: '已有公開資訊守則',
    fix: '訂定員工公開資訊的規範',
    tomorrow: '檢查個人社群的公開設定，拿掉職稱與辦公室照片',
  }),
  kind: v({
    id: 'kind',
    name: '好心人',
    kind: 'employee',
    icon: 'heart-handshake',
    desc: '幫陌生人刷門禁',
    shield: '已落實門禁規範',
    fix: '不放行不認識的人，請對方刷自己的卡',
    tomorrow: '看到不認識的人跟在後面，禮貌地請他刷卡或洽櫃台',
  }),
  approver: v({
    id: 'approver',
    name: '按讚手',
    kind: 'employee',
    icon: 'thumbs-up',
    desc: '手機跳出登入確認就直接按允許',
    shield: '已使用號碼比對驗證',
    fix: '不是自己發起的登入確認一律拒絕並通報；使用需輸入號碼的驗證方式',
    tomorrow: '手機跳出沒做過的登入確認，按拒絕並通知 IT',
    case: {
      title: 'Uber',
      text: '2022 年 Uber，員工被登入確認通知轟炸到最後按了允許',
    },
  }),
  // ───── 基礎設施 ─────
  weakpw: v({
    id: 'weakpw',
    name: '簡單密碼',
    kind: 'infra',
    kinds: ['employee', 'infra', 'data'],
    roles: ['sales', 'engineer', 'boss', 'it', 'infra', 'db', 'backup'],
    icon: 'key',
    desc: '員工帳號、設備或資料庫使用容易被猜中的簡單密碼',
    shield: '已禁用預設與弱密碼',
    fix: '密碼長度與複雜度規則、禁用預設密碼、帳號鎖定',
    tomorrow: '把設備的預設密碼換掉',
  }),
  openSea: v({
    id: 'openSea',
    name: '自由海域',
    kind: 'infra',
    icon: 'waves',
    desc: '防火牆與網域控管薄弱',
    rule: '控制任一外圍節點，就能跳過內網直接攻擊核心層',
    shield: '已完成網路分段',
    fix: '網路分段，防火牆只開必要的規則',
    tomorrow: '向 IT 確認重要系統是否與一般辦公網路隔開',
  }),
  buggy: v({
    id: 'buggy',
    name: '爛系統',
    kind: 'infra',
    kinds: ['employee', 'infra', 'data'],
    roles: ['sales', 'engineer', 'boss', 'it', 'infra', 'db', 'backup'],
    icon: 'bug',
    desc: '內部系統有已知的資安漏洞',
    shield: '已完成安全檢測',
    fix: '上線前安全檢測、定期弱點掃描與滲透測試',
    tomorrow: '回報系統的異常行為與疑似漏洞',
  }),
  legacy: v({
    id: 'legacy',
    name: '老古董',
    kind: 'infra',
    kinds: ['employee', 'infra', 'data'],
    roles: ['sales', 'engineer', 'boss', 'it', 'infra', 'db', 'backup'],
    icon: 'hourglass',
    desc: '軟體沒有定期安裝更新',
    shield: '已啟用自動更新',
    fix: '自動更新與修補管理流程',
    tomorrow: '不要延後系統更新的提示',
    case: {
      title: 'WannaCry 勒索病毒',
      text: '2017 年 WannaCry 大爆發，但修補程式兩個月前就出了',
    },
  }),
  remote: v({
    id: 'remote',
    name: '遠端大門',
    kind: 'infra',
    icon: 'globe',
    desc: '遠端連線直接對外開放，又沒有雙重驗證',
    rule: '不需要先控制外圍節點，就能直接攻擊基礎設施',
    shield: '已使用 VPN 與雙重驗證',
    fix: '遠端連線走 VPN 並加上雙重驗證，不直接對外開放',
    tomorrow: '確認自己的遠端連線有開雙重驗證',
  }),
  nolog: v({
    id: 'nolog',
    name: '沒人看紀錄',
    kind: 'infra',
    icon: 'eye-off',
    desc: '沒有人在看系統紀錄與警報',
    rule: '所有牌的噪音減半（無條件進位）',
    shield: '已有集中監控與告警',
    fix: '集中記錄、異常告警、有人值班或委外監控',
    tomorrow: '看到系統告警不要略過，轉給負責的人',
  }),
  // ───── 資料存取 ─────
  allaccess: v({
    id: 'allaccess',
    name: '權限大開',
    kind: 'data',
    roles: ['db'],
    icon: 'users',
    desc: '資料庫權限過寬，員工可讀取過多資料，也可能把公司檔案存到私人雲端',
    rule: '控制任一員工，就能直接對資料庫出牌，不受層級限制',
    shield: '已落實最小權限',
    fix: '最小權限原則，定期盤點權限',
    tomorrow: '檢查自己有哪些用不到的資料夾權限，申請移除',
  }),
  nobackup: v({
    id: 'nobackup',
    name: '破釜沉舟',
    kind: 'data',
    roles: ['backup'],
    icon: 'database-zap',
    desc: '沒有任何備份資料',
    rule: '這間公司等於沒有備份',
    shield: '已有離線備份',
    fix: '3-2-1 備份（3 份、2 種媒介、1 份離線），並定期測試還原',
    tomorrow: '問 IT：上次測試還原是什麼時候',
  }),
  plaintext: v({
    id: 'plaintext',
    name: '明文存放',
    kind: 'data',
    roles: ['db'],
    icon: 'file-text',
    desc: '敏感資料沒有加密，偷到就能直接用',
    rule: '已揭露後，竊取資料只需維持 1 回合',
    shield: '已加密儲存',
    fix: '敏感資料加密儲存、欄位遮罩',
    tomorrow: '不要把含個資的檔案用明文放在共用位置',
  }),
  privcloud: v({
    id: 'privcloud',
    name: '私人雲端',
    kind: 'data',
    roles: ['db'],
    icon: 'cloud',
    desc: '員工把公司檔案存在自己的雲端',
    rule: '此風險已併入「權限大開」，不再提供獨立的取得資料捷徑',
    shield: '已提供核可的雲端空間',
    fix: '提供好用的公司雲端，並搭配資料外洩防護',
    tomorrow: '公司檔案只放在公司核可的空間',
  }),
  // ───── AI 助理 ─────
  masterkey: v({
    id: 'masterkey',
    name: '萬能鑰匙',
    kind: 'ai',
    icon: 'key-square',
    desc: 'AI 可以存取任何資料、執行任何操作',
    rule: '控制 AI 助理後，可以直接對資料庫出牌，不受層級限制',
    shield: '已限制 AI 權限',
    fix: '給 AI 最小權限，每個工具分開授權',
    tomorrow: '檢查你授權給 AI 工具的權限，用不到的收回',
  }),
  nohuman: v({
    id: 'nohuman',
    name: '取代人類',
    kind: 'ai',
    icon: 'user-x',
    desc: 'AI 是全自動執行的，沒有檢核端點',
    shield: '已設定人工核可',
    fix: '匯款、刪除、外寄等重要操作需人工核可',
    tomorrow: '讓 AI 做重要的事之前，自己先看過一遍',
  }),
  selfupd: v({
    id: 'selfupd',
    name: '自我更新',
    kind: 'ai',
    icon: 'package-plus',
    desc: 'AI 被允許安裝任意 Skill 或套件',
    shield: '已啟用白名單',
    fix: '只允許白名單內的技能與套件，審查來源',
    tomorrow: '不要讓 AI 隨意安裝來路不明的外掛',
  }),
  obey: v({
    id: 'obey',
    name: '照單全收',
    kind: 'ai',
    icon: 'message-square-warning',
    desc: 'AI 會執行外部內容（信件、網頁、文件）裡夾帶的指令',
    shield: '已隔離外部內容',
    fix: '區分外部內容與指令、限制 AI 可執行的動作',
    tomorrow: '請 AI 處理陌生信件或網頁時，留意它是否做了多餘的事',
    case: {
      title: 'EchoLeak 漏洞',
      text: '2025 年的 EchoLeak 漏洞，一封藏了指令的信，就可能讓 AI 助理洩漏公司內部資料',
    },
  }),
}

export const VULN_IDS = Object.keys(VULNS) as VulnId[]

/** 某種節點可能出現的弱點 */
export function vulnPool(kind: NodeKind, role: NodeRole): VulnId[] {
  return VULN_IDS.filter((id) => {
    if (id === 'privcloud') return false
    const d = VULNS[id]
    if (!(d.kinds?.includes(kind) ?? d.kind === kind)) return false
    if (d.roles && !d.roles.includes(role)) return false
    return true
  })
}

const c = (d: CardDef): CardDef => d

export const CARDS: Record<CardId, CardDef> = {
  // ───── 偵查 ─────
  scan: c({
    id: 'scan',
    name: '自動掃瞄',
    stage: '偵查',
    cat: 'recon',
    cost: 1,
    noise: 2,
    icon: 'radar',
    effect: '揭露開放層級 1 個隨機弱點',
    trivia:
      '攻擊者會用自動化工具掃描整個網路找出有漏洞的機器，這種掃描會在紀錄裡留下大量痕跡',
    targeting: 'auto',
  }),
  osint: c({
    id: 'osint',
    name: '肉搜情報',
    stage: '偵查',
    cat: 'recon',
    cost: 2,
    noise: 0,
    icon: 'user-search',
    effect: '揭露開放層級員工的 1 個弱點；若有{v:oversharer}，改為 2 個',
    trivia:
      '社群、徵才網站、公司官網上的公開資訊，都可能被拿來鎖定員工（公開情報蒐集，OSINT）',
    targeting: 'node',
  }),
  smooth: c({
    id: 'smooth',
    name: '能言善道',
    stage: '偵查',
    cat: 'recon',
    cost: 1,
    noise: 1,
    icon: 'phone-call',
    cond: '已控制員工，或目標有{v:gullible}或{v:oversharer}',
    effect: '揭露目標員工 1 個弱點',
    trivia: '用受控員工身分降低同事戒心，或對愛分享者套話取得線索',
    targeting: 'node',
  }),
  ally: c({
    id: 'ally',
    name: '機器盟友',
    stage: '偵查',
    cat: 'recon',
    cost: 2,
    noise: 1,
    icon: 'bot',
    effect: '揭露 AI 助理的 1 個弱點；若有{v:selfupd}或{v:obey}，改為 2 個',
    trivia: 'AI 工具的權限與外掛，常常沒有被納入資安盤點',
    targeting: 'auto',
  }),
  virus: c({
    id: 'virus',
    name: '賽博病毒',
    stage: '潛伏',
    cat: 'recon',
    cost: 2,
    noise: 1,
    icon: 'bug',
    cond: '控制員工與基礎設施',
    effect: '每回合揭露開放層級 1 個隨機弱點',
    trivia: '由員工端植入的程式可長期潛伏，持續蒐集資訊',
    targeting: 'auto',
  }),
  // ───── 行動 ─────
  phish: c({
    id: 'phish',
    name: '釣魚郵件',
    stage: '入侵',
    cat: 'action',
    cost: 1,
    noise: 2,
    icon: 'fish',
    cond: '目標員工有{v:curious}',
    effect: '控制目標',
    trivia: '釣魚郵件是最常見的入侵起點之一',
    targeting: 'node',
  }),
  social: c({
    id: 'social',
    name: '社交工程',
    stage: '入侵',
    cat: 'action',
    cost: 1,
    noise: 1,
    icon: 'drama',
    cond: '目標員工有{v:gullible}或{v:oversharer}',
    effect: '控制目標',
    trivia: '攻擊者利用信任，或根據公開的工作資訊編出可信的話術，誘使員工交出存取權；敏感要求應另行查證',
    targeting: 'node',
  }),
  cred: c({
    id: 'cred',
    name: '撞庫攻擊',
    stage: '入侵',
    cat: 'action',
    cost: 2,
    noise: 1,
    icon: 'key-round',
    cond: '目標員工有{v:samepw}',
    effect: '控制目標',
    trivia: '每年都有大量網站的帳號密碼外洩，駭客會拿去其他網站一個個試',
    targeting: 'node',
  }),
  brute: c({
    id: 'brute',
    name: '密碼攻擊',
    stage: '入侵',
    cat: 'action',
    cost: 2,
    noise: 3,
    icon: 'hammer',
    cond: '目標有{v:weakpw}或{v:samepw}',
    effect: '控制目標',
    trivia: '使用長且獨立的密碼，能降低猜測與撞庫風險',
    targeting: 'node',
  }),
  tail: c({
    id: 'tail',
    name: '尾隨入侵',
    stage: '入侵',
    cat: 'action',
    cost: 1,
    noise: 1,
    icon: 'door-open',
    cond: '目標員工有{v:kind}；基礎設施已開放',
    effect: '各半機率控制基礎設施，或癱瘓它 2 回合',
    trivia: '趁員工替陌生人開門進入設備區，可能接管或中斷設備；中斷期間公司修復與奪回暫停。訪客應自行驗證身分',
    targeting: 'node',
  }),
  mfa: c({
    id: 'mfa',
    name: '登入轟炸',
    stage: '入侵',
    cat: 'action',
    cost: 1,
    noise: 2,
    icon: 'bell-ring',
    cond: '目標員工有{v:approver}',
    effect: '控制目標',
    trivia: '不是自己發起的登入確認，一律按拒絕並通報',
    targeting: 'node',
  }),
  inject: c({
    id: 'inject',
    name: '提示詞注入',
    stage: '入侵',
    cat: 'action',
    cost: 1,
    noise: 1,
    icon: 'terminal',
    cond: '已控制 IT，或 AI 有{v:obey}或{v:nohuman}',
    effect: '控制 AI 助理',
    trivia: '惡意提示可操縱 AI；控制 IT 也能改寫系統指令',
    targeting: 'auto',
  }),
  skill: c({
    id: 'skill',
    name: '惡意技能',
    stage: '擴散',
    cat: 'action',
    cost: 2,
    noise: 1,
    icon: 'puzzle',
    cond: '已控制員工，或 AI 有{v:selfupd}',
    effect: '控制 AI 助理',
    trivia: '瀏覽器套件、AI 外掛、技能市集，都是供應鏈攻擊的入口',
    targeting: 'auto',
  }),
  usb: c({
    id: 'usb',
    name: 'USB間諜',
    stage: '擴散',
    cat: 'action',
    cost: 2,
    noise: 2,
    icon: 'usb',
    cond: '已控制員工，或可接觸的員工有{v:lazy}',
    effect: '控制基礎設施',
    trivia: '利用受控員工端，或無人看守且未鎖定的電腦植入惡意程式，建立基礎設施入口；離席應鎖屏，陌生 USB 不要插',
    targeting: 'auto',
  }),
  exploit: c({
    id: 'exploit',
    name: '漏洞利用',
    stage: '入侵',
    cat: 'action',
    cost: 2,
    noise: 2,
    icon: 'bug-play',
    cond: '目標有{v:buggy}或{v:legacy}',
    effect: '控制目標',
    trivia: '已知漏洞公布後，攻擊程式往往很快就會流傳',
    targeting: 'node',
  }),
  lateral: c({
    id: 'lateral',
    name: '橫向移動',
    stage: '擴散',
    cat: 'action',
    cost: 2,
    noise: 2,
    icon: 'network',
    cond: '選擇已控制的節點',
    effect: '隨機控制同層或下方一層的 1 個未控制節點',
    trivia: '入侵一台設備後，攻擊者會嘗試沿網路移往其他設備',
    targeting: 'node',
  }),
  // ───── 癱瘓 ─────
  alarm: c({
    id: 'alarm',
    name: '警報轟炸',
    stage: '潛伏',
    cat: 'paralyze',
    cost: 2,
    noise: 2,
    icon: 'siren',
    cond: '控制基礎設施與一名非 IT 員工',
    effect: '癱瘓 IT 2 回合，暫停修復與奪回',
    trivia: '先利用員工帳號散播假警報，讓真正的警報被淹沒（警報疲勞）',
    targeting: 'auto',
  }),
  wipe: c({
    id: 'wipe',
    name: '破壞備份',
    stage: '潛伏',
    cat: 'paralyze',
    cost: 2,
    noise: 3,
    icon: 'database-backup',
    cond: '控制基礎設施，且控制 IT 或資料庫',
    effect: '癱瘓備份約 6 回合；IT、基礎設施、資料庫奪回速度減半',
    trivia: '攻擊者在勒索之前，常會先找到並破壞備份',
    targeting: 'auto',
  }),
  // ───── 得手 ─────
  ransom: c({
    id: 'ransom',
    name: '勒索軟體',
    stage: '得手',
    cat: 'finish',
    cost: 3,
    noise: 5,
    icon: 'lock-keyhole',
    cond: '控制資料庫',
    effect: '加密資料庫；備份失效或受控即可得手',
    trivia: '有離線、而且測試過還原的備份，勒索軟體就沒有籌碼',
    targeting: 'auto',
  }),
  bec: c({
    id: 'bec',
    name: '假冒轉帳',
    stage: '得手',
    cat: 'finish',
    cost: 2,
    noise: 2,
    icon: 'banknote',
    cond: '控制主管與基礎設施；目標員工有{v:gullible}',
    effect: '以主管名義要求轉帳並得手',
    trivia: '接管 Teams 冒充主管要求轉帳；收到匯款指示，應用另一管道確認',
    targeting: 'node',
  }),
  wreck: c({
    id: 'wreck',
    name: '系統破壞',
    stage: '得手',
    cat: 'finish',
    cost: 3,
    noise: 4,
    icon: 'server-crash',
    cond: '控制基礎設施；IT 已控制或癱瘓',
    effect: '使公司服務停擺',
    trivia: '破壞性攻擊的目的不是勒索，而是讓營運停擺；沒有人能即時處理，損失會更大',
    targeting: 'auto',
  }),
  exfil: c({
    id: 'exfil',
    name: '資料外送',
    stage: '得手',
    cat: 'finish',
    cost: 2,
    noise: 1,
    icon: 'send',
    cond: '控制員工與資料庫',
    effect: '送出公司資料',
    trivia: '資料存取權越廣，外洩的影響範圍越大',
    targeting: 'auto',
  }),
  // ───── 資源管理（支援）─────
  wipelog: c({
    id: 'wipelog',
    name: '清除日誌',
    stage: '支援',
    cat: 'support',
    cost: 1,
    noise: 0,
    icon: 'eraser',
    cond: '警戒值至少 1',
    effect: '警戒值 -2',
    trivia: '入侵者會刪掉或竄改系統日誌來掩蓋行蹤；日誌要即時傳到另一台主機保存，才不會被一起刪掉',
    targeting: 'auto',
  }),
  proxy: c({
    id: 'proxy',
    name: '跳板代理',
    stage: '支援',
    cat: 'support',
    cost: 2,
    noise: 0,
    icon: 'waypoints',
    cond: '警戒值至少 1',
    effect: '警戒值 -3',
    trivia: '攻擊者會透過好幾層代理與被入侵的機器轉手，讓追查的人找不到真正的來源',
    targeting: 'auto',
  }),
  darkweb: c({
    id: 'darkweb',
    name: '暗網情報',
    stage: '支援',
    cat: 'support',
    cost: 1,
    noise: 0,
    icon: 'package-search',
    effect: '抽 2 張牌',
    trivia: '被盜的帳號密碼、入侵工具與企業內部資料，在暗網都有人公開販售',
    targeting: 'auto',
  }),
  energy: c({
    id: 'energy',
    name: '熬夜趕工',
    stage: '支援',
    cat: 'support',
    cost: 0,
    noise: 0,
    icon: 'coffee',
    effect: '本回合行動點 +2',
    trivia: '許多入侵都挑深夜、假日這種最沒人盯著的時段下手',
    targeting: 'auto',
  }),
  stash: c({
    id: 'stash',
    name: '囤積補給',
    stage: '支援',
    cat: 'support',
    cost: 1,
    noise: 0,
    icon: 'piggy-bank',
    effect: '本回合結束最多保留 4 點行動點',
    trivia: '長期潛伏的攻擊者會刻意放慢節奏、分批行動，降低被發現的機率',
    targeting: 'auto',
  }),
}

export const CARD_IDS = Object.keys(CARDS) as CardId[]

export const MISSIONS: Record<MissionId, MissionDef> = {
  ransom: {
    id: 'ransom',
    name: '勒索大作戰',
    icon: 'lock-keyhole',
    story: '你受雇於勒索集團。把這家公司的資料全部加密，再讓他們救不回來，他們就只能乖乖付贖金。',
    goal: '控制資料庫，並讓備份失效或受控，再打出「勒索軟體」',
    teaches: '備份的重要',
    finisher: 'ransom',
  },
  espionage: {
    id: 'espionage',
    name: '竊取資料',
    icon: 'download',
    story: '有買家出高價，要收購這家公司的機密資料。你得控制資料庫，再把資料靜悄悄地偷出來。',
    goal: '控制資料庫，撐過 2 回合把資料偷走（已揭露「明文存放」只需 1 回合），警戒值 ≤ 6',
    teaches: '資料外洩通常很安靜',
  },
  bossfraud: {
    id: 'bossfraud',
    name: '假老闆詐騙',
    icon: 'banknote',
    story: '先控制主管與基礎設施、接管公司 Teams，再冒充老闆指示好騙員工匯款。',
    goal: '控制主管與基礎設施，對有「好騙」的員工打出「假冒轉帳」',
    teaches: '變臉詐騙',
    finisher: 'bec',
  },
  insiderleak: {
    id: 'insiderleak',
    name: '內鬼資料外洩',
    icon: 'send',
    story: '你已在公司裡安插內鬼，接下來要取得員工帳號並控制資料庫，把客戶與營運資料送出公司。',
    goal: '控制一名員工與資料庫，打出「資料外送」',
    teaches: '最小權限與資料保護',
    finisher: 'exfil',
  },
  sabotage: {
    id: 'sabotage',
    name: '癱瘓服務',
    icon: 'server-crash',
    story: '有人要讓這家公司的服務停擺。趁 IT 人員來不及應變的那一刻，一擊癱瘓整套系統。',
    goal: '控制基礎設施，趁 IT 管理員無法應變（被你控制或癱瘓）時打出「系統破壞」，讓公司服務停擺',
    teaches: '事故應變的重要',
    finisher: 'wreck',
  },
}

export const MISSION_IDS = Object.keys(MISSIONS) as MissionId[]

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  factory: {
    id: 'factory',
    name: '傳統工廠',
    company: '鼎盛金屬工業',
    icon: 'factory',
    tagline: '老古董特別多',
    story: '三十年的老字號金屬加工廠。辦公室和產線裡還有不少用了十幾年的老設備，IT 只有一位管理員兼任，訂單與設計圖全放在公司的伺服器裡。',
    hue: 28,
    vulnCopies: {
      legacy: 3,
      buggy: 2,
      weakpw: 2,
      nolog: 2,
      lazy: 2,
      samepw: 2,
      nobackup: 2,
      allaccess: 2,
    },
    shieldCopies: {},
  },
  startup: {
    id: 'startup',
    name: '新創公司',
    company: '光速智能科技',
    icon: 'rocket',
    tagline: 'AI 全自動，速度第一',
    story: '成立兩年的新創，什麼都要快。信件、報價、客服都交給 AI 助理處理，員工多半遠端上班，權限開得很寬，資安還排不上進度。',
    hue: 285,
    vulnCopies: {
      obey: 2,
      nohuman: 2,
      selfupd: 2,
      masterkey: 2,
      remote: 2,
      openSea: 2,
      oversharer: 2,
      nobackup: 2,
    },
    shieldCopies: {},
  },
  hospital: {
    id: 'hospital',
    name: '醫院',
    company: '安心綜合醫院',
    icon: 'hospital',
    tagline: '病歷就是金礦',
    story: '每天上千名病患進出的區域醫院。病歷系統和醫療設備一刻都不能停，院內有許多共用電腦與老系統，員工輪班、人來人往。',
    hue: 170,
    vulnCopies: {
      legacy: 2,
      buggy: 2,
      weakpw: 2,
      kind: 2,
      lazy: 2,
      curious: 2,
      plaintext: 2,
      allaccess: 2,
    },
    shieldCopies: {},
  },
  school: {
    id: 'school',
    name: '學校',
    company: '知行高級中學',
    icon: 'school',
    tagline: '人多、規範少',
    story: '兩千多名師生的高中。帳號又多又雜、網路規範寬鬆，行政系統裡放著學生的個資與成績，資訊組只有兩位老師兼任。',
    hue: 210,
    vulnCopies: {
      gullible: 2,
      curious: 2,
      kind: 2,
      approver: 2,
      weakpw: 2,
      openSea: 2,
      allaccess: 2,
    },
    shieldCopies: {},
  },
}

export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[]

/** 開局節點配置 */
export interface NodeTemplate {
  id: string
  name: string
  role: NodeRole
  kind: NodeKind
  layer: 0 | 1 | 2
  draw: number
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  { id: 'sales', name: '業務小美', role: 'sales', kind: 'employee', layer: 0, draw: 3 },
  { id: 'engineer', name: '工程師阿明', role: 'engineer', kind: 'employee', layer: 0, draw: 3 },
  { id: 'boss', name: '主管', role: 'boss', kind: 'employee', layer: 0, draw: 3 },
  { id: 'ai', name: 'AI 助理', role: 'ai', kind: 'ai', layer: 0, draw: 3 },
  { id: 'it', name: 'IT 管理員', role: 'it', kind: 'employee', layer: 1, draw: 3 },
  { id: 'infra', name: '基礎設施', role: 'infra', kind: 'infra', layer: 1, draw: 3 },
  { id: 'db', name: '資料庫', role: 'db', kind: 'data', layer: 2, draw: 3 },
  { id: 'backup', name: '備份', role: 'backup', kind: 'data', layer: 2, draw: 2 },
]

export const LAYER_NAMES = ['外圍', '內網', '核心'] as const
export const STAGES = ['偵查', '入侵', '擴散', '潛伏', '得手'] as const

// ───────────────────────── 公司反應的倒數 ─────────────────────────
// 公司修復弱點、奪回節點需要幾回合，取決於「顯眼程度」與「嚴重程度」：
// 越顯眼、越嚴重，公司越快處理。（1 低、2 中、3 高）

interface Risk {
  notice: 1 | 2 | 3
  severe: 1 | 2 | 3
}

export const VULN_RISK: Record<VulnId, Risk> = {
  curious: { notice: 1, severe: 2 },
  lazy: { notice: 1, severe: 1 },
  samepw: { notice: 2, severe: 2 },
  gullible: { notice: 1, severe: 2 },
  oversharer: { notice: 1, severe: 1 },
  kind: { notice: 1, severe: 2 },
  approver: { notice: 2, severe: 2 },
  weakpw: { notice: 3, severe: 3 },
  openSea: { notice: 1, severe: 3 },
  buggy: { notice: 2, severe: 2 },
  legacy: { notice: 2, severe: 3 },
  remote: { notice: 3, severe: 3 },
  nolog: { notice: 1, severe: 2 },
  allaccess: { notice: 1, severe: 2 },
  nobackup: { notice: 1, severe: 3 },
  plaintext: { notice: 1, severe: 2 },
  privcloud: { notice: 1, severe: 2 },
  masterkey: { notice: 2, severe: 3 },
  nohuman: { notice: 2, severe: 2 },
  selfupd: { notice: 2, severe: 3 },
  obey: { notice: 2, severe: 2 },
}

export const NODE_RISK: Record<NodeRole, Risk> = {
  sales: { notice: 1, severe: 1 },
  engineer: { notice: 1, severe: 2 },
  boss: { notice: 2, severe: 2 },
  ai: { notice: 2, severe: 3 },
  it: { notice: 2, severe: 3 },
  infra: { notice: 3, severe: 2 },
  db: { notice: 3, severe: 3 },
  backup: { notice: 2, severe: 2 },
}

/** 公開的弱點，幾回合後會被公司修復（平靜時） */
export const repairTurnsOf = (v: VulnId) => 8 - (VULN_RISK[v].notice + VULN_RISK[v].severe)
/** 被控制的節點，幾回合後會被公司奪回（平靜時） */
export const recaptureTurnsOf = (role: NodeRole) => Math.ceil((9 - (NODE_RISK[role].notice + NODE_RISK[role].severe)) * (4 / 3))

/** 警戒值越高，公司反應越快（倒數每回合走得越多） */
export const ZONE_SPEED = [1, 1.5, 2] as const

/** 癱瘓 IT 管理員的回合數 */
export const IT_PARALYZE_TURNS = 2
/** 基礎設施中斷時，公司應變暫停的回合數 */
export const INFRA_PARALYZE_TURNS = 2
/** 備份被破壞後，公司需要幾回合才能恢復 */
export const BACKUP_RESTORE_TURNS = 6

const REPAIR_NAME: Record<VulnId, string> = {
  curious: '資安教育訓練',
  lazy: '推行螢幕自動鎖定',
  samepw: '密碼政策更新',
  gullible: '建立二次確認流程',
  oversharer: '制定公開資訊守則',
  kind: '落實門禁規範',
  approver: '改用號碼比對驗證',
  weakpw: '密碼政策更新',
  openSea: '網路分段施工',
  buggy: '安全檢測與修補',
  legacy: '修補日',
  remote: '導入雙重驗證',
  nolog: '建立集中監控',
  allaccess: '最小權限盤點',
  nobackup: '建立離線備份',
  plaintext: '資料加密儲存',
  privcloud: '提供核可的雲端空間',
  masterkey: '收回 AI 的權限',
  nohuman: 'AI 使用規範上線',
  selfupd: 'AI 使用規範上線',
  obey: '隔離外部內容',
}
export const repairName = (v: VulnId) => REPAIR_NAME[v]

/** 節點被奪回時的說明（依駭客當初入侵用的弱點） */
export function recaptureName(entry: VulnId | null): string {
  switch (entry) {
    case 'curious':
      return '員工回報可疑郵件，IT 奪回帳號'
    case 'approver':
      return '異常登入警示，IT 奪回帳號'
    case 'samepw':
      return '發現帳號被撞庫，IT 重設密碼'
    case 'gullible':
      return '員工發現被騙，IT 奪回帳號'
    case 'lazy':
      return 'IT 鎖定暴露的工作站，奪回控制權'
    case 'kind':
      return '公司封鎖實體入侵入口，IT 奪回設備'
    case 'weakpw':
      return '發現設備遭暴力破解，IT 重設密碼'
    case 'buggy':
    case 'legacy':
      return 'IT 發現異常，修補漏洞並奪回設備'
    case 'obey':
    case 'nohuman':
    case 'selfupd':
      return 'AI 行為異常，IT 奪回控制'
    default:
      return 'IT 發現異常，奪回控制權'
  }
}
