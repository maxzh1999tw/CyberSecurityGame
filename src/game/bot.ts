// 電腦駭客：每一步挑分數最高的牌（模擬器、公司模式的對手共用）
import { CARDS } from './data.ts'
import { HAND_MAX, cardCost, node, playability, recaptureSpeedOf } from './engine.ts'
import type { CardId, GameState } from './types.ts'

export interface Choice {
  uid: number
  id: CardId
  target?: string
  score: number
}

export function bestChoice(s: GameState): Choice | null {
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
        // 已控制的目標快被奪回時才延長，避免電腦玩家反覆續控而不推進任務。
        const target = o.target ?? null
        if (c.id !== 'lateral' && target && node(s, target).controlled) {
          const n = node(s, target)
          sc = o.tri === 'Y' && n.timer <= 2 * recaptureSpeedOf(s, n) ? 55 - noise * 6 : 0
        }
      } else if (def.cat === 'paralyze') {
        const needWipe = s.mission === 'ransom' && c.id === 'wipe'
        const needAlarm = s.mission === 'sabotage' && c.id === 'alarm'
        sc = needWipe || needAlarm ? (o.tri === 'Y' ? 70 : 0) : c.id === 'alarm' ? (s.alert >= 4 ? 40 : 0) : 0
      } else if (def.cat === 'support') {
        // 資源管理牌：警戒高才降警戒；手牌少才抽牌；熬夜趕工是免費的行動點
        const a = s.alert
        sc =
          c.id === 'wipelog' ? (a >= 5 ? 55 : a >= 3 ? 20 : 0)
          : c.id === 'proxy' ? (a >= 6 ? 60 : a >= 4 ? 25 : 0)
          : c.id === 'darkweb' ? (s.hand.length <= 6 ? 22 : 0)
          : c.id === 'energy' ? 60
          : c.id === 'stash' ? (s.ap >= 3 ? 12 : 0)
          : 0
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

export type BotAction =
  | { kind: 'play'; uid: number; id: CardId; target?: string }
  | { kind: 'recycle'; uid: number }
  | { kind: 'end' }

/** 電腦駭客的下一步：出分數最高的牌；沒有值得出的牌時換掉死牌；都沒有就結束回合 */
export function botNextAction(s: GameState): BotAction {
  if (s.phase !== 'hacker') return { kind: 'end' }
  const ch = bestChoice(s)
  if (ch) return { kind: 'play', uid: ch.uid, id: ch.id, target: ch.target }
  // 死牌優先換掉；滿手又沒有值得出的牌時，也能換掉暫時不需要的續控牌。
  const dead = s.hand.filter((c) => {
    const d = CARDS[c.id]
    return playability(s, c.id).status === 'dead' && d.cat !== 'finish'
  })
  const replace = dead.length >= 2
    ? dead[0]
    : s.hand.length >= HAND_MAX ? s.hand.find((c) => CARDS[c.id].cat !== 'finish') : undefined
  if (replace && s.ap >= 1) return { kind: 'recycle', uid: replace.uid }
  return { kind: 'end' }
}
