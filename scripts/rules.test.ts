import assert from 'node:assert/strict'
import test from 'node:test'
import { CARDS, MISSION_IDS, MISSIONS, SCENARIO_IDS, NODE_RISK, recaptureTurnsOf, repairTurnsOf, vulnPool } from '../src/game/data.ts'
import {
  HAND_MAX, OPENING_HAND, apBonusOf, backupUnavailable, canEndTurn, canHave, canRecon, canRecycle, cardCost, ctrlCount, dbAccess, drawCards, effective, endOfTurn, endTurn,
  hintNodes, holdNeeded, isFree, isMissionCard, knownHas, newGame, startHackerTurn,
  node, playCard, playability, predict, reachKnown, recaptureSpeedOf, recycleCard, resolve, routeExists, speedOf, upcoming, uselessCards,
} from '../src/game/engine.ts'
import type { CardId, GameState, MissionId, NodeRole, VulnId } from '../src/game/types.ts'

function world(mission: MissionId = 'espionage'): GameState {
  const s = newGame({ seed: 1234, scenario: 'factory', mission })
  // 一般規則測試使用局中狀態；首回合限制另外以真正的新局驗證。
  s.turn = 2
  for (const n of s.nodes) {
    n.slots = []
    n.controlled = false
    n.entry = null
    n.timer = 0
    n.paralyzed = 0
    n.sealed = false
    n.excluded = {}
    n.virus = false
  }
  s.ap = 20
  s.alert = 0
  s.hand = []
  s.discard = []
  return s
}

function weakness(s: GameState, target: string, ...ids: VulnId[]) {
  node(s, target).slots = ids.map((vuln) => ({ vuln, vis: 2, shield: false, fixed: false, timer: repairTurnsOf(vuln) }))
}

function control(s: GameState, target: string) {
  node(s, target).controlled = true
  node(s, target).timer = recaptureTurnsOf(node(s, target).role)
  node(s, target).controlSeq = ++s.controlSeq
}

function play(s: GameState, id: CardId, target?: string) {
  const uid = ++s.uidSeq
  s.hand.push({ uid, id })
  return playCard(s, uid, target)
}

test('全部企業與任務：起手滿八張、唯一任務牌在手上、配置仍可通關', () => {
  assert.equal(OPENING_HAND, 8)
  assert.equal(HAND_MAX, 8)
  assert.ok(!MISSION_IDS.some((id) => String(id) === 'airebel'))
  for (const scenario of SCENARIO_IDS) {
    for (const mission of MISSION_IDS) {
      for (let seed = 1; seed <= 20; seed++) {
        const s = newGame({ seed, scenario, mission })
        assert.equal(s.hand.length, 8, `${scenario}/${mission}/${seed}`)
        assert.equal(routeExists(s), true, `${scenario}/${mission}/${seed} 無解`)
        const cards = [...s.hand, ...s.deck, ...s.discard]
        assert.equal(new Set(cards.map((c) => c.uid)).size, cards.length)
        const finisher = MISSIONS[mission].finisher
        if (finisher) {
          assert.equal(s.hand.filter((c) => c.id === finisher).length, 1)
          assert.equal(cards.filter((c) => c.id === finisher).length, 1)
          const required = s.hand.find((c) => c.id === finisher)!
          const before = JSON.stringify(s)
          assert.equal(recycleCard(s, required.uid), null)
          assert.equal(JSON.stringify(s), before, '換任務牌不能扣 AP 或改變牌堆')
        }
        assert.ok(cards.every((c) => CARDS[c.id].cat !== 'finish' || c.id === finisher))
      }
    }
  }
})

test('首回合不能空過，按回合結束不能推進狀態或白拿保留行動點', () => {
  const s = newGame({ seed: 1234, mission: 'sabotage' })
  assert.equal(s.turn, 1)
  assert.equal(s.actedThisTurn, false)
  assert.equal(canEndTurn(s), false)
  const before = JSON.stringify(s)
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const card of s.hand) playability(s, card.id)
    assert.deepEqual(Array.from(endOfTurn(s)), [])
    endTurn(s)
    assert.equal(JSON.stringify(s), before)
  }
})

test('首回合成功、失敗或零費用出牌都算行動，後續回合仍可空過', () => {
  for (const kind of ['success', 'failure', 'free'] as const) {
    const s = newGame({ seed: 1234, mission: 'sabotage' })
    if (kind !== 'free') {
      weakness(s, 'sales', kind === 'success' ? 'curious' : 'weakpw')
      node(s, 'sales').slots[0]!.vis = 0
      const result = play(s, 'phish', 'sales')
      assert.equal(result.effect.ok, kind === 'success')
    } else {
      const result = play(s, 'energy')
      assert.equal(result.cost, 0)
    }
    assert.equal(s.actedThisTurn, true)
    assert.equal(canEndTurn(s), true)
    if (kind === 'free') {
      endTurn(s)
      assert.equal(s.turn, 2)
      assert.equal(s.actedThisTurn, false)
      assert.equal(s.apCarry, 2)
      assert.equal(canEndTurn(s), true)
      endTurn(s)
      assert.equal(s.turn, 3)
      assert.equal(s.actedThisTurn, false)
      assert.equal(s.apCarry, 2)
    }
  }
})

test('有效換牌可解除首回合限制，無效操作與取消不算行動', () => {
  const s = newGame({ seed: 1234, mission: 'insiderleak' })
  const required = s.hand.find((c) => isMissionCard(s, c.id))!
  const before = JSON.stringify(s)
  assert.equal(recycleCard(s, required.uid), null)
  assert.equal(recycleCard(s, -1), null)
  assert.throws(() => playCard(s, -1), /手上沒有/)
  assert.equal(canEndTurn(s), false)
  assert.equal(JSON.stringify(s), before)
  const ordinary = s.hand.find((c) => !isMissionCard(s, c.id))!
  assert.ok(recycleCard(s, ordinary.uid))
  assert.equal(s.ap, s.apBase - 1)
  assert.equal(s.actedThisTurn, true)
  assert.equal(canEndTurn(s), true)
  for (const phase of ['company', 'over'] as const) {
    s.phase = phase
    assert.equal(canEndTurn(s), false)
  }
})

test('反覆換普通牌、棄牌重洗後，任務關鍵牌仍保留', () => {
  for (const mission of MISSION_IDS) {
    const s = newGame({ seed: 17, mission })
    const finisher = MISSIONS[mission].finisher
    if (!finisher) continue
    const required = s.hand.find((c) => c.id === finisher)!
    for (let i = 0; i < 50; i++) {
      s.ap = 3
      const disposable = s.hand.find((c) => !isMissionCard(s, c.id))!
      assert.ok(recycleCard(s, disposable.uid))
      assert.equal(s.hand.length, 8)
      assert.ok(s.hand.some((c) => c.uid === required.uid))
      assert.ok(!s.deck.some((c) => c.uid === required.uid))
      assert.ok(!s.discard.some((c) => c.uid === required.uid))
    }
    s.ap = 3
    s.hand = [required]
    assert.equal(canRecycle(s), false, '只剩任務牌時不應提示換牌')
  }
})

