// 電腦公司：給模擬器調平衡用（招募、擺放、每回合出牌都用簡單的規則）
import { COMPANY, COMPANY_CARDS, FIX_VULN, HIRES, HIRE_KINDS, REQUIRED } from './companyData.ts'
import {
  addMarketCandidates,
  canPlayCompany,
  companyCardCost,
  companyTargets,
  defaultLayer,
  fixGuess,
  fire,
  forecast,
  hireTo,
  infraSeats,
  knownVulns,
  seatsOf,
  openErrors,
  productionOf,
  productiveCount,
  recycleCompanyCard,
  type Candidate,
  type DraftState,
} from './company.ts'
import { node } from './engine.ts'
import type { CompanyCardId, GameState, HireKind, Layer } from './types.ts'

const count = (picks: Candidate[], hire: HireKind) => picks.filter((p) => p.hire === hire).length
const gain = (c: Candidate) => c.value - c.cost + c.tier * 4

/** 從市場挑一位：有產值的挑划算的，防守節點挑等級高又不太貴的 */
function best(d: DraftState, hire: HireKind): Candidate | null {
  const pool = d.market[hire].filter((c) => recommendable(c) && defaultLayer(d, c) !== null)
  if (!pool.length) return null
  const score = (c: Candidate) => (HIRES[hire].productive ? gain(c) : c.tier * 12 - c.cost)
  return [...pool].sort((a, b) => score(b) - score(a))[0]
}

function hire(d: DraftState, c: Candidate | null): boolean {
  if (!c) return false
  const layer = defaultLayer(d, c)
  return layer !== null && hireTo(d, c.uid, layer) === null
}

/** 組建公司：先補齊必要的種類，再加划算的賺錢節點；收益不到開業門檻時改走省錢路線 */
export function botBuild(d: DraftState) {
  buildGreedy(d)
  if (forecast(d.picks, d.placement).net < COMPANY.minNet) leanen(d)
}

/** 省錢路線：防守節點換成同類最便宜的、拿掉多買的備份，再補划算的賺錢節點 */
function leanen(d: DraftState) {
  for (const p of [...d.picks]) {
    if (HIRES[p.hire].productive) continue
    if (p.hire === 'backup' && count(d.picks, 'backup') > REQUIRED.backup) {
      fire(d, p.uid)
      continue
    }
    const cheaper = d.market[p.hire].filter(recommendable).sort((a, b) => a.cost - b.cost)[0]
    if (!cheaper || cheaper.cost >= p.cost) continue
    const layer = d.placement[p.uid]
    fire(d, p.uid)
    if (hireTo(d, cheaper.uid, layer)) hireTo(d, p.uid, layer)
    // 便宜的基礎設施撐不住現有的人：換回來
    else if (productiveCount(d.picks) > seatsOf(d.picks)) {
      fire(d, cheaper.uid)
      hireTo(d, p.uid, layer)
    }
  }
  for (let guard = 0; guard < 20 && forecast(d.picks, d.placement).net < COMPANY.minNet; guard++) {
    const before = forecast(d.picks, d.placement).net
    const c = (['staff', 'exec', 'ai'] as HireKind[])
      .map((h) => best(d, h))
      .filter((x): x is Candidate => !!x && x.value > x.cost)
      .sort((x, y) => y.value - y.cost - (x.value - x.cost))[0]
    if (!c || !hire(d, c)) break
    if (forecast(d.picks, d.placement).net <= before) {
      fire(d, c.uid)
      break
    }
  }
}

/** 快速配置永遠不挑一星（破爛、菜鳥）：便宜但弱點多，留給玩家自己決定要不要省 */
let noLowest = false
const recommendable = (c: Candidate) => !noLowest || c.tier > 1

/**
 * 快速配置：用盡量少的節點剛好通過開業門檻，要不要多聘由玩家自己決定。
 * 防守節點挑同類最便宜的；賺錢節點一次挑一個讓收益最高的（連擺哪一層一起比）。
 * 排不出來時退回一般的組法。
 */
