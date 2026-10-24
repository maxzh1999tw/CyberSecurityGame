import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCompanyGame,
  canPlayCompany,
  companyDeadReason,
  companyCardCost,
  companyDrawCount,
  fixGuess,
  companyKnows,
  companyTargets,
  defenseProgress,
  endCompanyTurn,
  fire,
  forecast,
  hireTo,
  missingKinds,
  moveTo,
  newDraft,
  openErrors,
  OUTCOME_TEXT,
  playCompanyCard,
  productionOf,
  recycleCompanyCard,
  startCompanyTurn,
  type DraftState,
} from '../src/game/company.ts'
import { botBuild, leanBuild } from '../src/game/companyBot.ts'
import { COMPANY, COMPANY_CARDS, HIRES, HIRE_KINDS, MACHINE_NAMES, PERSONAS, REQUIRED, TIER_VULNS } from '../src/game/companyData.ts'
import { endOfTurn, INSURANCE_PAYOUT, speedOf, knownHas, node, playCard, predict } from '../src/game/engine.ts'
import type { CompanyCardId, GameState, HireKind } from '../src/game/types.ts'

function drafted(seed = 7): DraftState {
  const d = newDraft(seed)
  botBuild(d)
  return d
}

/** 已經進到公司回合、手上只有指定牌的局面 */
function companyTurn(seed = 7): GameState {
  const d = drafted(seed)
  const s = buildCompanyGame(d, { seed })
  s.phase = 'company'
  s.company!.hand = []
  // 測試規則時錢夠用；要測錢不夠的再自己調低
  s.company!.assets = 1000
  return s
}

function give(s: GameState, id: CompanyCardId) {
  const uid = ++s.uidSeq
  s.company!.hand.push({ uid, id })
  return uid
}

const first = (s: GameState, hire: HireKind) => s.nodes.find((n) => n.econ?.hire === hire)!

test('人力市場：每一類都有遠多於需要的候選人，而且四種等級都至少一位', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const d = newDraft(seed)
    for (const hire of HIRE_KINDS) {
      assert.equal(d.market[hire].length, COMPANY.marketSize[hire])
      for (const tier of [1, 2, 3]) {
        const n = d.market[hire].filter((c) => c.tier === tier).length
        assert.ok(n >= (COMPANY.marketPerTier[hire] ?? 1), `${hire} ${tier} 星只有 ${n} 位`)
      }
      assert.ok(d.market[hire].length > REQUIRED[hire], `${hire} 的候選人要比需要的多`)
      for (const t of [1, 2, 3]) assert.ok(d.market[hire].some((c) => c.tier === t), `${hire} 缺少等級 ${t}`)
      if (hire === 'ai' || hire === 'db' || hire === 'backup' || hire === 'infra') {
        assert.equal(new Set(d.market[hire].map((c) => c.name)).size, d.market[hire].length, '機器名字不重複')
      }
      for (const c of d.market[hire]) {
        if (HIRES[c.hire].productive) assert.ok(c.value > 0)
        else assert.equal(c.value, 0, '防守節點沒有產值')
        assert.ok(c.slots.every((sl) => sl.vis === 0 && !sl.known), '公司一開始看不到自己的弱點')
        const vulns = c.slots.filter((sl) => !sl.shield).length
        assert.equal(vulns, Math.min(c.slots.length, TIER_VULNS[c.tier]), `${c.name}：${c.tier} 星的弱點數不對`)
        assert.ok(vulns >= 1, '每個節點至少有 1 個弱點')
      }
    }
  }
})