test('任務牌未得手後，所有抽牌方式都優先抽回原卡，反覆打出仍不遺失或複製', () => {
  for (const mission of MISSION_IDS) {
    const finisher = MISSIONS[mission].finisher
    if (!finisher) continue
    for (const drawVia of ['turn', 'effect', 'recycle'] as const) {
      const s = world(mission)
      const required = { uid: ++s.uidSeq, id: finisher }
      s.hand = [required]
      // 普通牌仍在牌堆時，以及牌堆耗盡只剩棄牌時，都要保證第一張抽回。
      for (const emptyDeck of [false, true]) {
        if (emptyDeck) s.deck = []
        s.ap = 20
        s.alert = 0
        const result = playCard(s, required.uid, finisher === 'bec' ? 'sales' : undefined)
        assert.equal(result.win, false, `${mission}/${drawVia}`)
        assert.ok(!s.hand.some((card) => card.uid === required.uid), '不能打出後立即回手')
        let drawn
        if (drawVia === 'turn') {
          drawn = startHackerTurn(s)
        } else if (drawVia === 'effect') {
          drawn = play(s, 'darkweb').effect.drawn
        } else {
          const disposable = { uid: ++s.uidSeq, id: 'scan' as const }
          s.hand.push(disposable)
          drawn = [recycleCard(s, disposable.uid)]
        }
        assert.equal(drawn[0]?.uid, required.uid, `${mission}/${drawVia}/${emptyDeck}`)
        const allCards = [...s.hand, ...s.deck, ...s.discard]
        assert.equal(allCards.filter((card) => card.uid === required.uid).length, 1)
        assert.ok(s.hand.some((card) => card.uid === required.uid))
      }
    }
  }
})

test('勒索被備份還原也會保留重抽；滿手牌時等到有空位才取回', () => {
  const s = world('ransom')
  control(s, 'db')
  const result = play(s, 'ransom')
  assert.equal(result.effect.partial, true)
  assert.equal(result.win, false)
  const required = s.discard.find((card) => card.id === 'ransom')!
  s.hand = Array.from({ length: HAND_MAX }, () => ({ uid: ++s.uidSeq, id: 'scan' as const }))
  assert.deepEqual(drawCards(s, 2), [])
  assert.ok(s.discard.some((card) => card.uid === required.uid))
  const fresh = recycleCard(s, s.hand[0]!.uid)
  assert.equal(fresh?.uid, required.uid)
  assert.equal(s.hand.length, HAND_MAX)
})

test('任務得手後不再優先抽回；非本局任務牌仍按一般牌堆抽牌', () => {
  for (const won of [false, true]) {
    const s = world(won ? 'insiderleak' : 'espionage')
    if (won) {
      control(s, 'sales')
      control(s, 'db')
    }
    assert.equal(play(s, 'exfil').win, won)
    const ordinary = { uid: ++s.uidSeq, id: 'scan' as const }
    s.deck = [ordinary]
    assert.equal(drawCards(s, 1)[0]?.uid, ordinary.uid)
    assert.equal(s.discard.filter((card) => card.id === 'exfil').length, 1)
  }
})

test('普通分層：控制外圍開內網、控制內網開核心；失去入口重新受限', () => {
  const s = world()
  assert.equal(reachKnown(s, node(s, 'it')), 'N')
  assert.equal(reachKnown(s, node(s, 'db')), 'N')
  control(s, 'sales')
  assert.equal(reachKnown(s, node(s, 'it')), 'Y')
  assert.equal(reachKnown(s, node(s, 'db')), 'N')
  control(s, 'it')
  assert.equal(reachKnown(s, node(s, 'db')), 'Y')
  node(s, 'it').controlled = false
  assert.equal(reachKnown(s, node(s, 'db')), 'N')
  node(s, 'sales').controlled = false
  assert.equal(reachKnown(s, node(s, 'it')), 'N')
})

test('捷徑只開對應節點；未知弱點不會被顯示成已確認路徑', () => {
  const s = world()
  weakness(s, 'infra', 'remote')
  assert.equal(reachKnown(s, node(s, 'infra')), 'Y')
  assert.equal(reachKnown(s, node(s, 'it')), 'N')
  node(s, 'infra').slots[0]!.vis = 0
  assert.equal(reachKnown(s, node(s, 'infra')), 'M')
  assert.equal(knownHas(node(s, 'infra'), 'remote'), 'M')

  weakness(s, 'infra', 'openSea')
  control(s, 'sales')
  assert.equal(reachKnown(s, node(s, 'db')), 'Y')
  assert.equal(reachKnown(s, node(s, 'backup')), 'Y')
  weakness(s, 'infra')
  weakness(s, 'db', 'allaccess')
  assert.equal(reachKnown(s, node(s, 'db')), 'Y')
  assert.equal(reachKnown(s, node(s, 'backup')), 'N')
  node(s, 'sales').controlled = false
  control(s, 'ai')
  weakness(s, 'ai', 'masterkey')
  assert.equal(reachKnown(s, node(s, 'db')), 'Y')
  assert.equal(reachKnown(s, node(s, 'backup')), 'N')
})

test('所有指定目標卡都排除未解鎖節點，拒絕出牌不消耗資源或探查暗牌', () => {
  const cards = Object.values(CARDS).filter((card) => card.targeting === 'node')
  for (const innerOpen of [false, true]) {
    const s = world()
    for (const n of s.nodes) {
      weakness(s, n.id, ...(n.role === 'ai' ? ['masterkey'] : n.role === 'infra'
        ? ['remote', 'openSea', 'weakpw', 'buggy'] : n.role === 'db'
          ? ['allaccess', 'weakpw', 'buggy'] : ['gullible', 'curious', 'weakpw', 'buggy']) as VulnId[])
      for (const sl of n.slots) { sl.vis = 0; delete sl.timer }
    }
    if (innerOpen) control(s, 'sales')
    for (const target of s.nodes.filter((n) => n.layer > (innerOpen ? 1 : 0))) {
      for (const card of cards) {
        assert.notEqual(reachKnown(s, target), 'Y')
        assert.equal(predict(s, card.id, target.id), 'N', `${card.id}/${target.id}`)
        assert.ok(!(target.id in playability(s, card.id).targets))
        const inst = { uid: ++s.uidSeq, id: card.id }
        s.hand = [inst]
        s.freePlayReady = true
        const before = JSON.stringify(s)
        assert.equal(resolve(s, card.id, target).ok, false)
        assert.equal(JSON.stringify(s), before, '直接結算也不能揭露或排除弱點')
        assert.throws(() => playCard(s, inst.uid, target.id), /尚未解鎖/)
        assert.equal(JSON.stringify(s), before, '不能扣 AP、免費出牌、棄牌、增加噪音或留下出牌紀錄')
      }
    }
  }
})

test('入口解鎖後仍可盲猜目標弱點，猜錯會正常消耗卡牌', () => {
  for (const vuln of ['weakpw', 'buggy'] as const) {
    const s = world()
    control(s, 'sales')
    weakness(s, 'infra', vuln)
    node(s, 'infra').slots[0]!.vis = 0
    assert.equal(predict(s, 'brute', 'infra'), 'M')
    assert.equal(playability(s, 'brute').targets.infra, 'M')
    const beforeAp = s.ap
    const result = play(s, 'brute', 'infra')
    assert.equal(result.effect.ok, vuln === 'weakpw')
    assert.equal(s.ap, beforeAp - result.cost)
    assert.equal(s.hand.length, 0)
    assert.equal(s.discard.at(-1)?.id, 'brute')
  }
})

