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
  const infra = node(s, 'infra')
  switch (s.mission) {
    case 'ransom': {
      const nb = knownHas(backup, 'nobackup')
      return [
        { icon: 'database', label: '控制資料庫', done: db.controlled },
        {
          icon: 'database-backup',
          label: '備份失效',
          done: backup.controlled || backup.paralyzed !== 0 || nb === 'Y',
          unknown: !backup.controlled && backup.paralyzed === 0 && nb === 'M',
        },
        { icon: 'lock-keyhole', label: '勒索軟體', done: false },
      ]
    }
    case 'espionage': {
      const shown = knownHas(db, 'plaintext') === 'Y' ? 1 : 2
      return [
        { icon: 'database', label: '取得資料', done: db.controlled },
        { icon: 'clock', label: `維持 ${Math.min(s.hold, shown)}/${shown}`, done: s.hold >= shown },
        { icon: 'volume-2', label: '警戒 ≤ 6', done: s.alert <= 6 },
      ]
    }
    case 'bossfraud': {
      const known = s.nodes.some((n) => isEmployee(n) && n.id !== 'boss' && knownHas(n, 'gullible') === 'Y')
      return [
        { icon: 'user-round', label: '控制主管', done: boss.controlled },
        { icon: 'server', label: '控制基礎設施', done: infra.controlled },
        { icon: 'handshake', label: '找到好騙的人', done: known },
        { icon: 'banknote', label: '假冒轉帳', done: false },
      ]
    }
    case 'insiderleak': {
      const employee = s.nodes.some((n) => isEmployee(n) && n.controlled)
      return [
        { icon: 'user-round', label: '控制一名員工', done: employee },
        { icon: 'database', label: '控制資料庫', done: db.controlled },
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