test('聘用與擺放：只能擺在允許的層；每層滿了會擋下；可以換層、移回市場', () => {
  const d = newDraft(3)
  const it = d.market.it[0]
  assert.match(hireTo(d, it.uid, 0)!, /只能擺在內網/)
  assert.equal(hireTo(d, it.uid, 1), null)
  assert.ok(d.picks.includes(it) && !d.market.it.includes(it))
  for (const c of d.market.staff.slice(0, COMPANY.layerMax)) assert.equal(hireTo(d, c.uid, 0), null)
  assert.match(hireTo(d, d.market.staff[0].uid, 0)!, /外圍已經滿了/)
  const exec = d.market.exec[0]
  assert.match(hireTo(d, exec.uid, 0)!, /滿了/)
  assert.equal(hireTo(d, exec.uid, 1), null)
  assert.match(moveTo(d, exec.uid, 0)!, /滿了/)
  fire(d, d.picks.find((p) => p.hire === 'staff')!.uid)
  assert.equal(moveTo(d, exec.uid, 0), null, '外圍空出位子後就能換過去')
  fire(d, exec.uid)
  assert.ok(d.market.exec.includes(exec) && d.placement[exec.uid] === undefined)
})

test('開業條件：湊齊必要種類、符合擺放規則，而且每回合收益要夠高', () => {
  const d = newDraft(5)
  assert.ok(openErrors(d).some((e) => e.includes('外圍至少要有')))
  assert.equal(missingKinds(d.picks).length, Object.values(REQUIRED).reduce((a, b) => a + b, 0))
  for (let seed = 1; seed <= 40; seed++) {
    const ok = drafted(seed)
    if (openErrors(ok).length) continue
    assert.deepEqual(missingKinds(ok.picks), [])
    assert.ok(forecast(ok.picks, ok.placement).net >= COMPANY.minNet)
  }
  // 只湊齊必要種類、全挑最貴的防守節點，收益不夠就不能開業
  const poor = newDraft(9)
  for (const hire of HIRE_KINDS) {
    const pool = [...poor.market[hire]].sort((a, b) => b.cost - a.cost)
    for (let k = 0; k < REQUIRED[hire]; k++) hireTo(poor, pool[k].uid, HIRES[hire].layers[0])
  }
  if (forecast(poor.picks, poor.placement).net < COMPANY.minNet) {
    assert.ok(openErrors(poor).some((e) => e.includes('每回合收益至少要')))
  }
})

test('開局：駭客先手、公司節點帶著經營數值，駭客模式不受影響', () => {
  const d = drafted(9)
  const s = buildCompanyGame(d, { seed: 9 })
  assert.equal(s.mode, 'company')
  assert.equal(s.phase, 'hacker')
  assert.equal(s.nodes.length, d.picks.length)
  assert.ok(s.nodes.every((n) => n.econ))
  assert.equal(s.company!.assets, d.assets)
  assert.equal(s.apBase, 3 + COMPANY.hackerAp)
  for (const hire of Object.keys(REQUIRED) as HireKind[]) assert.ok(s.nodes.some((n) => n.econ!.hire === hire))
})

test('經濟：被控制的節點照樣有產值；癱瘓、隔離、受訓的沒有；成本照付', () => {
  const s = companyTurn()
  const staff = first(s, 'staff')
  const base = productionOf(s)
  staff.controlled = true
  assert.equal(productionOf(s).gross, base.gross, '被駭客控制不影響產值')
  staff.controlled = false
  staff.paralyzed = 2
  assert.ok(productionOf(s).gross < base.gross)
  assert.equal(productionOf(s).upkeep, base.upkeep, '成本照付')
  staff.paralyzed = 0
  staff.isolated = true
  assert.ok(productionOf(s).gross < base.gross)
})

test('第 2 台起的基礎設施每台每回合多付加價：組建試算與遊戲中的營收一致', () => {
  const d = drafted()
  const infras = d.picks.filter((p) => p.hire === 'infra').length
  const f = forecast(d.picks, d.placement)
  assert.equal(f.surcharge, Math.max(0, infras - 1) * COMPANY.extraInfraCost)
  assert.equal(f.upkeep, d.picks.reduce((a, p) => a + p.cost, 0) + f.surcharge)
  const s = buildCompanyGame(d, { seed: 7 })
  assert.equal(productionOf(s).surcharge, f.surcharge)
  assert.equal(productionOf(s).net, f.net, '還沒開局，全部節點都在運作')
  // 只剩一台就沒有加價
  const one = s.nodes.filter((n) => n.econ?.hire === 'infra')
  for (const n of one.slice(1)) n.econ!.hire = 'ai'
  assert.equal(productionOf(s).surcharge, 0)
})