test('跨層捷徑必須先揭露才能指定目標，未知捷徑不能拿來盲打', () => {
  for (const path of ['remote', 'openSea', 'allaccess', 'masterkey'] as const) {
    for (const visible of [false, true]) {
      const s = world()
      const target = path === 'remote' ? 'infra' : 'db'
      const owner = path === 'remote' || path === 'openSea' ? 'infra' : path === 'allaccess' ? 'db' : 'ai'
      if (path === 'masterkey') control(s, 'ai')
      else if (path !== 'remote') control(s, 'sales')
      weakness(s, target, 'weakpw')
      node(s, target).slots[0]!.vis = 0
      node(s, owner).slots.push({ vuln: path, vis: visible ? 2 : 0, shield: false, fixed: false })
      assert.equal(reachKnown(s, node(s, target)), visible ? 'Y' : 'M', path)
      assert.equal(predict(s, 'brute', target), visible ? 'M' : 'N', path)
      if (visible) assert.equal(play(s, 'brute', target).effect.ok, true, path)
      else assert.throws(() => play(s, 'brute', target), /尚未解鎖/, path)
    }
  }
})

test('出牌當下重新檢查入口，拖曳期間失去控制權不能沿用舊目標', () => {
  const s = world()
  control(s, 'sales')
  weakness(s, 'infra', 'weakpw')
  const inst = { uid: ++s.uidSeq, id: 'brute' as const }
  s.hand = [inst]
  assert.equal(playability(s, 'brute').targets.infra, 'Y')
  node(s, 'sales').controlled = false
  const before = JSON.stringify(s)
  assert.ok(!('infra' in playability(s, 'brute').targets))
  assert.throws(() => playCard(s, inst.uid, 'infra'), /尚未解鎖/)
  assert.equal(JSON.stringify(s), before)
})

test('通關分析只偵查已開放層，不能預知封鎖內網中的捷徑', () => {
  const s = world()
  weakness(s, 'infra', 'remote', 'weakpw')
  weakness(s, 'db', 'weakpw')
  for (const n of s.nodes) for (const sl of n.slots) sl.vis = 0
  assert.equal(routeExists(s), false)
  weakness(s, 'sales', 'curious')
  node(s, 'sales').slots[0]!.vis = 0
  const before = JSON.stringify(s)
  assert.equal(routeExists(s), true)
  assert.ok(!uselessCards(s).includes('brute'))
  assert.equal(JSON.stringify(s), before, '分析不得改動實際暗牌')
})

test('可偵查同層不會繞過指定目標的鎖，恢復外圍入口後才可選 IT', () => {
  const s = world()
  control(s, 'infra')
  weakness(s, 'it', 'oversharer')
  node(s, 'it').slots[0]!.vis = 0
  assert.equal(canRecon(s, node(s, 'it')), true)
  assert.equal(reachKnown(s, node(s, 'it')), 'N')
  for (const card of ['osint', 'smooth'] as const) {
    assert.ok(!('it' in playability(s, card).targets))
    assert.throws(() => play(s, card, 'it'), /尚未解鎖/)
  }
  control(s, 'sales')
  for (const card of ['osint', 'smooth'] as const) assert.ok('it' in playability(s, card).targets)
})

test('開局牌池分析重建初始情報，不受後續封存、揭露或弱點修復影響', () => {
  const s = world()
  weakness(s, 'sales', 'curious')
  weakness(s, 'infra', 'openSea')
  weakness(s, 'db', 'weakpw')
  const original = uselessCards(s)
  for (const n of s.nodes) {
    n.sealed = true
    n.excluded = { curious: true, openSea: true, weakpw: true }
    for (const sl of n.slots) { sl.vis = 2; sl.fixed = true }
  }
  assert.deepEqual(uselessCards(s), original)
})

test('密碼攻擊可選員工、IT、基礎設施、資料庫與備份，但仍需要該目標弱點', () => {
  assert.equal(CARDS.brute.targeting, 'node')
  for (const target of ['sales', 'it', 'infra', 'db', 'backup']) {
    const s = world()
    const n = node(s, target)
    assert.ok(vulnPool(n.kind, n.role).includes('weakpw'), target)
    assert.ok(canHave(n, 'weakpw'), target)
    if (n.layer === 1) control(s, 'sales')
    if (n.layer === 2) control(s, 'it')
    weakness(s, target, 'weakpw')
    assert.equal(predict(s, 'brute', target), 'Y', target)
    assert.equal(playability(s, 'brute').targets[target], 'Y', target)
    assert.equal(play(s, 'brute', target).effect.ok, true, target)
    assert.equal(n.controlled, true, target)
    assert.deepEqual(n.entry, { node: target, vuln: 'weakpw' })
  }
  const s = world()
  weakness(s, 'infra', 'remote')
  assert.equal(reachKnown(s, node(s, 'infra')), 'Y')
  assert.equal(predict(s, 'brute', 'infra'), 'N', '遠端暴露本身不代表密碼可猜中')
  weakness(s, 'infra', 'remote', 'weakpw')
  node(s, 'infra').slots[1]!.shield = true
  assert.equal(effective(node(s, 'infra'), 'weakpw'), false)
  assert.equal(predict(s, 'brute', 'infra'), 'N', '防護應擋住密碼攻擊')
})

test('可達不等於控制：沒有符合弱點時，開核心仍不能密碼攻佔資料庫', () => {
  const s = world()
  control(s, 'it')
  assert.equal(reachKnown(s, node(s, 'db')), 'Y')
  assert.equal(predict(s, 'brute', 'db'), 'N')
  assert.equal(node(s, 'db').controlled, false)
})

test('取得 AI 不是新外送任務的勝利捷徑', () => {
  const s = world('insiderleak')
  control(s, 'ai')
  weakness(s, 'ai', 'masterkey', 'nohuman', 'obey')
  assert.equal(predict(s, 'exfil'), 'N')
  assert.equal(s.result, null)
})

test('外送任務只有員工與資料庫兩項前置，不再綁多個弱點', () => {
  const s = world('insiderleak')
  control(s, 'sales')
  assert.equal(predict(s, 'exfil'), 'N')
  control(s, 'db')
  node(s, 'sales').controlled = false
  assert.equal(predict(s, 'exfil'), 'N', '只有資料庫仍缺員工')
  control(s, 'sales')
  assert.equal(predict(s, 'exfil'), 'Y')
  const result = play(s, 'exfil')
  assert.equal(result.win, true)
  assert.equal(result.target, 'db')
  assert.equal(s.result, 'win')
})

test('基礎設施卡需要跨節點前置，不會拿到就能成功', () => {
  const usb = world()
  weakness(usb, 'sales', 'curious', 'gullible')
  weakness(usb, 'infra', 'openSea')
  assert.equal(predict(usb, 'usb'), 'N', 'USB 需要真正取得員工控制權')
  control(usb, 'sales')
  const installed = play(usb, 'usb')
  assert.deepEqual(installed.effect.captured, ['infra'])
  assert.equal(node(usb, 'infra').entry, null)
  assert.equal(node(usb, 'db').controlled, false, 'USB 不再順帶控制資料庫')
  const s = world()
  control(s, 'infra')
  assert.equal(predict(s, 'virus'), 'N')
  assert.equal(predict(s, 'alarm'), 'N')
  assert.equal(predict(s, 'wipe'), 'N')
  control(s, 'sales')
  assert.equal(predict(s, 'virus'), 'Y')
  assert.equal(predict(s, 'alarm'), 'Y')
  assert.equal(predict(s, 'wipe'), 'N', '一般員工沒有備份管理權限')
  control(s, 'it')
  assert.equal(predict(s, 'wipe'), 'Y')
})