export function leanBuild(d: DraftState) {
  noLowest = true
  leanTry(d)
  // 不用一星排不到門檻：人力市場多刷幾位二星、三星的人選再排
  for (let round = 0; round < 10 && openErrors(d).length; round++) {
    for (const p of [...d.picks]) fire(d, p.uid)
    addMarketCandidates(d, ['staff', 'exec', 'ai', 'infra'])
    leanTry(d)
  }
  if (openErrors(d).length) {
    for (const p of [...d.picks]) fire(d, p.uid)
    botBuild(d)
  }
  noLowest = false
}

function leanTry(d: DraftState) {
  for (const h of HIRE_KINDS) {
    if (HIRES[h].productive) continue
    while (count(d.picks, h) < REQUIRED[h] && hire(d, cheapest(d, h))) { /* 補齊 */ }
  }
  for (const h of HIRE_KINDS) {
    if (!HIRES[h].productive) continue
    while (count(d.picks, h) < REQUIRED[h] && addBest(d, [h], false)) { /* 補齊 */ }
  }
  for (let guard = 0; guard < 20 && forecast(d.picks, d.placement).net < COMPANY.minNet; guard++) {
    if (!addBest(d, ['staff', 'exec', 'ai', 'infra'], true)) break
  }
}

function cheapest(d: DraftState, h: HireKind): Candidate | null {
  const pool = d.market[h].filter((c) => recommendable(c) && defaultLayer(d, c) !== null)
  return pool.length ? [...pool].sort((a, b) => a.cost - b.cost || b.tier - a.tier)[0] : null
}

/** 從這幾類裡挑一位（含擺哪一層）讓收益最高的聘進來；mustGain 時收益沒變多就不聘 */
function addBest(d: DraftState, kinds: HireKind[], mustGain: boolean): boolean {
  const before = forecast(d.picks, d.placement).net
  // 基礎設施滿了：可以連同一台最便宜的基礎設施一起聘（兩個一起算收益）
  const seatsFull = productiveCount(d.picks) >= infraSeats(d.picks)
  const extra = seatsFull ? cheapest(d, 'infra') : null
  let best: { uid: number; layer: Layer; net: number; infra: Candidate | null } | null = null
  for (const h of kinds) {
    const withInfra = HIRES[h].productive && seatsFull ? extra : null
    if (HIRES[h].productive && seatsFull && !withInfra) continue
    for (const c of d.market[h].filter(recommendable)) {
      if (withInfra && hire(d, withInfra) === false) continue
      for (const layer of HIRES[h].layers) {
        if (hireTo(d, c.uid, layer)) continue
        const net = forecast(d.picks, d.placement).net
        fire(d, c.uid)
        if (!best || net > best.net) best = { uid: c.uid, layer, net, infra: withInfra }
      }
      if (withInfra) fire(d, withInfra.uid)
    }
  }
  if (!best || (mustGain && best.net <= before)) return false
  if (best.infra && !hire(d, best.infra)) return false
  return hireTo(d, best.uid, best.layer) === null
}

function buildGreedy(d: DraftState) {
  // 先聘防守節點（基礎設施決定撐得住幾個賺錢的人），再聘賺錢的人；位置不夠就多聘一台基礎設施
  for (const h of HIRE_KINDS) {
    if (HIRES[h].productive) continue
    while (count(d.picks, h) < REQUIRED[h] && hire(d, best(d, h))) { /* 補齊 */ }
  }
  for (const h of HIRE_KINDS) {
    if (!HIRES[h].productive) continue
    while (count(d.picks, h) < REQUIRED[h]) {
      if (hire(d, best(d, h))) continue
      if (productiveCount(d.picks) < infraSeats(d.picks) || !hire(d, best(d, 'infra'))) break
    }
  }
  // 第二個備份很便宜就買，勒索會難很多
  const b = best(d, 'backup')
  if (b && b.cost <= 20) hire(d, b)
  const options = () =>
    (['staff', 'exec', 'ai'] as HireKind[]).map((h) => best(d, h)).filter((c): c is Candidate => !!c && gain(c) > 0).sort((x, y) => gain(y) - gain(x))
  for (let guard = 0; guard < 20; guard++) {
    const before = forecast(d.picks, d.placement).net
    // 基礎設施滿了：先多聘一台，再聘人（兩個加起來比較賺才留著）
    let infra: Candidate | null = null
    if (!options().length && productiveCount(d.picks) >= infraSeats(d.picks)) {
      infra = best(d, 'infra')
      if (!infra || !hire(d, infra)) break
    }
    const c = options()[0]
    if (!c) {
      if (infra) fire(d, infra.uid)
      break
    }
    hire(d, c)
    if (forecast(d.picks, d.placement).net <= before) {
      fire(d, c.uid)
      if (infra) fire(d, infra.uid)
      break
    }
  }
}