test('經濟：基礎設施被癱瘓不影響其他節點的產值；主管帶同層員工', () => {
  const s = companyTurn(11)
  const before = productionOf(s)
  for (const n of s.nodes) if (n.econ!.hire === 'infra') n.paralyzed = 2
  assert.equal(productionOf(s).gross, before.gross)
  for (const n of s.nodes) n.paralyzed = 0
  const exec = first(s, 'exec')
  const staffSameLayer = s.nodes.filter((n) => n.econ!.hire === 'staff' && n.layer === exec.layer).length
  assert.equal(productionOf(s).lead >= Math.min(COMPANY.leadMax, staffSameLayer), true)
})

test('出牌：直接扣資產；付不起牌價的牌不能打；免費的賺錢牌照樣能打', () => {
  const s = companyTurn()
  const co = s.company!
  const cost = COMPANY_CARDS.pentest.cost
  co.assets = cost
  playCompanyCard(s, give(s, 'pentest'), companyTargets(s, 'pentest')[0])
  assert.equal(co.assets, 0, '剛好花光')
  give(s, 'pentest')
  assert.equal(canPlayCompany(s, 'pentest'), false, '錢不夠：不能打')
  assert.match(companyDeadReason(s, 'pentest'), /錢不夠/)
  assert.equal(canPlayCompany(s, 'promo'), true, '賺錢的牌免費，照樣能打')
  playCompanyCard(s, give(s, 'promo'))
  assert.equal(co.assets, COMPANY.promoBonus, '賺的錢立刻進資產')
})

test('回合開始入帳：資產加上每回合營收；上回合受訓的人這次沒有產值，入帳後照常上班', () => {
  const s = companyTurn()
  const co = s.company!
  co.assets = 500
  const staff = first(s, 'staff')
  staff.slots = [{ vuln: 'curious', shield: false, vis: 2, fixed: false }]
  const full = productionOf(s).net
  playCompanyCard(s, give(s, 'reminder'), staff.id)
  const assets = co.assets
  const expected = productionOf(s).net
  assert.ok(expected < full, '受訓的人下回合沒有產值')
  endCompanyTurn(s)
  assert.equal(co.assets, assets, '回合結束不結算')
  startCompanyTurn(s)
  assert.equal(co.income, expected)
  assert.equal(co.assets, assets + expected)
  assert.equal(staff.training, false, '入帳後照常上班')
  assert.equal(productionOf(s).net, full)
})

/** 入帳後資產會是 −10K 的局面（用一筆大額還款壓低營收） */
function brokeAfterIncome() {
  const s = companyTurn()
  const co = s.company!
  co.assets = 10
  co.debts.push({ amount: 20 + productionOf(s).net, turns: 1 })
  return s
}

test('破產：入帳後資產是負的、手上又沒有能賺錢的牌，回合一開始就破產', () => {
  const s = brokeAfterIncome()
  endCompanyTurn(s)
  startCompanyTurn(s)
  assert.equal(s.company!.assets, -10)
  assert.equal(s.company!.outcome, 'bankrupt')
  assert.equal(s.phase, 'over')
  assert.equal(OUTCOME_TEXT.bankrupt.win, false)
})

test('破產：手上有能賺錢的牌可以先救；救回來就繼續，沒救就在結束回合時破產', () => {
  const saved = brokeAfterIncome()
  const promo = give(saved, 'promo')
  endCompanyTurn(saved)
  startCompanyTurn(saved)
  assert.equal(saved.company!.outcome, null, '還有限時特惠可以救')
  playCompanyCard(saved, promo)
  assert.equal(saved.company!.assets, COMPANY.promoBonus - 10)
  assert.equal(endCompanyTurn(saved).outcome, null)
  const lazy = brokeAfterIncome()
  give(lazy, 'promo')
  endCompanyTurn(lazy)
  startCompanyTurn(lazy)
  assert.equal(lazy.company!.outcome, null)
  assert.equal(endCompanyTurn(lazy).outcome, 'bankrupt', '沒救就結束回合：破產')
})