test('主管以權限核准取代行動點加成，一般員工仍各加一點', () => {
  const s = world()
  control(s, 'boss')
  assert.equal(apBonusOf(s), 0)
  for (const id of ['sales', 'engineer', 'it']) control(s, id)
  assert.equal(apBonusOf(s), 2)
  s.ap = 0
  startHackerTurn(s)
  assert.equal(s.apBonus, 2)
  assert.equal(s.ap, s.apBase + 2)
})

test('主管只折扣擴散牌，失控即恢復原價，續控不疊加折扣', () => {
  const s = world()
  control(s, 'boss')
  for (const def of Object.values(CARDS)) {
    assert.equal(cardCost(s, def.id), def.stage === '擴散' ? 1 : def.cost, def.id)
  }
  weakness(s, 'boss', 'curious')
  play(s, 'phish', 'boss')
  assert.equal(cardCost(s, 'usb'), 1)
  assert.equal(apBonusOf(s), 0)
  node(s, 'boss').controlled = false
  for (const id of ['skill', 'usb', 'lateral'] as const) {
    assert.equal(cardCost(s, id), CARDS[id].cost)
    assert.equal(isFree(s, id), false)
  }
})

test('主管折價後的費用、可負擔提示與實際出牌一致，噪音與分層規則不變', () => {
  for (const id of ['skill', 'usb', 'lateral'] as const) {
    const s = world('sabotage')
    control(s, 'boss')
    s.ap = 1
    assert.equal(playability(s, id).cost, 1)
    assert.equal(playability(s, id).affordable, true)
    assert.equal(playability(s, id).free, false)
    assert.equal(playability(s, id).status, 'sure')
    assert.equal(reachKnown(s, node(s, 'it')), 'Y')
    assert.notEqual(reachKnown(s, node(s, 'db')), 'Y', '主管本身仍不能越過內網直攻核心')
    const result = play(s, id, id === 'lateral' ? 'boss' : undefined)
    assert.equal(result.cost, 1)
    assert.equal(result.effect.ok, true)
    assert.equal(result.noise, CARDS[id].noise)
    assert.equal(s.ap, 0)
    if (id === 'lateral') assert.ok(result.effect.captured.every((target) => node(s, target).layer === 0))
  }
})

test('主管折價可搭配 AI 單次免費額度，重複控制不重發免費機會', () => {
  for (const id of ['skill', 'usb', 'lateral'] as const) {
    const s = world('sabotage')
    control(s, 'boss')
    control(s, 'ai')
    s.freePlayReady = true
    s.ap = 0
    assert.equal(cardCost(s, id), 0)
    assert.equal(playability(s, id).free, true)
    assert.equal(playability(s, id).affordable, true)
    const result = play(s, id, id === 'lateral' ? 'boss' : undefined)
    assert.equal(result.free, true)
    assert.equal(result.cost, 0)
    assert.equal(s.freePlayReady, false)
    assert.equal(cardCost(s, 'usb'), 1)
    s.ap = 10
    weakness(s, 'boss', 'curious')
    play(s, 'phish', 'boss')
    assert.equal(s.freePlayReady, false)
    assert.equal(cardCost(s, 'usb'), 1)
    node(s, 'boss').controlled = false
    s.freePlayReady = true
    assert.equal(cardCost(s, 'usb'), 2, '失去主管後，AI 不能免費打原價二點的擴散牌')
    assert.equal(isFree(s, 'social'), true, 'AI 的一般一點牌免費能力保留')
  }
})

test('橫向移動依畫面向下擴散：內網只能選內網或外圍，不能選核心', () => {
  assert.equal(CARDS.lateral.targeting, 'node')
  const outcomes = new Set<string>()
  const allowed: Record<string, string[]> = {
    sales: ['engineer', 'boss', 'ai'],
    it: ['infra', 'sales', 'engineer', 'boss', 'ai'],
    db: ['backup', 'it', 'infra'],
  }
  for (const source of ['sales', 'it', 'db']) {
    for (let seed = 1; seed <= 40; seed++) {
      const s = world()
      s.rng = seed * 7919
      assert.equal(predict(s, 'lateral', source), 'N', '未控制的節點不能當跳板')
      control(s, source)
      const rng = s.rng
      assert.equal(predict(s, 'lateral', source), 'Y')
      assert.equal(playability(s, 'lateral').targets[source], 'Y')
      assert.equal(s.rng, rng, '預測不得提前消耗亂數或選定隨機目標')
      const twin = structuredClone(s)
      const r = play(s, 'lateral', source)
      assert.equal(r.effect.ok, true)
      assert.equal(r.target, source)
      assert.equal(r.effect.captured.length, 1)
      const target = r.effect.captured[0]!
      assert.ok(allowed[source]!.includes(target), `${source} 不可跳到 ${target}`)
      assert.equal(s.nodes.filter((t) => t.controlled).length, 2)
      assert.equal(node(s, target).entry, null, '橫向移動不捏造被利用弱點')
      assert.equal(node(s, target).timer, recaptureTurnsOf(node(s, target).role))
      assert.deepEqual(r.effect.captured, play(twin, 'lateral', source).effect.captured, '預演與實際結算須相同')
      if (source === 'sales') outcomes.add(target)
    }
  }
  assert.ok(outcomes.size > 1, '不同種子不能永遠控制同一個目標')
  const s = world()
  for (const id of ['sales', 'engineer', 'boss', 'ai', 'it', 'infra']) control(s, id)
  assert.equal(predict(s, 'lateral', 'it'), 'N', '內網與外圍都已控制時，不能改選尚未控制的核心')
  assert.equal(predict(s, 'lateral', 'sales'), 'N', '外圍無候選時不能向上擴散')
  assert.equal(playability(s, 'lateral').status, 'dead')
})

test('共用弱點支援多張卡，偵查額外效果與成功入侵紀錄一致', () => {
  const s = world()
  weakness(s, 'sales', 'approver')
  assert.equal(predict(s, 'mfa', 'sales'), 'Y')
  assert.equal(predict(s, 'social', 'sales'), 'Y')
  const social = play(s, 'social', 'sales')
  assert.equal(social.effect.ok, true)
  assert.deepEqual(node(s, 'sales').entry, { node: 'sales', vuln: 'approver' })

  const intel = world()
  weakness(intel, 'engineer', 'oversharer', 'curious', 'samepw')
  node(intel, 'engineer').slots.forEach((sl) => { sl.vis = 0 })
  const osint = play(intel, 'osint', 'engineer')
  assert.equal(osint.effect.ok, true)
  assert.equal(node(intel, 'engineer').slots.filter((sl) => sl.vis > 0).length, 2)
  assert.equal(osint.cost - osint.refund, 1)
  const ai = world()
  weakness(ai, 'ai', 'obey', 'masterkey', 'nohuman')
  node(ai, 'ai').slots.forEach((sl) => { sl.vis = 0 })
  assert.equal(play(ai, 'ally').effect.ok, true)
  assert.equal(node(ai, 'ai').slots.filter((sl) => sl.vis > 0).length, 2)
})

