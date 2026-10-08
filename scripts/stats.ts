// 統計開局時各牌位的分佈：node scripts/stats.ts
import { MISSION_IDS, SCENARIO_IDS } from '../src/game/data.ts'
import { TUNING, effective, newGame } from '../src/game/engine.ts'

for (const w of [1, 0.7, 0.5]) {
  TUNING.shieldWeight = w
  let slots = 0
  let shield = 0
  let effVuln = 0
  let nullified = 0
  let noneNodes = 0
  let nodes = 0
  const effPerNode: number[] = []
  for (let seed = 1; seed <= 600; seed++) {
    for (const sc of SCENARIO_IDS) {
      const m = MISSION_IDS[seed % MISSION_IDS.length]
      const s = newGame({ seed, scenario: sc, mission: m })
      for (const n of s.nodes) {
        if (n.role === 'backup') continue
        nodes++
        let e = 0
        for (const sl of n.slots) {
          slots++
          if (sl.shield) shield++
          else if (effective(n, sl.vuln)) {
            effVuln++
            e++
          } else nullified++
        }
        if (e === 0) noneNodes++
        effPerNode.push(e)
      }
    }
  }
  const pct = (x: number) => ((x / slots) * 100).toFixed(1) + '%'
  console.log(
    `shieldWeight=${w}: 防護牌 ${pct(shield)}｜可用弱點 ${pct(effVuln)}｜被擋下的弱點 ${pct(nullified)}｜沒有任何可用弱點的節點 ${((noneNodes / nodes) * 100).toFixed(1)}%｜每節點平均可用弱點 ${(effVuln / nodes).toFixed(2)}`,
  )
}