test('內部稽核：節點還藏著弱點時，一定先揭露弱點，不會翻到防護', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = companyTurn(seed)
    const t = first(s, 'staff')
    t.slots = [
      { vuln: 'kind', shield: true, vis: 0, fixed: false },
      { vuln: 'curious', shield: false, vis: 0, fixed: false },
      { vuln: 'gullible', shield: true, vis: 0, fixed: false },
    ]
    playCompanyCard(s, give(s, 'audit'), t.id)
    assert.equal(t.slots[1].known, true, `seed ${seed}`)
    assert.ok(!t.slots[0].known && !t.slots[2].known, `seed ${seed}`)
  }
  // 弱點都找出來了，才會翻到防護
  const s = companyTurn()
  const t = first(s, 'staff')
  t.slots = [
    { vuln: 'kind', shield: true, vis: 0, fixed: false },
    { vuln: 'curious', shield: false, vis: 0, fixed: false, known: true },
  ]
  playCompanyCard(s, give(s, 'audit'), t.id)
  assert.equal(t.slots[0].known, true)
})

test('牌的費用就是牌上的價錢：IT 在不在都一樣', () => {
  const s = companyTurn()
  assert.equal(companyCardCost(s, 'pentest'), COMPANY_CARDS.pentest.cost)
  for (const n of s.nodes) if (n.econ!.hire === 'it') n.controlled = true
  assert.equal(companyCardCost(s, 'pentest'), COMPANY_CARDS.pentest.cost)
})

test('稽核只讓公司知道，駭客看不到；修補要先知道弱點', () => {
  const s = companyTurn()
  const db = first(s, 'db')
  db.slots = [{ vuln: 'weakpw', shield: false, vis: 0, fixed: false }]
  assert.ok(!companyTargets(s, 'patch').includes(db.id), '不知道的弱點不能修')
  playCompanyCard(s, give(s, 'audit'), db.id)
  assert.equal(companyKnows(db.slots[0]), true)
  assert.equal(knownHas(db, 'weakpw'), 'M', '公司稽核的結果駭客看不到')
  playCompanyCard(s, give(s, 'patch'), db.id)
  assert.equal(db.slots[0].fixed, true)
})

test('日常提醒：弱點變防護、下回合沒有產值；換人與升級會清掉駭客的控制', () => {
  const s = companyTurn()
  const staff = first(s, 'staff')
  staff.slots = [{ vuln: 'curious', shield: false, vis: 2, fixed: false }]
  const gross = productionOf(s).gross
  playCompanyCard(s, give(s, 'reminder'), staff.id)
  assert.equal(staff.slots[0].shield, true)
  assert.ok(productionOf(s).gross < gross, '受訓的人下回合入帳時沒有產值')
  const infra = first(s, 'infra')
  infra.controlled = true
  infra.econ!.tier = 1
  playCompanyCard(s, give(s, 'upgrade'), infra.id)
  assert.equal(infra.controlled, false)
  assert.equal(infra.econ!.tier, 2)
  assert.ok(infra.slots.every((sl) => sl.vis === 0 && !sl.known), '新設備的牌又是未知的')
})

test('教育訓練：下一張修補員工弱點的牌對同一層所有員工生效，沒發現的也修好；整層下回合沒有產值', () => {
  const s = companyTurn()
  const staff = first(s, 'staff')
  const layer = s.nodes.filter((n) => n.layer === staff.layer && n.kind === 'employee')
  const others = s.nodes.filter((n) => n.layer !== staff.layer && n.kind === 'employee')
  assert.ok(layer.length >= 2)
  // 目標以外的人：一半有沒發現的「好騙」，一半沒有
  layer.forEach((n, i) => (n.slots = [{ vuln: i % 2 === 0 ? 'gullible' : 'curious', shield: false, vis: 0, fixed: false }]))
  for (const n of others) n.slots = [{ vuln: 'gullible', shield: false, vis: 0, fixed: false }]
  assert.equal(companyCardCost(s, 'training'), 0, '教育訓練免費')
  playCompanyCard(s, give(s, 'training'))
  assert.equal(s.company!.trainingNext, true)
  assert.equal(canPlayCompany(s, 'training'), false, '一回合只能安排一次')
  playCompanyCard(s, give(s, 'fixGullible'), staff.id)
  assert.equal(s.company!.trainingNext, false, '只放大下一張')
  layer.forEach((n, i) => {
    assert.equal(n.slots[0].shield, i % 2 === 0, n.name)
    assert.equal(n.training, true, '整層都去上課')
  })
  for (const n of others) {
    assert.equal(n.slots[0].shield, false, '別層的人不受影響')
    assert.ok(!n.training)
  }
  endCompanyTurn(s)
  startCompanyTurn(s)
  assert.ok(layer.every((n) => !n.training), '下回合入帳後照常上班')
})