/** 公司回合：先救火，再修補已知弱點，再稽核；錢不夠時不亂花 */
export function botCompanyTurn(s: GameState, play: (uid: number, target?: string) => void) {
  const co = s.company!
  for (let guard = 0; guard < 20; guard++) {
    const options: Array<{ uid: number; target?: string; score: number }> = []
    for (const c of co.hand) {
      if (!canPlayCompany(s, c.id)) continue
      const cost = companyCardCost(s, c.id)
      const after = co.assets - cost
      for (const target of COMPANY_CARDS[c.id].target ? companyTargets(s, c.id) : [undefined]) {
        const score = cardScore(s, c.id, target, after)
        if (score > 0) options.push({ uid: c.uid, target, score })
      }
    }
    if (!options.length) {
      // 沒有值得打的牌：花錢換牌，找奪回控制或稽核（不換的話，手牌會被不想打的牌塞滿、抽不到新牌）
      const urgent = s.nodes.some((n) => n.controlled)
      // 先換打不出去的，再換很少用的，最後才換能打但現在不划算的
      const junk =
        co.hand.find((c) => !canPlayCompany(s, c.id)) ??
        co.hand.find((c) => c.id === 'isolate' || c.id === 'replace' || c.id === 'upgrade') ??
        co.hand[0]
      if (junk && (co.freeSwaps > 0 || co.assets - COMPANY.recycleCost >= (urgent ? 20 : 60))) {
        recycleCompanyCard(s, junk.uid)
        continue
      }
      return
    }
    options.sort((a, b) => b.score - a.score)
    play(options[0].uid, options[0].target)
    if (s.phase !== 'company') return
  }
}

function cardScore(s: GameState, id: CompanyCardId, target: string | undefined, after: number): number {
  const t = target ? node(s, target) : null
  // 留兩回合左右的錢當緩衝，臨時出事才付得起
  const safe = after >= 40
  switch (id) {
    case 'recapture':
      return after >= 0 ? 90 : 0
    case 'lockout':
      return after >= 0 ? 95 : 0
    case 'failover':
    case 'restoreDrill':
      return t && t.paralyzed > 0 && after >= 0 ? 80 : safe && t ? 20 : 0
    case 'patch':
    case 'aiReview':
      return safe ? 60 + (t?.layer ?? 0) * 3 : 0
    case 'reminder':
      return safe && t && knownVulns(t).length ? 55 : 0
    case 'pentest':
      return after >= 40 && t ? 40 + t.slots.length : 0
    case 'audit':
      return safe && t ? 45 + t.layer * 2 : 0
    case 'overtime':
      return productionOf(s).net < 10 ? 70 : 0
    case 'invest':
      return after < 30 ? 85 : 0
    case 'marketing':
      // 免費的錢，但會讓駭客多一個公開的弱點：缺錢時才打
      return after < 60 ? 75 : 0
    case 'promo':
      // 警戒值越低，降 1 格的代價越小
      return after < 60 || s.alert <= 1 ? 70 : 0
    case 'insurance':
      return after >= 100 ? 15 : 0
    case 'monitor':
      return s.alert >= 4 && safe ? 35 : 0
    case 'pr':
      // 差一格就抓到駭客：一定要打
      return s.alert >= 9 ? 99 : s.alert >= 5 && safe ? 30 : 0
    case 'isolate':
      return 0
    case 'intel':
      return after >= 120 ? 5 : 0
    case 'replace':
    case 'upgrade':
      return 0
    // 抽牌：先抽再決定，選擇比較多
    case 'execCoach':
      return after >= 10 ? 58 : 0
    default: {
      // 猜弱點的修補牌：確定有就修；不確定時，星級越低越可能猜中
      const v = FIX_VULN[id]
      if (!v || !t || !safe) return 0
      const guess = fixGuess(t, v)
      return guess === 'Y' ? 62 + t.layer * 3 : guess === 'M' ? 12 + (4 - (t.econ?.tier ?? 2)) * 5 : 0
    }
  }
}
