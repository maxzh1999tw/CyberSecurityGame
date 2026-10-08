// 平衡測試：用簡單的電腦玩家跑很多局，看勝率
//   node scripts/sim.ts 100            → 每種組合跑 100 局
//   node scripts/sim.ts 1 show ransom  → 印出幾局「路線被封死」的過程
import { CARDS } from '../src/game/data.ts'
import {
  cardCost,
  endOfTurn,
  newGame,
  node,
  playCard,
  playability,
  recycleCard,
  routeExists,
  startHackerTurn,
} from '../src/game/engine.ts'
import type { CardId, GameState, MissionId, ScenarioId } from '../src/game/types.ts'

interface Choice {
  uid: number
  id: CardId
  target?: string
  score: number
}

function bestChoice(s: GameState): Choice | null {
  let best: Choice | null = null
  const seen = new Set<CardId>()
  for (const c of s.hand) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    const def = CARDS[c.id]
    const pb = playability(s, c.id)
    if (!pb.affordable || pb.status === 'dead') continue
    const options: Array<{ target?: string; tri: 'Y' | 'M' }> = []
    if (def.targeting === 'node') {
      for (const [nid, tri] of Object.entries(pb.targets)) options.push({ target: nid, tri: tri as 'Y' | 'M' })
    } else {
      options.push({ tri: pb.autoTri as 'Y' | 'M' })
    }
    for (const o of options) {
      if (s.ap < cardCost(s, c.id, o.target)) continue
      let sc = 0
      const noise = def.noise
      const room = 9 - s.alert
      if (def.cat === 'finish') {
        sc = o.tri === 'Y' ? 1000 : 200
      } else if (def.cat === 'action') {
        sc = o.tri === 'Y' ? 100 - noise * 6 : s.alert <= 3 && noise <= 2 ? 30 - noise * 8 : 0
        if (c.id === 'lateral' && o.tri === 'M') sc -= 10
      } else if (def.cat === 'paralyze') {
        const needWipe = s.mission === 'ransom' && c.id === 'wipe'
        const needAlarm = s.mission === 'sabotage' && c.id === 'alarm'
        sc = needWipe || needAlarm ? (o.tri === 'Y' ? 70 : 0) : c.id === 'alarm' ? (s.alert >= 4 ? 40 : 0) : 0
      } else {
        sc = ({ osint: 45, smooth: 28, ally: 26, scan: s.alert <= 2 ? 24 : 0, virus: 30 } as Record<string, number>)[c.id] ?? 20
        if (c.id === 'osint' && o.target) {
          const n = node(s, o.target)
          sc += n.layer === 0 ? 5 : 0
        }
      }
      if (def.cat !== 'finish' && noise > room) sc -= 100
      if (sc <= 0) continue
      sc -= pb.cost
      if (!best || sc > best.score) best = { uid: c.uid, id: c.id, target: o.target, score: sc }
    }
  }
  return best
}

const NL = String.fromCharCode(10)

const dump = (s: GameState) =>
  s.nodes
    .map(
      (n) =>
        n.id +
        (n.controlled ? '*' : '') +
        (n.paralyzed ? '~' : '') +
        '[' +
        n.slots.map((x) => (x.shield ? '盾' : '') + x.vuln + (x.fixed ? '(x)' : '') + ':' + x.vis).join(' ') +
        ']',
    )
    .join(NL)

function playGame(seed: number, scenario: ScenarioId, mission?: MissionId, log?: string[]) {
  const s = newGame({ seed, scenario, mission })
  if (log) log.push('INIT mission=' + s.mission + NL + dump(s))
  let guard = 0
  while (s.phase !== 'over' && guard++ < 300) {
    let acts = 0
    while (s.phase === 'hacker' && acts++ < 20) {
      const ch = bestChoice(s)
      if (!ch) {
        // 手上有死牌就換掉
        const dead = s.hand.filter((c) => {
          const d = CARDS[c.id]
          return playability(s, c.id).status === 'dead' && d.cat !== 'finish'
        })
        if (dead.length >= 2 && s.ap >= 1) {
          recycleCard(s, dead[0].uid)
          continue
        }
        break
      }
      const r = playCard(s, ch.uid, ch.target)
      log?.push(
        `T${s.turn} play ${ch.id}${ch.target ? '→' + ch.target : ''} ok=${r.effect.ok} alert=${s.alert} ap=${s.ap}`,
      )
      if (s.phase === 'over') break
    }
    if (s.phase === 'over') break
    for (const st of endOfTurn(s)) {
      if (!log) continue
      if (st.t === 'repair') log.push(`T${s.turn} 公司修復 ${st.node}#${st.idx} ${st.vuln}`)
      if (st.t === 'recapture') log.push(`T${s.turn} 公司奪回 ${st.node}`)
      if (st.t === 'frozen') log.push(`T${s.turn} 倒數暫停 ${st.reason}`)
    }
    if (s.phase === 'over') break
    startHackerTurn(s)
  }
  return s
}

if (process.argv[3] === 'show') {
  let shown = 0
  for (let i = 0; i < 3000 && shown < 3; i++) {
    const log: string[] = []
    const s = playGame(i + 11, 'factory', process.argv[4] as MissionId, log)
    if (s.loseReason?.includes('封死')) {
      shown++
      console.log('=========== seed', i + 11, 'turn', s.turn)
      console.log(log.join(NL))
      console.log('FINAL' + NL + dump(s))
    }
  }
  process.exit(0)
}

const N = Number(process.argv[2] ?? 400)
const scenarios: ScenarioId[] = ['factory', 'startup', 'hospital', 'school']
const missions: MissionId[] = ['ransom', 'espionage', 'bossfraud', 'airebel', 'sabotage']
const tot = { w: 0, n: 0, turns: 0, timeout: 0, toRoute: 0, lose: 0, stuck: 0 }
const byM: Record<string, { w: number; n: number }> = {}
const byS: Record<string, { w: number; n: number }> = {}
for (const sc of scenarios) {
  for (const m of missions) {
    for (let i = 0; i < N; i++) {
      const s = playGame(1000 + i * 7919 + m.length * 31, sc, m)
      tot.n++
      byM[m] ??= { w: 0, n: 0 }
      byS[sc] ??= { w: 0, n: 0 }
      byM[m].n++
      byS[sc].n++
      if (s.result === 'win') {
        tot.w++
        byM[m].w++
        byS[sc].w++
      }
      if (s.phase !== 'over') {
        tot.timeout++
        if (routeExists(s)) tot.toRoute++
      }
      if (s.result === 'lose') {
        tot.lose++
        if (s.loseReason?.includes('封死')) tot.stuck++
      }
      tot.turns += s.turn
    }
  }
}
const pct = (a: { w: number; n: number }) => ((a.w / a.n) * 100).toFixed(1) + '%'
console.log(
  '總勝率',
  pct(tot),
  '平均回合',
  (tot.turns / tot.n).toFixed(1),
  '逾時',
  tot.timeout,
  '(其中仍有路線',
  tot.toRoute + ')',
  '輸',
  tot.lose,
  '(路線封死',
  tot.stuck + ')',
)
console.log('依任務', Object.fromEntries(Object.entries(byM).map(([k, v]) => [k, pct(v)])))
console.log('依情境', Object.fromEntries(Object.entries(byS).map(([k, v]) => [k, pct(v)])))