test('修補漏洞也能修 AI 的已知弱點', () => {
  const s = companyTurn()
  const ai = first(s, 'ai')
  ai.slots = [{ vuln: ai.slots.find((sl) => sl.vuln)!.vuln, shield: false, vis: 2, fixed: false }]
  assert.ok(companyTargets(s, 'patch').includes(ai.id))
  playCompanyCard(s, give(s, 'patch'), ai.id)
  assert.equal(ai.slots[0].fixed, true)
})

test('隔離：駭客 2 回合不能對它出牌，之後恢復；解除後要隔一回合才能再隔離', () => {
  const s = companyTurn()
  const staff = first(s, 'staff')
  staff.slots = [{ vuln: 'curious', shield: false, vis: 2, fixed: false }]
  playCompanyCard(s, give(s, 'isolate'), staff.id)
  endCompanyTurn(s)
  assert.equal(s.phase, 'hacker')
  assert.equal(predict(s, 'phish', staff.id), 'N')
  s.hand.push({ uid: ++s.uidSeq, id: 'phish' })
  assert.throws(() => playCard(s, s.uidSeq, staff.id))
  s.hand = s.hand.filter((c) => c.uid !== s.uidSeq)
  s.actedThisTurn = true
  for (const _ of endOfTurn(s)) { /* 推進 */ }
  startCompanyTurn(s)
  assert.equal(staff.isolated, true, '第二回合還在隔離')
  endCompanyTurn(s)
  s.actedThisTurn = true
  for (const _ of endOfTurn(s)) { /* 推進 */ }
  startCompanyTurn(s)
  assert.equal(staff.isolated, false, '兩回合後恢復')
  assert.ok(!companyTargets(s, 'isolate').includes(staff.id), '剛解除，這回合不能再隔離')
})

test('猜弱點的修補牌：猜中就修好，猜錯白費但記住沒有；只能指定可能有這個弱點的節點', () => {
  const s = companyTurn()
  const staff = first(s, 'staff')
  const db = first(s, 'db')
  staff.slots = [
    { vuln: 'kind', shield: false, vis: 0, fixed: false },
    { vuln: 'curious', shield: false, vis: 0, fixed: false },
  ]
  assert.equal(fixGuess(staff, 'kind'), 'M', '還沒確認：可能有')
  assert.ok(!companyTargets(s, 'fixKind').includes(db.id), '資料庫不會有「好心人」')
  const hit = playCompanyCard(s, give(s, 'fixKind'), staff.id)
  assert.equal(hit.fixed.length, 1)
  assert.equal(staff.slots[0].shield, true)
  assert.equal(fixGuess(staff, 'kind'), 'N', '修好了就不用再修')
  const miss = playCompanyCard(s, give(s, 'fixGullible'), staff.id)
  assert.equal(miss.fixed.length, 0, '沒有「好騙」：白費')
  assert.equal(fixGuess(staff, 'gullible'), 'N', '猜錯過的就記住沒有')
  staff.slots[1].known = true
  assert.equal(fixGuess(staff, 'curious'), 'Y', '已確認有：一定修得到')
})