test('同樣未知的兩個節點不因暗牌內容而洩露命中答案', () => {
  const a = world()
  const b = world()
  weakness(a, 'sales', 'weakpw')
  weakness(b, 'sales', 'curious')
  node(a, 'sales').slots[0]!.vis = 0
  node(b, 'sales').slots[0]!.vis = 0
  assert.equal(predict(a, 'brute', 'sales'), 'M')
  assert.equal(predict(b, 'brute', 'sales'), 'M')
  assert.equal(play(a, 'brute', 'sales').effect.ok, true)
  assert.equal(play(b, 'brute', 'sales').effect.ok, false)
  assert.equal(node(b, 'sales').controlled, false)
})

const alternativeEntries = [
  ['social', 'sales', 'gullible', 'approver'],
  ['tail', 'sales', 'lazy', 'kind'],
  ['brute', 'sales', 'weakpw', 'samepw'],
  ['exploit', 'sales', 'buggy', 'legacy'],
  ['inject', 'ai', 'obey', 'nohuman'],
] as const

test('多弱點擇一的控制牌優先使用已揭露入口，首次控制與續控都不多翻暗牌', () => {
  for (const [card, target, first, second] of alternativeEntries) {
    for (const known of [first, second]) {
      for (const alreadyControlled of [false, true]) {
        const s = world()
        weakness(s, target, first, second)
        const n = node(s, target)
        const hidden = n.slots.find((sl) => sl.vuln !== known)!
        hidden.vis = 0
        delete hidden.timer
        const revealed = n.slots.find((sl) => sl.vuln === known)!
        revealed.timer = 2
        if (alreadyControlled) control(s, target)
        const aimed = CARDS[card].targeting === 'node' ? target : undefined
        const before = JSON.stringify(s)
        assert.equal(predict(s, card, aimed), 'Y')
        playability(s, card)
        assert.equal(JSON.stringify(s), before, '懸停預測不得揭露或修改狀態')
        const result = play(s, card, aimed)
        assert.equal(result.effect.ok, true, card)
        assert.deepEqual(result.effect.entry, { node: target, vuln: known }, card)
        assert.deepEqual(result.effect.revealed, [], '已有入口不能額外揭露另一條件')
        assert.deepEqual(s.exploited, [{ node: target, vuln: known }])
        assert.equal(hidden.vis, 0)
        assert.equal(hidden.timer, undefined)
        assert.equal(revealed.timer, 2, '已公開弱點的修補倒數不重設')
      }
    }
  }
})

test('已知弱點修好或有防護時不再優先；盲打成功只翻真正使用的隱藏入口', () => {
  for (const [card, target, hiddenVuln, knownVuln] of alternativeEntries) {
    for (const blocked of ['fixed', 'shield', 'hidden'] as const) {
      const s = world()
      weakness(s, target, hiddenVuln, knownVuln)
      const n = node(s, target)
      n.slots[0]!.vis = 0
      delete n.slots[0]!.timer
      if (blocked === 'hidden') {
        n.slots[1]!.vis = 0
        delete n.slots[1]!.timer
      } else n.slots[1]![blocked] = true
      const result = play(s, card, CARDS[card].targeting === 'node' ? target : undefined)
      assert.equal(result.effect.ok, true)
      assert.deepEqual(result.effect.entry, { node: target, vuln: hiddenVuln })
      assert.deepEqual(result.effect.revealed, [{ node: target, idx: 0 }])
      assert.equal(n.slots[0]!.timer, repairTurnsOf(hiddenVuln))
      if (blocked === 'hidden') assert.equal(n.slots[1]!.vis, 0)
    }
  }
})

test('多條跨層路徑也優先使用已揭露捷徑，不額外揭露其他入口', () => {
  for (const known of ['allaccess', 'masterkey'] as const) {
    const s = world()
    control(s, 'sales')
    control(s, 'ai')
    weakness(s, 'infra', 'openSea')
    weakness(s, 'ai', 'masterkey')
    weakness(s, 'db', 'allaccess', 'weakpw')
    for (const n of s.nodes) for (const sl of n.slots) {
      if (sl.vuln !== known && sl.vuln !== 'weakpw') { sl.vis = 0; delete sl.timer }
    }
    assert.equal(predict(s, 'brute', 'db'), 'Y')
    const result = play(s, 'brute', 'db')
    assert.equal(result.effect.ok, true)
    assert.deepEqual(result.effect.revealed, [])
    assert.deepEqual(s.exploited, [{ node: 'db', vuln: 'weakpw' }, { node: known === 'allaccess' ? 'db' : 'ai', vuln: known }])
    assert.equal(node(s, 'infra').slots[0]!.vis, 0)
    assert.equal(node(s, 'infra').slots[0]!.timer, undefined)
  }
})

test('每種偵查、成功入侵及病毒翻牌都公開並啟動修復倒數', () => {
  for (const [card, target] of [['scan', undefined], ['osint', 'sales'], ['smooth', 'sales'], ['ally', undefined], ['phish', 'sales']] as const) {
    const s = world()
    weakness(s, 'sales', 'gullible', 'curious', 'samepw')
    weakness(s, 'ai', 'obey', 'masterkey', 'nohuman')
    for (const n of s.nodes) for (const sl of n.slots) { sl.vis = 0; delete sl.timer }
    const result = play(s, card, target)
    assert.equal(result.effect.ok, true, card)
    assert.ok(result.effect.revealed.length > 0, card)
    for (const ref of result.effect.revealed) {
      const sl = node(s, ref.node).slots[ref.idx]!
      assert.equal(sl.vis, 2, card)
      assert.equal(sl.timer, repairTurnsOf(sl.vuln), card)
    }
    const ref = result.effect.revealed[0]!
    const sl = node(s, ref.node).slots[ref.idx]!
    const before = sl.timer!
    Array.from(endOfTurn(s))
    assert.equal(sl.timer, before - 1, '翻開後第一回合就開始倒數')
  }
  const s = world()
  control(s, 'sales')
  control(s, 'infra')
  weakness(s, 'db', 'weakpw')
  node(s, 'db').slots[0]!.vis = 0
  delete node(s, 'db').slots[0]!.timer
  assert.equal(play(s, 'virus').effect.ok, true)
  const steps = Array.from(endOfTurn(s))
  const report = steps.find((step) => step.t === 'standing')
  assert.ok(report && report.t === 'standing' && report.revealed.length === 1)
  assert.equal(node(s, 'db').slots[0]!.vis, 2)
  assert.equal(node(s, 'db').slots[0]!.timer, repairTurnsOf('weakpw'), '本回合才翻開的病毒情報從下回合開始扣倒數')
})

test('控制時間延長三分之一，弱點修復速度保持原規則', () => {
  for (const [role, risk] of Object.entries(NODE_RISK)) {
    const previous = 9 - risk.notice - risk.severe
    assert.equal(recaptureTurnsOf(role as NodeRole), Math.ceil(previous * 4 / 3))
  }
  const s = world('sabotage')
  weakness(s, 'sales', 'curious')
  assert.equal(play(s, 'phish', 'sales').effect.ok, true)
  const duration = recaptureTurnsOf('sales')
  for (let turn = 1; turn < duration; turn++) {
    Array.from(endOfTurn(s))
    assert.equal(node(s, 'sales').controlled, true, `第 ${turn} 回合過早失控`)
    startHackerTurn(s)
  }
  Array.from(endOfTurn(s))
  assert.equal(node(s, 'sales').controlled, false)
})

