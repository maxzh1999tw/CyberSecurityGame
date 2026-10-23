// 公司模式平衡測試：電腦公司 vs 電腦駭客
//   node scripts/sim-company.ts 300        → 跑 300 局
//   node scripts/sim-company.ts 1 show     → 印出一局的過程
import { botNextAction } from '../src/game/bot.ts'
import {
  buildCompanyGame,
  endCompanyTurn,
  forecast,
  newDraft,
  openErrors,
  playCompanyCard,
  productionOf,
  startCompanyTurn,
  syncOutcome,
  defenseProgress,
} from '../src/game/company.ts'
import { botBuild, botCompanyTurn, leanBuild } from '../src/game/companyBot.ts'
import { COMPANY, COMPANY_CARDS, TIER_VALUE } from '../src/game/companyData.ts'
import { endOfTurn, playCard, recycleCard } from '../src/game/engine.ts'
import type { Tier, GameState } from '../src/game/types.ts'

const MAX_TURNS = 60
let unbuildable = 0

// 調平衡：C_startAssets=12 C_hackerAp=2 node scripts/sim-company.ts 200
for (const [k, v] of Object.entries(process.env)) {
  if (!k.startsWith('C_')) continue
  const key = k.slice(2) as keyof typeof COMPANY
  if (key in COMPANY) (COMPANY as Record<string, number>)[key] = Number(v)
}

// 調牌價：CARD_SCALE=1.5 node scripts/sim-company.ts 200（所有公司牌的費用乘上倍率，取 5 的倍數）
if (process.env.CARD_SCALE) {
  for (const def of Object.values(COMPANY_CARDS)) def.cost = Math.round((def.cost * Number(process.env.CARD_SCALE)) / 5) * 5
}

// 調產值：VALUE_SHIFT=-4 node scripts/sim-company.ts 200（所有等級的產值範圍一起加減，K）
if (process.env.VALUE_SHIFT) {
  const d = Number(process.env.VALUE_SHIFT)
  for (const t of Object.keys(TIER_VALUE) as unknown as Tier[]) TIER_VALUE[t] = [TIER_VALUE[t][0] + d, TIER_VALUE[t][1] + d]
}

function playGame(seed: number, log?: string[]): GameState {
  const d = newDraft(seed)
  // SIM_BUILD=lean：用快速配置（最少節點）開業；預設是能賺就一直聘的貪心組法
  if (process.env.SIM_BUILD === 'lean') leanBuild(d)
  else botBuild(d)
  if (openErrors(d).length) unbuildable++
  const s = buildCompanyGame(d, { seed })
  log?.push(`mission=${s.mission} nodes=${s.nodes.map((n) => `${n.id}(${n.econ!.tier},$${n.econ!.cost},+${n.econ!.value})`).join(' ')}`)
  while (s.phase !== 'over' && s.turn <= MAX_TURNS) {
    // 駭客回合
    for (let acts = 0; s.phase === 'hacker' && acts < 20; acts++) {
      const a = botNextAction(s)
      if (a.kind === 'end') break
      if (a.kind === 'recycle') recycleCard(s, a.uid)
      else {
        const r = playCard(s, a.uid, a.target)
        log?.push(`T${s.turn} 駭客 ${a.id}${a.target ? '→' + a.target : ''} ok=${r.effect.ok} 警戒=${s.alert}`)
      }
    }
    if (s.phase === 'hacker') for (const _ of endOfTurn(s)) { /* 推進 */ }
    syncOutcome(s)
    if (s.phase === 'over') break
    // 公司回合
    startCompanyTurn(s)
    botCompanyTurn(s, (uid, target) => {
      const id = s.company!.hand.find((c) => c.uid === uid)!.id
      const e = playCompanyCard(s, uid, target)
      log?.push(`T${s.turn} 公司 ${COMPANY_CARDS[id].name}${target ? '→' + target : ''} 花費=${e.cost}`)
    })
    const p = productionOf(s)
    const end = endCompanyTurn(s)
    log?.push(`T${s.turn} 公司結算 產值=${p.gross} 成本=${p.upkeep} 營收=${end.net} 資產=${s.company!.assets} 控制=${s.nodes.filter((n) => n.controlled).length}`)
  }
  return s
}

const N = Number(process.argv[2] ?? 300)
if (process.argv[3] === 'show') {
  // node scripts/sim-company.ts 1 show breached → 找一局指定結局的過程
  const want = process.argv[4]
  for (let seed = N; seed < N + 500; seed++) {
    const log: string[] = []
    const s = playGame(seed, log)
    if (want && s.company!.outcome !== want) continue
    console.log(log.join('\n'))
    console.log('結局', s.company!.outcome ?? '未結束', '回合', s.turn, defenseProgress(s))
    break
  }
  process.exit(0)
}

const outcomes: Record<string, number> = {}
const byMission: Record<string, { company: number; n: number }> = {}
let turns = 0
let firstNet = 0
for (let i = 0; i < N; i++) {
  const s = playGame(10007 + i * 7919)
  const o = s.company!.outcome ?? 'timeout'
  outcomes[o] = (outcomes[o] ?? 0) + 1
  byMission[s.mission] ??= { company: 0, n: 0 }
  byMission[s.mission].n++
  if (o === 'perfect' || o === 'caught' || o === 'blocked') byMission[s.mission].company++
  turns += s.turn
}
// 開局的每回合收益（沒有駭客影響時的經濟基準）
for (let i = 0; i < Math.min(N, 200); i++) {
  const d = newDraft(55 + i)
  botBuild(d)
  firstNet += forecast(d.picks, d.placement).net
}
const pct = (x: number) => ((x / N) * 100).toFixed(1) + '%'
console.log('結局', Object.fromEntries(Object.entries(outcomes).map(([k, v]) => [k, pct(v)])))
console.log('公司勝率', pct((outcomes.perfect ?? 0) + (outcomes.caught ?? 0) + (outcomes.blocked ?? 0)), '平均回合', (turns / N).toFixed(1))
console.log('依任務公司勝率', Object.fromEntries(Object.entries(byMission).map(([k, v]) => [k, ((v.company / v.n) * 100).toFixed(0) + '%'])))
console.log('開局每回合營收（不含出牌）平均', (firstNet / Math.min(N, 200)).toFixed(1), '　電腦組不出能開業的公司', unbuildable, '局')