test('公司模式：被控制的節點會倒數奪回（也能出牌立刻奪回）；已知弱點會慢慢修好', () => {
  const s = companyTurn()
  s.phase = 'hacker'
  s.turn = 2
  s.actedThisTurn = true
  const staff = first(s, 'staff')
  staff.controlled = true
  staff.timer = 0.1
  staff.slots = [{ vuln: 'curious', shield: false, vis: 2, fixed: false, timer: 0.1 }]
  const other = s.nodes.find((n) => n.econ?.hire === 'staff' && n !== staff)!
  other.controlled = true
  other.timer = 9
  for (const _ of endOfTurn(s)) { /* 推進 */ }
  assert.equal(staff.controlled, false, '倒數到了就自動奪回')
  assert.equal(other.controlled, true, '還沒到的繼續被控制')
  assert.equal(staff.slots[0].fixed, true, '公開的弱點倒數到了就修好')
  startCompanyTurn(s)
  s.company!.hand = []
  playCompanyCard(s, give(s, 'recapture'), other.id)
  assert.equal(other.controlled, false, '出牌立刻奪回')
})

test('完美防禦：全部確認過、沒有弱點、沒有被控制、這回合入帳的營收是正的', () => {
  const s = companyTurn()
  for (const n of s.nodes) for (const sl of n.slots) Object.assign(sl, { shield: true, known: true })
  assert.equal(defenseProgress(s).perfect, true)
  s.nodes[0].slots[0].known = false
  assert.equal(defenseProgress(s).perfect, false, '沒確認過的牌不算')
  s.nodes[0].slots[0].known = true
  s.company!.income = 0
  assert.notEqual(endCompanyTurn(s).outcome, 'perfect', '沒有盈餘不算')
  const t = companyTurn()
  for (const n of t.nodes) for (const sl of n.slots) Object.assign(sl, { shield: true, known: true })
  t.company!.income = 10
  assert.equal(endCompanyTurn(t).outcome, 'perfect')
})

test('威脅情資：警戒值 6 以上才能打', () => {
  const s = companyTurn()
  give(s, 'intel')
  s.alert = COMPANY.intelAlert - 1
  assert.equal(canPlayCompany(s, 'intel'), false)
  s.alert = COMPANY.intelAlert
  assert.equal(canPlayCompany(s, 'intel'), true)
})

test('換牌：花錢把一張手牌換成新的', () => {
  const s = companyTurn()
  const uid = give(s, 'intel')
  const assets = s.company!.assets
  const fresh = recycleCompanyCard(s, uid)
  assert.ok(fresh)
  assert.equal(s.company!.assets, assets - COMPANY.recycleCost)
  assert.ok(!s.company!.hand.some((c) => c.uid === uid))
})

test('資安保險在下次被控制時理賠；公關把警戒推到 10 就抓到駭客；監控讓駭客噪音 +1', () => {
  const caught = companyTurn()
  caught.alert = 9
  playCompanyCard(caught, give(caught, 'pr'), undefined)
  assert.equal(caught.alert, 10)
  assert.equal(caught.company!.outcome, 'caught')
  assert.equal(caught.phase, 'over')
  const s = companyTurn()
  playCompanyCard(s, give(s, 'insurance'), undefined)
  playCompanyCard(s, give(s, 'monitor'), undefined)
  s.alert = 7
  playCompanyCard(s, give(s, 'pr'), undefined)
  assert.equal(s.alert, 8)
  s.alert = 0
  endCompanyTurn(s)
  // 固定局面：基礎設施沒有「沒人看紀錄」（噪音才不會減半）
  for (const n of s.nodes) if (n.kind === 'infra') for (const sl of n.slots) sl.shield = true
  const staff = first(s, 'staff')
  staff.slots = [{ vuln: 'curious', shield: false, vis: 2, fixed: false }]
  const assets = s.company!.assets
  s.hand.push({ uid: ++s.uidSeq, id: 'phish' })
  const r = playCard(s, s.uidSeq, staff.id)
  assert.equal(r.effect.ok, true)
  assert.equal(r.noise, 3, '釣魚郵件噪音 2，監控 +1')
  assert.equal(s.company!.assets, assets + INSURANCE_PAYOUT)
  assert.equal(node(s, staff.id).controlled, true)
})