test('隨機偵查隨滲透進度開放層級，未開放的暗牌不會被揭露或標為查無弱點', () => {
  for (const source of [null, 'sales', 'it'] as const) {
    const allowed = source === null ? [0] : source === 'sales' ? [0, 1] : [0, 1, 2]
    for (let seed = 1; seed <= 30; seed++) {
      const s = world()
      s.rng = seed
      for (const n of s.nodes) {
        weakness(s, n.id, n.role === 'ai' ? 'obey' : 'weakpw')
        n.slots[0]!.vis = 0
        delete n.slots[0]!.timer
      }
      if (source) control(s, source)
      for (const n of s.nodes) assert.equal(canRecon(s, n), allowed.includes(n.layer))
      assert.ok(hintNodes(s, 'scan').every((id) => allowed.includes(node(s, id).layer)))
      const count = s.nodes.filter((n) => allowed.includes(n.layer)).length
      for (let i = 0; i < count; i++) {
        s.ap = 20
        s.alert = 0
        const result = play(s, 'scan')
        assert.equal(result.effect.revealed.length, 1)
        assert.ok(allowed.includes(node(s, result.effect.revealed[0]!.node).layer))
      }
      assert.equal(playability(s, 'scan').status, 'dead')
      s.ap = 20
      s.alert = 0
      assert.equal(play(s, 'scan').effect.revealed.length, 0)
      for (const n of s.nodes.filter((n) => !allowed.includes(n.layer))) {
        assert.equal(n.slots[0]!.vis, 0)
        assert.equal(n.slots[0]!.timer, undefined)
        assert.equal(n.sealed, false)
      }
      if (!source) {
        control(s, 'sales')
        assert.equal(playability(s, 'scan').status, 'sure', '外圍搜完後，攻入下一層還能再偵查')
      }
    }
  }
})

test('指定目標偵查也受層級限制，捷徑尚未入侵不能提前揭露核心', () => {
  const s = world()
  weakness(s, 'sales', 'gullible')
  weakness(s, 'it', 'weakpw')
  weakness(s, 'db', 'weakpw', 'allaccess')
  weakness(s, 'infra', 'openSea', 'remote')
  for (const id of ['it', 'db']) for (const sl of node(s, id).slots) { sl.vis = 0; delete sl.timer }
  assert.equal(canRecon(s, node(s, 'infra')), false, '遠端暴露不是已滲透')
  assert.equal(predict(s, 'osint', 'it'), 'N')
  assert.equal(predict(s, 'smooth', 'db'), 'N')
  assert.throws(() => play(s, 'smooth', 'db'), /尚未解鎖/)
  control(s, 'sales')
  assert.equal(reachKnown(s, node(s, 'db')), 'Y', '自由海域允許嘗試攻擊核心')
  assert.equal(canRecon(s, node(s, 'db')), false, '僅有跨層攻擊路徑仍不可提前掃描核心')
  assert.equal(predict(s, 'osint', 'it'), 'Y')
  assert.equal(play(s, 'osint', 'it').effect.revealed.length, 1)
  control(s, 'db')
  assert.equal(canRecon(s, node(s, 'backup')), true, '確實攻入核心才開放同層偵查')
  node(s, 'db').controlled = false
  node(s, 'sales').controlled = false
  assert.equal(canRecon(s, node(s, 'it')), false, '失去入口後重新限制偵查')
  assert.equal(node(s, 'db').slots[0]!.timer, undefined)
})

test('限制偵查層級後，能言善道在有好騙員工的配置仍會保留', () => {
  const s = world()
  weakness(s, 'sales', 'gullible')
  assert.ok(!uselessCards(s).includes('smooth'))
  weakness(s, 'sales')
  assert.ok(uselessCards(s).includes('smooth'))
})

test('任何任務都不能只靠外圍控制過關，舊私人雲端資料也不再觸發勝利', () => {
  for (const mission of MISSION_IDS) {
    const s = world(mission)
    for (const id of ['sales', 'engineer', 'boss', 'ai']) control(s, id)
    weakness(s, 'sales', 'gullible')
    weakness(s, 'db', 'privcloud', 'plaintext', 'weakpw')
    node(s, 'db').slots.forEach((sl) => { sl.vis = 0; delete sl.timer })
    assert.equal(dbAccess(s), false)
    const finisher = MISSIONS[mission].finisher
    if (finisher) assert.equal(play(s, finisher, finisher === 'bec' ? 'sales' : undefined).win, false)
    for (let turn = 0; turn < 3; turn++) {
      Array.from(endOfTurn(s))
      assert.notEqual(s.result, 'win', `${mission} 不能只控制外圍獲勝`)
      if (mission === 'espionage') assert.equal(s.hold, 0)
      startHackerTurn(s)
    }
  }
  assert.ok(!vulnPool('data', 'db').includes('privcloud'))
})

test('假老闆詐騙須控制主管與通訊基礎設施，目標仍必須容易受騙', () => {
  const s = world('bossfraud')
  weakness(s, 'sales', 'gullible')
  control(s, 'boss')
  assert.equal(predict(s, 'bec', 'sales'), 'N')
  control(s, 'infra')
  node(s, 'boss').controlled = false
  assert.equal(predict(s, 'bec', 'sales'), 'N')
  control(s, 'boss')
  assert.equal(predict(s, 'bec', 'engineer'), 'N')
  assert.equal(play(s, 'bec', 'sales').win, true)
})

test('竊取資料須真正控制資料庫，只有已揭露明文才縮短維持時間', () => {
  for (const disclosed of [false, true]) {
    const s = world('espionage')
    control(s, 'db')
    weakness(s, 'db', 'plaintext')
    node(s, 'db').slots[0]!.vis = disclosed ? 2 : 0
    if (!disclosed) delete node(s, 'db').slots[0]!.timer
    assert.equal(holdNeeded(s), disclosed ? 1 : 2)
    Array.from(endOfTurn(s))
    assert.equal(s.hold, 1)
    assert.equal(s.result === 'win', disclosed)
    if (!disclosed) {
      startHackerTurn(s)
      Array.from(endOfTurn(s))
      assert.equal(s.result, 'win')
    }
  }
})

