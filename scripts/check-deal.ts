// 檢查發牌：手牌與牌堆裡不能有「需要的弱點場上完全沒有」的牌
//   node scripts/check-deal.ts 3000
import { CARDS, MISSION_IDS, MISSIONS, SCENARIO_IDS } from '../src/game/data.ts'
import { newGame, playability, uselessCards } from '../src/game/engine.ts'
import type { CardId, GameNode, GameState, VulnId } from '../src/game/types.ts'

const N = Number(process.argv[2] ?? 2000)

// 獨立於遊戲邏輯的檢查：直接數場上有沒有這種弱點（蓋著、翻開、已修好都算有；有「已防護」牌的不算）
const has = (n: GameNode, v: VulnId) => n.slots.some((sl) => sl.vuln === v && !sl.shield)
const anyEmp = (s: GameState, ...vs: VulnId[]) => s.nodes.some((n) => n.kind === 'employee' && vs.some((v) => has(n, v)))
const node = (s: GameState, id: string) => s.nodes.find((n) => n.id === id)!

/** 直接需要某些弱點的牌：回傳 false 代表場上完全沒有，這張牌一定打不出去 */
const needs: Partial<Record<CardId, (s: GameState) => boolean>> = {
  smooth: (s) => anyEmp(s, 'gullible'),
  phish: (s) => anyEmp(s, 'curious'),
  social: (s) => anyEmp(s, 'gullible'),
  cred: (s) => anyEmp(s, 'samepw'),
  tail: (s) => anyEmp(s, 'lazy', 'kind'),
  mfa: (s) => anyEmp(s, 'approver'),
  brute: (s) => has(node(s, 'infra'), 'weakpw'),
  exploit: (s) => has(node(s, 'infra'), 'buggy') || has(node(s, 'infra'), 'legacy'),
  inject: (s) => has(node(s, 'ai'), 'obey') || has(node(s, 'ai'), 'nohuman'),
  exfil: (s) => has(node(s, 'ai'), 'masterkey'),
}

let bad = 0
let games = 0
let removedTotal = 0
let minDeck = 99
let missing = 0
let deadHands = 0
const removedBy: Record<string, number> = {}
for (const scenario of SCENARIO_IDS) {
  for (const mission of MISSION_IDS) {
    for (let i = 0; i < N / (SCENARIO_IDS.length * MISSION_IDS.length) + 1; i++) {
      const s = newGame({ scenario, mission })
      games++
      const all = [...s.hand, ...s.deck, ...s.discard]
      const ids = new Set(all.map((c) => c.id))
      const useless = uselessCards(s)
      removedTotal += useless.length
      for (const u of useless) removedBy[u] = (removedBy[u] ?? 0) + 1
      minDeck = Math.min(minDeck, all.length)
      const fin = MISSIONS[mission].finisher
      if (fin && !ids.has(fin)) missing++
      for (const id of ids) {
        if (useless.includes(id)) {
          bad++
          console.log('牌堆裡有用不上的牌（引擎自己的判斷）', id)
        }
        const f = needs[id]
        if (f && !f(s)) {
          bad++
          console.log(`場上沒有「${CARDS[id].name}」需要的弱點，卻發到牌堆`, scenario, mission)
        }
      }
      // 反過來：獨立檢查認為沒弱點的牌，一定要被引擎擋掉
      for (const [id, f] of Object.entries(needs) as Array<[CardId, (s: GameState) => boolean]>) {
        if (!f(s) && ids.has(id)) bad++
      }
      if (s.hand.every((c) => playability(s, c.id).status === 'dead')) deadHands++
    }
  }
}
console.log(`局數 ${games}　違規 ${bad}　得手牌缺少 ${missing}　牌堆最少 ${minDeck} 張　開局整手都打不出去 ${deadHands} 局`)
console.log(`平均每局拿掉 ${(removedTotal / games).toFixed(2)} 張`, removedBy)