test('人物的名字、頭像、星級固定成一組，同一個人不會出現兩次；機器依等級取名', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const d = newDraft(seed)
    for (const hire of ['staff', 'exec', 'it'] as const) {
      for (const c of d.market[hire]) {
        const p = PERSONAS[hire].find((x) => x.name === c.name)
        assert.ok(p, `${c.name} 不是固定的人物`)
        assert.equal(c.art, p!.art, `${c.name} 的頭像不對`)
        assert.equal(c.tier, p!.tier, `${c.name} 應該是 ${p!.tier} 星`)
      }
      const names = d.market[hire].map((c) => c.name)
      assert.equal(new Set(names).size, names.length, `${hire} 有人重複出現`)
    }
    for (const hire of ['ai', 'db', 'backup', 'infra'] as const) {
      for (const c of d.market[hire]) assert.ok(MACHINE_NAMES[hire][c.tier].includes(c.name), `${c.name} 的名字和等級對不上`)
    }
  }
})

test('基礎設施可以擺在核心，但內網至少要有一台', () => {
  const d = newDraft(21)
  const [a, b] = d.market.infra
  assert.equal(hireTo(d, a.uid, 2), null, '基礎設施可以擺核心')
  assert.ok(openErrors(d).some((e) => e.includes('內網至少要有 1 台基礎設施')))
  assert.equal(hireTo(d, b.uid, 1), null)
  assert.ok(!openErrors(d).some((e) => e.includes('基礎設施')))
  assert.match(hireTo(d, d.market.infra[0].uid, 0)!, /只能擺在內網或核心/)
})

test('快速配置：永遠不挑一星，用最少的節點過門檻；排不到就多刷二星、三星人選，每個人力市場都排得出來', () => {
  const minimum = Object.values(REQUIRED).reduce((a, b) => a + b, 0)
  let short = 0
  for (let seed = 1; seed <= 150; seed++) {
    const d = newDraft(seed)
    leanBuild(d)
    assert.ok(d.picks.every((p) => p.tier > 1), `seed ${seed}：挑到一星`)
    const errors = openErrors(d)
    if (errors.length) {
      short++
      assert.ok(errors.every((e) => e.includes('收益')), `seed ${seed}：${errors.join('、')}`)
      continue
    }
    assert.ok(d.picks.length <= minimum + 4, `seed ${seed}：${d.picks.length} 個節點`)
  }
  assert.equal(short, 0, `${short} 個市場排不到開業門檻`)
})

test('起手牌：開業時就在手上，第 1 個公司回合不再多抽；之後照常抽牌', () => {
  const s = buildCompanyGame(drafted(), { seed: 7 })
  const opening = s.company!.hand.length
  assert.equal(opening, COMPANY.openingHand)
  assert.equal(s.phase, 'hacker')
  s.actedThisTurn = true
  for (const _ of endOfTurn(s)) { /* 推進 */ }
  assert.deepEqual(startCompanyTurn(s), [])
  assert.equal(s.company!.hand.length, opening)
  endCompanyTurn(s)
  s.actedThisTurn = true
  for (const _ of endOfTurn(s)) { /* 推進 */ }
  assert.ok(startCompanyTurn(s).length > 0)
})

test('每回合抽牌數開業時就固定：保底 1 張、每 2 位一般員工多 1 張；之後員工被控制、隔離、癱瘓都不變', () => {
  const s = companyTurn()
  const staff = s.nodes.filter((n) => n.econ?.hire === 'staff')
  const fixed = COMPANY.draw + Math.floor(staff.length / COMPANY.staffPerDraw)
  assert.equal(companyDrawCount(s), fixed)
  for (const n of staff) Object.assign(n, { isolated: true, controlled: true, paralyzed: 2 })
  assert.equal(companyDrawCount(s), fixed)
  s.company!.hand = []
  s.company!.turn = 1
  s.phase = 'hacker'
  assert.equal(startCompanyTurn(s).length, fixed)
})

