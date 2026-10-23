// 任務進度（給畫面顯示用）
import { MISSIONS } from './data'
import { backups, dbAccess, dbs, execCtrl, infraCtrl, isEmployee, isExec, its, knownHas } from './engine'
import type { GameState } from './types'

export interface Goal {
  icon: string
  label: string
  done: boolean
  /** 還沒確定、需要靠情報判斷 */
  unknown?: boolean
}

export function missionGoals(s: GameState): Goal[] {
  // 資料分散：所有資料庫都要控制；所有備份都要失效
  const db = dbAccess(s)
  const backupDone = (b: GameState['nodes'][number]) => b.controlled || b.paralyzed !== 0 || knownHas(b, 'nobackup') === 'Y'
  switch (s.mission) {
    case 'ransom': {
      const all = backups(s)
      return [
        { icon: 'database', label: '控制資料庫', done: db },
        {
          icon: 'database-backup',
          label: '備份失效',
          done: all.every(backupDone),
          unknown: !all.every(backupDone) && all.every((b) => backupDone(b) || knownHas(b, 'nobackup') === 'M'),
        },
        { icon: 'lock-keyhole', label: '勒索軟體', done: false },
      ]
    }
    case 'espionage': {
      const shown = dbs(s).some((n) => knownHas(n, 'plaintext') === 'Y') ? 1 : 2
      return [
        { icon: 'database', label: '取得資料', done: db },
        { icon: 'clock', label: `維持 ${Math.min(s.hold, shown)}/${shown}`, done: s.hold >= shown },
        { icon: 'volume-2', label: '警戒 ≤ 6', done: s.alert <= 6 },
      ]
    }
    case 'bossfraud': {
      const known = s.nodes.some((n) => isEmployee(n) && !isExec(n) && knownHas(n, 'gullible') === 'Y')
      return [
        { icon: 'user-round', label: '控制主管級', done: execCtrl(s) },
        { icon: 'server', label: '控制基礎設施', done: infraCtrl(s) },
        { icon: 'handshake', label: '找到好騙的人', done: known },
        { icon: 'banknote', label: '假冒轉帳', done: false },
      ]
    }
    case 'insiderleak': {
      const employee = s.nodes.some((n) => isEmployee(n) && n.controlled)
      return [
        { icon: 'user-round', label: '控制一名員工', done: employee },
        { icon: 'database', label: '控制資料庫', done: db },
        { icon: 'send', label: '資料外送', done: false },
      ]
    }
    case 'sabotage': {
      return [
        { icon: 'server', label: '控制基礎設施', done: infraCtrl(s) },
        { icon: 'siren', label: 'IT 無法應變', done: its(s).every((it) => it.controlled || it.paralyzed !== 0) },
        { icon: 'server-crash', label: '系統破壞', done: false },
      ]
    }
  }
}

export function missionDef(s: GameState) {
  return MISSIONS[s.mission]
}
