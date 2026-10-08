// 前後測：玩前、玩後各做一份 5 題小測驗
// 成績與承諾存在「這個分頁」自己的空間（sessionStorage），不同分頁是不同局，彼此不會互相蓋掉
import type { VulnId } from './types'

export interface QuizQ {
  vuln: VulnId
  q: string
  options: string[]
  /** 正確答案在 options 裡的位置 */
  answer: number
  why: string
}

export const QUESTIONS: QuizQ[] = [
  {
    vuln: 'gullible',
    q: '「老闆」傳訊息說：很急、先保密，要你馬上匯一筆款。你該怎麼做？',
    options: ['先匯再說，老闆在趕時間', '用電話或當面，向老闆本人確認', '回覆訊息問「是你本人嗎？」'],
    answer: 1,
    why: '詐騙者會偽裝成主管。轉帳要用「另一個管道」確認，不能只在原本的訊息裡確認。',
  },
  {
    vuln: 'approver',
    q: '手機突然跳出一個你沒做過的登入確認，你該怎麼做？',
    options: ['按允許，可能只是系統小問題', '按拒絕，並通知 IT', '先不理它，等它自己消失'],
    answer: 1,
    why: '不是自己發起的登入確認，一律拒絕並通報。攻擊者會一直轟炸，等你按下允許。',
  },
  {
    vuln: 'legacy',
    q: '電腦跳出系統更新的提示，但你正在忙。比較好的做法是？',
    options: ['先延後，等有空再說', '盡快更新，不要一直延後', '把提示關掉就好'],
    answer: 1,
    why: '漏洞公布後，攻擊程式很快就會流傳。及時更新，是最便宜的防護。',
  },
  {
    vuln: 'nobackup',
    q: '備份怎麼做，才能在被勒索軟體攻擊時真正救得回來？',
    options: ['備份放在同一台電腦的另一個資料夾', '有一份離線備份，而且定期測試過還原', '只要有開自動同步到雲端就好'],
    answer: 1,
    why: '勒索軟體會連同可以連到的備份一起加密。離線、且測試過能還原的備份才有用。',
  },
  {
    vuln: 'obey',
    q: '請 AI 助理整理一封陌生人寄來的信，你最該留意什麼？',
    options: ['它回覆得夠不夠快', '它有沒有做信件內容以外的多餘動作', '它的語氣夠不夠客氣'],
    answer: 1,
    why: '藏在信件裡的文字可能被 AI 當成指令執行。多出來的動作，就是警訊。',
  },
]

export interface QuizResult {
  score: number
  total: number
  at: number
}

const key = (k: 'pre' | 'post') => 'csg-quiz-' + k

export function loadResult(k: 'pre' | 'post'): QuizResult | null {
  try {
    const raw = sessionStorage.getItem(key(k))
    return raw ? (JSON.parse(raw) as QuizResult) : null
  } catch {
    return null
  }
}

export function saveResult(k: 'pre' | 'post', r: QuizResult) {
  try {
    sessionStorage.setItem(key(k), JSON.stringify(r))
  } catch {
    /* 沒有儲存空間也沒關係 */
  }
}

export function clearResults() {
  try {
    sessionStorage.removeItem(key('pre'))
    sessionStorage.removeItem(key('post'))
  } catch {
    /* 略過 */
  }
}

const PLEDGE = 'csg-pledge'
export function loadPledge(): VulnId | null {
  try {
    return (sessionStorage.getItem(PLEDGE) as VulnId | null) ?? null
  } catch {
    return null
  }
}
export function savePledge(v: VulnId) {
  try {
    sessionStorage.setItem(PLEDGE, v)
  } catch {
    /* 略過 */
  }
}