test('抽牌類的牌：主管進修；不會把自己抽回來', () => {
  const s = companyTurn()
  const co = s.company!
  co.deck = []
  co.discard = []
  const uid = give(s, 'execCoach')
  assert.equal(canPlayCompany(s, 'execCoach'), false, '沒有牌可以抽')
  co.discard.push({ uid: ++s.uidSeq, id: 'audit' })
  const eff = playCompanyCard(s, uid, undefined)
  assert.equal(eff.drawn.length, 1, '只剩一張可抽')
  assert.ok(!co.hand.some((c) => c.uid === uid), '打出去的牌沒有被抽回來')
  assert.ok(co.discard.some((c) => c.uid === uid))
  for (const n of s.nodes) if (n.econ?.hire === 'exec') n.controlled = true
  give(s, 'execCoach')
  assert.equal(canPlayCompany(s, 'execCoach'), false, '主管都被控制就不能進修')
})

test('手牌滿了抽不到牌：這回合可以免費換牌 2 次，用完才收錢', () => {
  const s = companyTurn()
  const co = s.company!
  co.hand = []
  for (let k = 0; k < COMPANY.handMax; k++) give(s, 'audit')
  co.turn = 1
  s.phase = 'hacker'
  assert.equal(startCompanyTurn(s).length, 0)
  assert.equal(co.freeSwaps, COMPANY.fullHandSwaps)
  const assets = co.assets
  recycleCompanyCard(s, co.hand[0].uid)
  recycleCompanyCard(s, co.hand[1].uid)
  assert.equal(co.assets, assets, '前兩次免費')
  recycleCompanyCard(s, co.hand[2].uid)
  assert.equal(co.assets, assets - COMPANY.recycleCost)
  // 下一回合手牌沒滿：沒有免費換牌
  co.hand.splice(0, 3)
  s.phase = 'hacker'
  startCompanyTurn(s)
  assert.equal(co.freeSwaps, 0)
  // 手牌差一張滿：抽到一張就不算，沒有免費換牌
  co.hand.length = Math.min(co.hand.length, COMPANY.handMax - 1)
  while (co.hand.length < COMPANY.handMax - 1) give(s, 'audit')
  s.phase = 'hacker'
  startCompanyTurn(s)
  assert.equal(co.freeSwaps, 0, '有抽到牌就沒有免費換牌')
})

test('封死任務：看到駭客的任務、而且駭客怎麼打都不可能達成，公司在回合結束時獲勝', () => {
  const sealAll = (s: GameState) => {
    for (const n of s.nodes) for (const sl of n.slots) Object.assign(sl, { shield: true, known: false, vis: 0 })
  }
  const blind = companyTurn()
  sealAll(blind)
  endCompanyTurn(blind)
  assert.equal(blind.company!.outcome, null, '沒看到任務就不算')
  const s = companyTurn()
  sealAll(s)
  s.company!.missionKnown = true
  endCompanyTurn(s)
  assert.equal(s.company!.outcome, 'blocked')
  assert.equal(s.phase, 'over')
})

test('公司稽核到的弱點也會開始修補倒數，速度跟駭客模式一樣', () => {
  const s = companyTurn()
  const t = s.nodes.find((n) => n.slots.some((sl) => !sl.shield))!
  const idx = t.slots.findIndex((sl) => !sl.shield)
  for (const sl of t.slots) sl.known = true
  t.slots[idx].known = false
  t.slots[idx].vis = 0
  playCompanyCard(s, give(s, 'audit'), t.id)
  const sl = t.slots[idx]
  assert.equal(sl.known, true)
  assert.ok(sl.timer !== undefined && sl.timer > 0)
  const before = sl.timer!
  s.phase = 'hacker'
  s.actedThisTurn = true
  for (const _ of endOfTurn(s)) { /* 推進 */ }
  if (!sl.fixed) assert.ok(Math.abs(before - sl.timer! - speedOf(s)) < 1e-9, '每回合走的格數跟駭客模式一樣')
})

test('快速配置（電腦的組法）在每個人力市場都排得出能開業的公司', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const d = drafted(seed)
    assert.deepEqual(openErrors(d), [], `seed ${seed}`)
    assert.ok(forecast(d.picks, d.placement).net >= COMPANY.minNet)
  }
})