test('備份可用共用弱點入侵；失效只減慢系統奪回，不更動修補與備份自身倒數', () => {
  for (const [card, vuln] of [['brute', 'weakpw'], ['exploit', 'buggy'], ['exploit', 'legacy']] as const) {
    const s = world()
    control(s, 'it')
    weakness(s, 'backup', vuln)
    assert.equal(predict(s, card, 'backup'), 'Y')
    assert.equal(play(s, card, 'backup').effect.ok, true)
    assert.equal(node(s, 'backup').controlled, true)
  }
  for (const unavailable of ['normal', 'controlled', 'paralyzed', 'nobackup'] as const) {
    const s = world('sabotage')
    for (const id of ['sales', 'it', 'infra', 'db']) control(s, id)
    if (unavailable === 'controlled') control(s, 'backup')
    if (unavailable === 'paralyzed') node(s, 'backup').paralyzed = 6
    if (unavailable === 'nobackup') weakness(s, 'backup', 'nobackup')
    assert.equal(backupUnavailable(s), unavailable !== 'normal')
    for (const n of s.nodes) {
      const slow = unavailable !== 'normal' && ['it', 'infra', 'db'].includes(n.id)
      assert.equal(recaptureSpeedOf(s, n), speedOf(s) * (slow ? 0.5 : 1))
      if (n.controlled) {
        n.timer = 4
        assert.equal(upcoming(s).find((u) => u.node === n.id && u.kind === 'recapture')?.eta, slow ? 8 : 4)
      }
    }
    Array.from(endOfTurn(s))
    for (const id of ['it', 'infra', 'db']) assert.equal(node(s, id).timer, unavailable === 'normal' ? 3 : 3.5)
    assert.equal(node(s, 'sales').timer, 3)
    if (unavailable === 'controlled') assert.equal(node(s, 'backup').timer, 3)
  }
})

test('備份恢復或被奪回的回合以同一個起始狀態計算，不因節點順序改變結果', () => {
  for (const transition of ['restore', 'recapture'] as const) {
    for (const reverse of [false, true]) {
      const s = world('sabotage')
      control(s, 'infra')
      control(s, 'db')
      if (transition === 'restore') node(s, 'backup').paralyzed = 1
      else {
        control(s, 'backup')
        node(s, 'backup').timer = 1
      }
      if (reverse) s.nodes.reverse()
      const before = node(s, 'db').timer
      Array.from(endOfTurn(s))
      assert.equal(node(s, 'db').timer, before - 0.5)
      assert.equal(backupUnavailable(s), false)
      assert.equal(recaptureSpeedOf(s, node(s, 'db')), 1)
    }
  }
})

test('控制備份在所有任務每回合多抽一張；癱瘓、失控與滿手牌仍遵守限制', () => {
  for (const mission of MISSION_IDS) {
    const s = world(mission)
    control(s, 'backup')
    s.deck = Array.from({ length: 20 }, () => ({ uid: ++s.uidSeq, id: 'scan' as const }))
    assert.equal(startHackerTurn(s).length, 3)
    node(s, 'backup').paralyzed = 2
    assert.equal(startHackerTurn(s).length, 2)
    node(s, 'backup').paralyzed = 0
    assert.equal(startHackerTurn(s).length, 3)
    assert.equal(s.hand.length, HAND_MAX)
    assert.equal(startHackerTurn(s).length, 0)
    s.hand = []
    node(s, 'backup').controlled = false
    assert.equal(startHackerTurn(s).length, 2)
  }
  const s = world('ransom')
  control(s, 'db')
  control(s, 'backup')
  assert.equal(predict(s, 'ransom'), 'Y')
  assert.equal(play(s, 'ransom').win, true)
})

test('直接控制牌可再次對已控制目標出牌，累加時長且照常支付費用與噪音', () => {
  const cases: Array<[CardId, string, VulnId | null]> = [
    ['phish', 'boss', 'curious'], ['social', 'boss', 'gullible'], ['cred', 'boss', 'samepw'],
    ['tail', 'boss', 'lazy'], ['mfa', 'boss', 'approver'],
    ...(['sales', 'it', 'infra', 'db', 'backup'] as const).map((target): [CardId, string, VulnId] => ['brute', target, 'weakpw']),
    ...(['engineer', 'it', 'infra', 'db', 'backup'] as const).map((target): [CardId, string, VulnId] => ['exploit', target, 'buggy']),
    ['inject', 'ai', 'obey'], ['skill', 'ai', 'selfupd'], ['usb', 'infra', null],
  ]
  for (const [card, target, vuln] of cases) {
    const s = world('sabotage')
    const n = node(s, target)
    if (vuln) weakness(s, target, vuln)
    if (n.layer === 1 || card === 'usb') control(s, 'sales')
    if (n.layer === 2) control(s, 'it')
    const first = play(s, card, CARDS[card].targeting === 'node' ? target : undefined)
    assert.equal(first.effect.ok, true, `${card}/${target}`)
    assert.deepEqual(first.effect.extended, [])
    const count = ctrlCount(s), bonus = apBonusOf(s), sequence = n.controlSeq
    n.timer = 1.5
    const repairs = n.slots.map((sl) => sl.timer)
    s.ap = 20
    s.alert = 0
    const aimed = CARDS[card].targeting === 'node' ? target : undefined
    assert.equal(predict(s, card, aimed), 'Y', `${card}/${target} 不能變成死牌`)
    assert.equal(playability(s, card).status, 'sure')
    const result = play(s, card, aimed)
    assert.equal(result.effect.ok, true)
    assert.deepEqual(result.effect.captured, [target])
    assert.deepEqual(result.effect.extended, [target])
    assert.equal(n.timer, 1.5 + recaptureTurnsOf(n.role))
    assert.equal(s.ap, 20 - result.cost)
    assert.equal(s.alert, result.noise)
    assert.equal(ctrlCount(s), count)
    assert.equal(apBonusOf(s), bonus, '不能重複疊加員工行動點能力')
    assert.equal(n.controlSeq, sequence, '續控維持原本控制順序')
    assert.deepEqual(n.slots.map((sl) => sl.timer), repairs, '不能重啟弱點修補倒數')
  }
})

test('連續鞏固會累加完整時長，已控制的深層節點不因原入口失去而被鎖住', () => {
  const s = world('sabotage')
  weakness(s, 'db', 'weakpw')
  control(s, 'db')
  const base = recaptureTurnsOf('db')
  assert.equal(reachKnown(s, node(s, 'db')), 'Y')
  assert.equal(reachKnown(s, node(s, 'backup')), 'N', '不能藉續控放寬其他未控制目標的路徑')
  for (let repeat = 1; repeat <= 3; repeat++) {
    s.ap = 20
    s.alert = 0
    assert.equal(play(s, 'brute', 'db').effect.ok, true)
    assert.equal(node(s, 'db').timer, (repeat + 1) * base)
  }
})

test('鞏固既有控制不需要新捷徑，也不會提前揭露未使用的捷徑弱點', () => {
  const s = world('sabotage')
  control(s, 'sales')
  control(s, 'db')
  weakness(s, 'db', 'weakpw', 'allaccess')
  const shortcut = node(s, 'db').slots[1]!
  shortcut.vis = 0
  delete shortcut.timer
  const result = play(s, 'brute', 'db')
  assert.equal(result.effect.ok, true)
  assert.equal(shortcut.vis, 0)
  assert.equal(shortcut.timer, undefined)
  assert.ok(!s.exploited.some((entry) => entry.vuln === 'allaccess'))
})

test('續控仍須有可利用弱點或指定前置，失敗不能延長倒數', () => {
  for (const blocked of ['fixed', 'shield', 'missing'] as const) {
    const s = world()
    control(s, 'boss')
    if (blocked !== 'missing') {
      weakness(s, 'boss', 'curious')
      node(s, 'boss').slots[0]![blocked] = true
    }
    const before = node(s, 'boss').timer
    assert.equal(predict(s, 'phish', 'boss'), 'N')
    const result = play(s, 'phish', 'boss')
    assert.equal(result.effect.ok, false)
    assert.deepEqual(result.effect.extended, [])
    assert.equal(node(s, 'boss').timer, before)
  }
  const s = world()
  control(s, 'infra')
  assert.equal(predict(s, 'usb'), 'N', 'USB 仍需要受控員工')
  const before = node(s, 'infra').timer
  assert.equal(play(s, 'usb').effect.ok, false)
  assert.equal(node(s, 'infra').timer, before)
})

