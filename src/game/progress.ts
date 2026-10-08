// 任務進度（給畫面顯示用）
import { MISSIONS } from './data'
import { isEmployee, knownHas, node } from './engine'
import type { GameState } from './types'

export interface Goal {
  icon: string
  label: string
  done: boolean
  /** 還沒確定、需要靠情報判斷 */
  unknown?: boolean
}

export function missionGoals(s: GameState): Goal[] {
  const db = node(s, 'db')
  const backup = node(s, 'backup')
  const boss = node(s, 'boss')
  const ai = node(s, 'ai')
  switch (s.mission) {
    case 'ransom': {
      const nb = knownHas(backup, 'nobackup')
      return [
        { icon: 'database', label: '控制資料庫', done: db.controlled },
        {
          icon: 'database-backup',
          label: '備份失效',
          done: backup.paralyzed !== 0 || nb === 'Y',
          unknown: backup.paralyzed === 0 && nb === 'M',
        },
        { icon: 'lock-keyhole', label: '勒索軟體', done: false },
      ]
    }
    case 'espionage': {
      const shown = knownHas(db, 'plaintext') === 'Y' ? 1 : 2
      // 只用駭客已知的情報判斷（「私人雲端」沒揭露前不能洩漏）
      const access =
        db.controlled || (knownHas(db, 'privcloud') === 'Y' && s.nodes.some((n) => isEmployee(n) && n.controlled))
      return [
        { icon: 'database', label: '取得資料', done: access },
        { icon: 'clock', label: `維持 ${Math.min(s.hold, shown)}/${shown}`, done: s.hold >= shown },
        { icon: 'volume-2', label: '警戒 ≤ 6', done: s.alert <= 6 },
      ]
    }
    case 'bossfraud': {
      const known = s.nodes.some((n) => isEmployee(n) && n.id !== 'boss' && knownHas(n, 'gullible') === 'Y')
      return [
        { icon: 'user-round', label: '控制主管', done: boss.controlled },
        { icon: 'handshake', label: '找到好騙的人', done: known },
        { icon: 'banknote', label: '假冒轉帳', done: false },
      ]
    }
    case 'airebel': {
      // 資料能不能送出去：萬能鑰匙，或 AI 全自動沒人把關，任何一個成立就行
      const k1 = knownHas(ai, 'masterkey')
      const k2 = knownHas(ai, 'nohuman')
      const out = k1 === 'Y' || k2 === 'Y' ? 'Y' : k1 === 'N' && k2 === 'N' ? 'N' : 'M'
      return [
        { icon: 'bot', label: '控制 AI 助理', done: ai.controlled },
        { icon: 'key-square', label: '能外送資料', done: out === 'Y', unknown: out === 'M' },
        { icon: 'send', label: '資料外送', done: false },
      ]
    }
    case 'sabotage': {
      const infra = node(s, 'infra')
      const it = node(s, 'it')
      return [
        { icon: 'server', label: '控制基礎設施', done: infra.controlled },
        { icon: 'siren', label: 'IT 無法應變', done: it.controlled || it.paralyzed !== 0 },
        { icon: 'server-crash', label: '系統破壞', done: false },
      ]
    }
  }
}

export function missionDef(s: GameState) {
  return MISSIONS[s.mission]
}