test('續控保留病毒與癱瘓狀態，且不重新給予 AI 當回合免費出牌', () => {
  const s = world('sabotage')
  control(s, 'sales')
  control(s, 'infra')
  node(s, 'infra').virus = true
  assert.deepEqual(play(s, 'usb').effect.extended, ['infra'])
  assert.equal(node(s, 'infra').virus, true)
  control(s, 'it')
  control(s, 'backup')
  weakness(s, 'backup', 'weakpw')
  node(s, 'backup').paralyzed = 3
  s.alert = 0
  assert.deepEqual(play(s, 'brute', 'backup').effect.extended, ['backup'])
  assert.equal(node(s, 'backup').paralyzed, 3)
  control(s, 'ai')
  weakness(s, 'ai', 'obey')
  s.freePlayReady = false
  s.alert = 0
  assert.deepEqual(play(s, 'inject').effect.extended, ['ai'])
  assert.equal(s.freePlayReady, false)
})

test('提示詞注入保留穩定控制權路線；拿到牌仍可能在尚未控制 IT 時盲打失敗', () => {
  const outcomes = new Set<boolean>()
  for (const aiVuln of ['obey', 'nohuman', 'masterkey'] as const) {
    const s = world('sabotage')
    weakness(s, 'sales', 'curious')
    weakness(s, 'it', 'weakpw')
    weakness(s, 'ai', aiVuln)
    node(s, 'ai').slots[0]!.vis = 0
    delete node(s, 'ai').slots[0]!.timer
    assert.ok(!uselessCards(s).includes('inject'), '未來可控制 IT 時，即使 AI 沒有捷徑弱點也應留牌')
    assert.equal(predict(s, 'inject'), 'M', '同樣的公開情報應顯示同樣的未知結果')
    const result = play(s, 'inject')
    outcomes.add(result.effect.ok)
    assert.equal(result.effect.ok, aiVuln !== 'masterkey')
    if (result.effect.ok) assert.equal(result.effect.entry?.vuln, aiVuln)
    else {
      assert.equal(node(s, 'ai').controlled, false)
      assert.equal(s.ap, 20 - result.cost)
      assert.equal(s.alert, result.noise)
    }
  }
  assert.equal(outcomes.size, 2)
  const stable = world()
  control(stable, 'it')
  weakness(stable, 'ai', 'obey', 'nohuman')
  node(stable, 'ai').slots.forEach((sl) => { sl.shield = true; sl.vis = 0 })
  assert.equal(predict(stable, 'inject'), 'Y')
  const result = play(stable, 'inject')
  assert.equal(result.effect.ok, true)
  assert.equal(result.effect.entry, null, '用 IT 權限時不冒稱利用了 AI 弱點')
  assert.deepEqual(result.effect.revealed, [])
})

test('原本的惡意技能與 USB 穩定前置保留，沒有改成更複雜的必備弱點', () => {
  const s = world()
  weakness(s, 'ai', 'masterkey')
  node(s, 'ai').slots[0]!.vis = 0
  assert.equal(predict(s, 'skill'), 'M')
  assert.equal(play(s, 'skill').effect.ok, false)
  control(s, 'sales')
  assert.equal(predict(s, 'skill'), 'Y')
  assert.equal(play(s, 'skill').effect.ok, true)
  assert.equal(CARDS.usb.targeting, 'auto')
  assert.equal(predict(s, 'usb'), 'Y')
  assert.deepEqual(play(s, 'usb').effect.captured, ['infra'])
})

test('能言善道只對可偵查員工有效，已控制員工也不能讓它對機器出牌', () => {
  for (const prepared of [false, true]) {
    const s = world()
    if (prepared) control(s, 'sales')
    control(s, 'infra') // 開放核心，排除只是被層級擋住的可能。
    for (const id of ['ai', 'infra', 'db', 'backup']) {
      weakness(s, id, id === 'ai' ? 'obey' : 'weakpw')
      node(s, id).slots[0]!.vis = 0
      delete node(s, id).slots[0]!.timer
      assert.equal(canRecon(s, node(s, id)), true)
      assert.equal(predict(s, 'smooth', id), 'N')
      assert.ok(!(id in playability(s, 'smooth').targets))
      const result = play(s, 'smooth', id)
      assert.equal(result.effect.ok, false)
      assert.deepEqual(result.effect.revealed, [])
      assert.equal(node(s, id).slots[0]!.vis, 0)
    }
  }
})

test('能言善道可賭所選員工的弱點，或先控制員工再穩定套話', () => {
  for (const targetVuln of ['gullible', 'oversharer', 'weakpw'] as const) {
    const s = world()
    weakness(s, 'boss', 'gullible') // 別人的好騙不能替目標保證成功。
    weakness(s, 'sales', 'curious') // 保留未來穩定取得員工控制權的路線。
    weakness(s, 'engineer', targetVuln)
    node(s, 'engineer').slots[0]!.vis = 0
    delete node(s, 'engineer').slots[0]!.timer
    assert.ok(!uselessCards(s).includes('smooth'))
    assert.equal(predict(s, 'smooth', 'engineer'), 'M')
    const result = play(s, 'smooth', 'engineer')
    assert.equal(result.effect.ok, targetVuln !== 'weakpw')
    if (targetVuln !== 'weakpw') assert.equal(result.effect.revealed[0]?.node, 'engineer')
    else {
      assert.equal(node(s, 'engineer').slots[0]!.vis, 0)
      control(s, 'sales')
      assert.equal(predict(s, 'smooth', 'engineer'), 'Y')
      assert.equal(play(s, 'smooth', 'engineer').effect.revealed[0]?.node, 'engineer')
    }
  }
  const s = world()
  weakness(s, 'it', 'oversharer')
  node(s, 'it').slots[0]!.vis = 0
  assert.equal(predict(s, 'smooth', 'it'), 'N', 'IT 仍須先開放內網才可套話')
  control(s, 'sales')
  assert.equal(predict(s, 'smooth', 'it'), 'Y', 'IT 也是員工目標')
})

test('實際發牌仍排除無用牌，但抽到提示詞注入不再保證開局控制 AI', () => {
  const outcomes = new Set<boolean>()
  for (let seed = 1; seed <= 200 && outcomes.size < 2; seed++) {
    const s = newGame({ seed, scenario: 'factory', mission: 'sabotage' })
    const card = [...s.hand, ...s.deck].find((inst) => inst.id === 'inject')
    if (!card) continue
    if (!s.hand.some((inst) => inst.uid === card.uid)) {
      s.deck = s.deck.filter((inst) => inst.uid !== card.uid)
      s.hand.push(card)
    }
    assert.equal(predict(s, 'inject'), 'M')
    outcomes.add(playCard(s, card.uid).effect.ok)
  }
  assert.equal(outcomes.size, 2, '真實開局中要同時存在盲打成功與失敗的配置')
})
