import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as currentData from '../src/game/data.ts'
import * as currentEngine from '../src/game/engine.ts'

const baselineCommit = '8fd6c548697bfebe0a296ddd742494ccc735f18e'
const baselineRoot = mkdtempSync(join(tmpdir(), 'csg-balance-'))
const baselineGame = join(baselineRoot, 'src', 'game')
let baselineData: Data
let baselineEngine: Engine
try {
  mkdirSync(baselineGame, { recursive: true })
  writeFileSync(join(baselineRoot, 'package.json'), '{"type":"module"}', 'utf8')
  for (const file of ['data.ts', 'types.ts', 'engine.ts']) {
    const content = execFileSync('git', ['show', `${baselineCommit}:src/game/${file}`], { encoding: 'utf8' })
    writeFileSync(join(baselineGame, file), content, 'utf8')
  }
  baselineData = await import(pathToFileURL(join(baselineGame, 'data.ts')).href)
  baselineEngine = await import(pathToFileURL(join(baselineGame, 'engine.ts')).href)

type Engine = typeof currentEngine
type Data = typeof currentData
type CategoryTally = {
  cards: number
  sure: number
  maybe: number
  dead: number
  affordable: number
  unaffordableDespiteTarget: number
}
type Tally = {
  games: number
  nonMissionCards: number
  missionCards: number
  sure: number
  maybe: number
  dead: number
  affordableSure: number
  affordableMaybe: number
  affordableNone: number
  missionDead: number
  possibleProgressGames: number
  sureProgressGames: number
  noProgressGames: number
  noSureProgressGames: number
  allNonMissionBlockedGames: number
  employeeEntryPossibleGames: number
  employeeEntrySureGames: number
  reconPossibleGames: number
  reconSureGames: number
  tailPossibleGames: number
  tailSureGames: number
  usbPossibleGames: number
  usbSureGames: number
  avgAp: number
  bothOpeningGuarantees: number
  categoryCards: Record<string, CategoryTally>
  openingHandSizes: Record<string, number>
  missionCardsPerHand: Record<string, number>
}
type MidTally = {
  reached: number
  handCards: number
  fullHands: number
  nonMissionCards: number
  deadCards: number
  noCardPlay: number
  fullHandNoCardPlay: number
  fullHandNoAction: number
  noProgress: number
  noSureProgress: number
  anyNonSupport: number
  allBlocked: number
  fullHandBlocked: number
  employeeEntry: number
  sureEmployeeEntry: number
  recycles: number
  plays: number
  playEffectsOk: number
  playEffectsFailed: number
  tailCapturedInfra: number
  tailParalyzedInfra: number
}

const empty = (): Tally => ({
  games: 0, nonMissionCards: 0, missionCards: 0,
  sure: 0, maybe: 0, dead: 0, affordableSure: 0, affordableMaybe: 0, affordableNone: 0, missionDead: 0,
  possibleProgressGames: 0, sureProgressGames: 0,
  noProgressGames: 0, noSureProgressGames: 0, allNonMissionBlockedGames: 0,
  employeeEntryPossibleGames: 0, employeeEntrySureGames: 0,
  reconPossibleGames: 0, reconSureGames: 0,
  tailPossibleGames: 0, tailSureGames: 0, usbPossibleGames: 0, usbSureGames: 0, avgAp: 0,
  bothOpeningGuarantees: 0,
  categoryCards: Object.fromEntries(['recon', 'action', 'paralyze', 'finish', 'support'].map((cat) => [cat, {
    cards: 0, sure: 0, maybe: 0, dead: 0, affordable: 0, unaffordableDespiteTarget: 0,
  }])),
  openingHandSizes: {},
  missionCardsPerHand: {},
})

function playableOptions(E: Engine, D: Data, s: any, id: any) {
  const def = D.CARDS[id]
  const pb = E.playability(s, id)
  if (def.targeting === 'node') {
    return Object.entries(pb.targets)
      .map(([target, tri]) => ({ target, tri, affordable: s.ap >= E.cardCost(s, id, target) }))
      .filter((o) => o.affordable && o.tri !== 'N')
  }
  return pb.autoTri === 'N' || s.ap < E.cardCost(s, id)
    ? []
    : [{ target: undefined, tri: pb.autoTri, affordable: true }]
}

function merge(totals: Tally, add: Tally) {
  for (const key of Object.keys(totals) as Array<keyof Tally>) {
    if (key === 'categoryCards' || key === 'openingHandSizes' || key === 'missionCardsPerHand') continue
    totals[key] += add[key] as number
  }
  for (const cat of Object.keys(totals.categoryCards)) {
    for (const key of Object.keys(totals.categoryCards[cat]) as Array<keyof CategoryTally>) {
      totals.categoryCards[cat][key] += add.categoryCards[cat][key]
    }
  }
  for (const [size, count] of Object.entries(add.openingHandSizes)) {
    totals.openingHandSizes[size] = (totals.openingHandSizes[size] ?? 0) + count
  }
  for (const [count, hands] of Object.entries(add.missionCardsPerHand)) {
    totals.missionCardsPerHand[count] = (totals.missionCardsPerHand[count] ?? 0) + hands
  }
}

function sample(E: Engine, D: Data, countPerPair: number) {
  const summaries = new Map<string, Tally>()
  const total = empty()
  const focusCards: Record<string, { dealt: number; sure: number; maybe: number; dead: number; affordable: number }> = {
    social: { dealt: 0, sure: 0, maybe: 0, dead: 0, affordable: 0 },
    tail: { dealt: 0, sure: 0, maybe: 0, dead: 0, affordable: 0 },
    usb: { dealt: 0, sure: 0, maybe: 0, dead: 0, affordable: 0 },
  }
  const scenarios = D.SCENARIO_IDS
  const missions = D.MISSION_IDS
  let pairIndex = 0
  for (const scenario of scenarios) {
    for (const mission of missions) {
      const pair = empty()
      for (let i = 0; i < countPerPair; i++) {
        const seed = 20261009 + pairIndex * 1000003 + i * 7919
        const s = E.newGame({ seed, scenario, mission })
        const hand = s.hand
        pair.openingHandSizes[String(hand.length)] = (pair.openingHandSizes[String(hand.length)] ?? 0) + 1
        const missionCount = hand.filter((card: any) => E.isMissionCard(s, card.id)).length
        pair.missionCardsPerHand[String(missionCount)] = (pair.missionCardsPerHand[String(missionCount)] ?? 0) + 1
        pair.nonMissionCards += hand.filter((card: any) => !E.isMissionCard(s, card.id)).length
        pair.missionCards += missionCount
        const progress = { possible: false, sure: false }
        const employeeEntry = { possible: false, sure: false }
        const recon = { possible: false, sure: false }
        const tail = { possible: false, sure: false }
        const usb = { possible: false, sure: false }
        let allNonMissionBlocked = true

        for (const card of hand) {
          const missionCard = E.isMissionCard(s, card.id)
          const def = D.CARDS[card.id]
          const pb = E.playability(s, card.id)
          const options = playableOptions(E, D, s, card.id)
          const sureOption = options.some((o) => o.tri === 'Y')
          const maybeOption = options.some((o) => o.tri === 'M')
          const focus = focusCards[card.id]
          if (focus) {
            focus.dealt++
            if (pb.status === 'sure') focus.sure++
            else if (pb.status === 'maybe') focus.maybe++
            else focus.dead++
            if (options.length) focus.affordable++
          }

          if (missionCard) {
            if (!sureOption && !maybeOption) pair.missionDead++
            continue
          }
          const category = pair.categoryCards[def.cat]
          category.cards++
          if (pb.status === 'sure') category.sure++
          else if (pb.status === 'maybe') category.maybe++
          else category.dead++
          if (options.length) category.affordable++
          else if (pb.status !== 'dead') category.unaffordableDespiteTarget++
          if (pb.status === 'sure') pair.sure++
          else if (pb.status === 'maybe') pair.maybe++
          else pair.dead++
          if (sureOption) pair.affordableSure++
          else if (maybeOption) pair.affordableMaybe++
          else pair.affordableNone++

          if (options.length) allNonMissionBlocked = false
          if (def.cat !== 'support') {
            if (options.length) progress.possible = true
            if (sureOption) progress.sure = true
          }

          const employeeControlCards = ['phish', 'social', 'cred', 'brute', 'mfa', 'exploit']
          if (D.CARDS.tail.effect === '控制目標') employeeControlCards.push('tail')
          if (employeeControlCards.includes(card.id)) {
            const employeeTarget = options.some((o) => {
              const n = s.nodes.find((candidate: any) => candidate.id === o.target)
              return n?.kind === 'employee'
            })
            if (employeeTarget) employeeEntry.possible = true
            if (options.some((o) => {
              const n = s.nodes.find((candidate: any) => candidate.id === o.target)
              return o.tri === 'Y' && n?.kind === 'employee'
            })) employeeEntry.sure = true
          }
          if (card.id === 'tail') {
            if (options.length) tail.possible = true
            if (sureOption) tail.sure = true
          }
          if (card.id === 'usb') {
            if (options.length) usb.possible = true
            if (sureOption) usb.sure = true
          }
          if (['scan', 'osint', 'smooth', 'ally'].includes(card.id)) {
            if (options.length) recon.possible = true
            if (sureOption) recon.sure = true
          }
        }

        pair.games++
        pair.avgAp += s.ap
        if (progress.possible) pair.possibleProgressGames++
        if (progress.sure) pair.sureProgressGames++
        if (!progress.possible) pair.noProgressGames++
        if (!progress.sure) pair.noSureProgressGames++
        if (allNonMissionBlocked) pair.allNonMissionBlockedGames++
        if (employeeEntry.possible) pair.employeeEntryPossibleGames++
        if (employeeEntry.sure) pair.employeeEntrySureGames++
        if (recon.possible) pair.reconPossibleGames++
        if (recon.sure) pair.reconSureGames++
        if (tail.possible) pair.tailPossibleGames++
        if (tail.sure) pair.tailSureGames++
        if (usb.possible) pair.usbPossibleGames++
        if (usb.sure) pair.usbSureGames++
        if (recon.sure && employeeEntry.possible) pair.bothOpeningGuarantees++
      }
      pairIndex++
      summaries.set(`${scenario}/${mission}`, pair)
      merge(total, pair)
    }
  }
  return { total, summaries, focusCards }
}

function midEmpty(): MidTally {
  return { reached: 0, handCards: 0, fullHands: 0, nonMissionCards: 0, deadCards: 0, noCardPlay: 0, fullHandNoCardPlay: 0, fullHandNoAction: 0, noProgress: 0, noSureProgress: 0, anyNonSupport: 0, allBlocked: 0, fullHandBlocked: 0, employeeEntry: 0, sureEmployeeEntry: 0, recycles: 0, plays: 0, playEffectsOk: 0, playEffectsFailed: 0, tailCapturedInfra: 0, tailParalyzedInfra: 0 }
}

function observeHand(E: Engine, D: Data, s: any, m: MidTally, cumulative: { recycles: number; plays: number; ok: number; failed: number; tailCaptured: number; tailParalyzed: number }) {
  const hand = s.hand
  let nonMission = 0
  let dead = 0
  let progress = false
  let sureProgress = false
  let anyCardPlay = false
  let anyEntry = false
  let sureEntry = false
  let allBlocked = true
  for (const card of hand) {
    const def = D.CARDS[card.id]
    const options = playableOptions(E, D, s, card.id)
    if (options.length) anyCardPlay = true
    if (E.isMissionCard(s, card.id)) continue
    nonMission++
    if (!options.length) dead++
    if (options.length) allBlocked = false
    if (def.cat !== 'support') {
      if (options.length) progress = true
      if (options.some((o) => o.tri === 'Y')) sureProgress = true
    }
    const employeeControl = ['phish', 'social', 'cred', 'brute', 'mfa', 'exploit']
    if (D.CARDS.tail.effect === '控制目標') employeeControl.push('tail')
    if (employeeControl.includes(card.id)) {
      const employeeTargets = options.filter((o) => s.nodes.find((n: any) => n.id === o.target)?.kind === 'employee')
      if (employeeTargets.length) anyEntry = true
      if (employeeTargets.some((o) => o.tri === 'Y')) sureEntry = true
    }
  }
  m.reached++
  m.handCards += hand.length
  if (hand.length >= E.HAND_MAX) m.fullHands++
  m.nonMissionCards += nonMission
  m.deadCards += dead
  if (!anyCardPlay) m.noCardPlay++
  if (hand.length >= E.HAND_MAX && !anyCardPlay) m.fullHandNoCardPlay++
  if (hand.length >= E.HAND_MAX && !anyCardPlay && !E.canRecycle(s)) m.fullHandNoAction++
  if (!progress) m.noProgress++
  if (!sureProgress) m.noSureProgress++
  if (progress) m.anyNonSupport++
  if (allBlocked) m.allBlocked++
  if (allBlocked && hand.length >= E.HAND_MAX) m.fullHandBlocked++
  if (anyEntry) m.employeeEntry++
  if (sureEntry) m.sureEmployeeEntry++
  m.recycles += cumulative.recycles
  m.plays += cumulative.plays
  m.playEffectsOk += cumulative.ok
  m.playEffectsFailed += cumulative.failed
  m.tailCapturedInfra += cumulative.tailCaptured
  m.tailParalyzedInfra += cumulative.tailParalyzed
}

/** 只用 playability 的公開 sure 預測、公開節點控制狀態與行動點選牌。 */
function visibleChoice(E: Engine, D: Data, s: any) {
  let best: { uid: number; id: string; target?: string; score: number } | null = null
  for (const card of s.hand) {
    const id = card.id
    const def = D.CARDS[id]
    const options = playableOptions(E, D, s, id).filter((o) => o.tri === 'Y')
    for (const o of options) {
      const target = o.target ? s.nodes.find((n: any) => n.id === o.target) : null
      let score = 0
      if (E.isMissionCard(s, id)) score = 1000
      else if (['phish', 'social', 'cred', 'brute', 'mfa', 'exploit'].includes(id)) {
        if (target?.kind === 'employee' && !target.controlled) score = 100 - def.noise
        else if (target && !target.controlled) score = 70 - def.noise
      } else if (id === 'tail' && D.CARDS.tail.effect === '控制目標') {
        if (target?.kind === 'employee' && !target.controlled) score = 85 - def.noise
      } else if (id === 'tail' || id === 'usb') {
        const infra = s.nodes.find((n: any) => n.id === 'infra')
        if (!infra.controlled) score = 85 - def.noise
      } else if (id === 'inject' || id === 'skill') {
        if (!s.nodes.find((n: any) => n.id === 'ai')?.controlled) score = 75 - def.noise
      } else if (id === 'lateral') score = 55 - def.noise
      else if (id === 'virus') {
        const infra = s.nodes.find((n: any) => n.id === 'infra')
        if (infra.controlled && !infra.virus && infra.paralyzed === 0) score = 65 - def.noise
      } else if (def.cat === 'recon') score = 45 - def.noise
      else if (id === 'wipe' && s.mission === 'ransom') score = 40 - def.noise
      else if (id === 'alarm' && s.mission === 'sabotage') score = 40 - def.noise
      else if (def.cat === 'support') score = 15 - def.noise
      if (score > (best?.score ?? 0)) best = { uid: card.uid, id, target: o.target, score }
    }
  }
  return best
}

function midgame(E: Engine, D: Data, countPerPair: number, sampleTurns: number[]) {
  const checkpoints = sampleTurns.flatMap((turn) => [`${turn}-start`, `${turn}-end`])
  const stats = new Map<string, MidTally>(checkpoints.map((key) => [key, midEmpty()]))
  for (const scenario of D.SCENARIO_IDS) {
    for (const mission of D.MISSION_IDS) {
      for (let i = 0; i < countPerPair; i++) {
        const seed = 20261009 + (D.SCENARIO_IDS.indexOf(scenario) * D.MISSION_IDS.length + D.MISSION_IDS.indexOf(mission)) * 1000003 + i * 7919
        const s = E.newGame({ seed, scenario, mission })
        const cumulative = { recycles: 0, plays: 0, ok: 0, failed: 0, tailCaptured: 0, tailParalyzed: 0 }
        let guard = 0
        while (s.phase !== 'over' && s.turn <= Math.max(...sampleTurns) && guard++ < 240) {
          if (sampleTurns.includes(s.turn) && s.phase === 'hacker') observeHand(E, D, s, stats.get(`${s.turn}-start`)!, cumulative)
          let acts = 0
          while (s.phase === 'hacker' && acts++ < 24) {
            const choice = visibleChoice(E, D, s)
            if (choice) {
              const result = E.playCard(s, choice.uid, choice.target)
              cumulative.plays++
              if (result.effect.ok) cumulative.ok++
              else cumulative.failed++
              if (choice.id === 'tail') {
                if (result.effect.captured.includes('infra')) cumulative.tailCaptured++
                if (result.effect.paralyzed === 'infra') cumulative.tailParalyzed++
              }
              continue
            }
            const deadCards = s.hand.filter((card: any) => !E.isMissionCard(s, card.id) && E.playability(s, card.id).status === 'dead')
            const fallback = deadCards.length >= 2
              ? deadCards[0]
              : s.hand.length >= E.HAND_MAX
                ? deadCards[0] ?? s.hand.find((card: any) => !E.isMissionCard(s, card.id))
                : s.turn === 1 && !s.actedThisTurn
                  ? s.hand.find((card: any) => !E.isMissionCard(s, card.id))
                  : undefined
            if (fallback && s.ap >= 1 && E.recycleCard(s, fallback.uid)) {
              cumulative.recycles++
              continue
            }
            break
          }
          if (s.phase === 'over') break
          if (sampleTurns.includes(s.turn) && s.phase === 'hacker') observeHand(E, D, s, stats.get(`${s.turn}-end`)!, cumulative)
          for (const _ of E.endOfTurn(s)) { /* finish this public-information policy turn */ }
          if (s.phase !== 'over') E.startHackerTurn(s)
        }
      }
    }
  }
  return stats
}

const countPerPair = Number(process.argv[2] ?? 50)
const current = sample(currentEngine, currentData, countPerPair)
const baseline = sample(baselineEngine as Engine, baselineData as Data, countPerPair)
const sampleTurns = [1, 2, 3, 4, 5]
const currentMid = midgame(currentEngine, currentData, countPerPair, sampleTurns)
const baselineMid = midgame(baselineEngine as Engine, baselineData as Data, countPerPair, sampleTurns)
const pct = (n: number, d: number) => d ? `${(100 * n / d).toFixed(1)}%` : 'n/a'
const report = (name: string, E: Engine, tally: Tally) => ({
  build: name,
  games: tally.games,
  expectedOpeningHandCards: E.OPENING_HAND,
  openingHandSizeDistribution: tally.openingHandSizes,
  missionCardsPerHandDistribution: tally.missionCardsPerHand,
  openingHandCards: tally.nonMissionCards + tally.missionCards,
  nonMissionCards: tally.nonMissionCards,
  statusPerNonMissionCard: {
    sure: pct(tally.sure, tally.nonMissionCards),
    maybe: pct(tally.maybe, tally.nonMissionCards),
    dead: pct(tally.dead, tally.nonMissionCards),
  },
  affordableStatusPerNonMissionCard: {
    sure: pct(tally.affordableSure, tally.nonMissionCards),
    maybe: pct(tally.affordableMaybe, tally.nonMissionCards),
    deadOrUnaffordable: pct(tally.affordableNone, tally.nonMissionCards),
  },
  missionCardDeadAtOpening: tally.missionCards ? pct(tally.missionDead, tally.missionCards) : '無任務終結牌',
  handsWithAffordableNonSupportProgress: pct(tally.possibleProgressGames, tally.games),
  handsWithSureNonSupportProgress: pct(tally.sureProgressGames, tally.games),
  handsWithoutAnyNonSupportProgress: pct(tally.noProgressGames, tally.games),
  handsWithoutSureNonSupportProgress: pct(tally.noSureProgressGames, tally.games),
  handsWhereAllNonMissionCardsAreBlocked: pct(tally.allNonMissionBlockedGames, tally.games),
  handsWithAffordableEmployeeControlCard: pct(tally.employeeEntryPossibleGames, tally.games),
  handsWithSureEmployeeControlCard: pct(tally.employeeEntrySureGames, tally.games),
  handsWithBothOpeningGuarantees: pct(tally.bothOpeningGuarantees, tally.games),
  handsWithAffordableReconCard: pct(tally.reconPossibleGames, tally.games),
  handsWithSureAffordableReconCard: pct(tally.reconSureGames, tally.games),
  handsWithPlayableTail: pct(tally.tailPossibleGames, tally.games),
  handsWithSureTail: pct(tally.tailSureGames, tally.games),
  handsWithPlayableUsb: pct(tally.usbPossibleGames, tally.games),
  handsWithSureUsb: pct(tally.usbSureGames, tally.games),
  openingCardCategoryBreakdown: Object.fromEntries(Object.entries(tally.categoryCards).map(([category, values]) => [category, {
    cards: values.cards,
    statusCounts: { sure: values.sure, maybe: values.maybe, dead: values.dead },
    affordableCount: values.affordable,
    predictedTargetButUnaffordableCount: values.unaffordableDespiteTarget,
    perCardStatus: {
      sure: pct(values.sure, values.cards),
      maybe: pct(values.maybe, values.cards),
      deadNoLegalTargetOrPrerequisite: pct(values.dead, values.cards),
    },
    affordableAnyTarget: pct(values.affordable, values.cards),
    hasPredictedTargetButUnaffordable: pct(values.unaffordableDespiteTarget, values.cards),
  }])),
  avgStartingAp: (tally.avgAp / tally.games).toFixed(2),
})

console.log(JSON.stringify({
  baselineCommit,
  samplesPerScenarioMission: countPerPair,
  note: '起手數依各版本 OPENING_HAND 讀取（任務牌計入手牌）；sure/maybe/dead 是 playability 公開預測；政策只按 sure、公開控制狀態與 AP 選牌，不讀隱藏弱點決定選擇；「可打」不代表隨機效果必然成功。deadNoLegalTargetOrPrerequisite 為引擎標記 dead 的比例；未把它解讀成單一失敗原因。任務終結牌另列。',
  baseline: report('8fd6c54', baselineEngine as Engine, baseline.total),
  current: report('working-tree', currentEngine, current.total),
  focusCards: { baseline: baseline.focusCards, current: current.focusCards },
  midgame: Object.fromEntries(sampleTurns.flatMap((turn) => [`${turn}-start`, `${turn}-end`].map((checkpoint) => {
    const summarize = (m: MidTally) => ({
      reached: m.reached,
      handSize: (m.handCards / m.reached).toFixed(2),
      deadCardsPerNonMission: pct(m.deadCards, m.nonMissionCards),
      meanDeadCardsPerHand: (m.deadCards / m.reached).toFixed(2),
      noCardPlayable: pct(m.noCardPlay, m.reached),
      handsWithoutAffordableNonSupportProgress: pct(m.noProgress, m.reached),
      handsWithoutSureNonSupportProgress: pct(m.noSureProgress, m.reached),
      allNonMissionCardsBlocked: pct(m.allBlocked, m.reached),
      fullHandRate: pct(m.fullHands, m.reached),
      fullHandNoCardPlayable: pct(m.fullHandNoCardPlay, m.fullHands),
      fullHandNoCardPlayableOverall: pct(m.fullHandNoCardPlay, m.reached),
      fullHandNoActionIncludingRecycle: pct(m.fullHandNoAction, m.fullHands),
      fullHandNoActionOverall: pct(m.fullHandNoAction, m.reached),
      fullHandAllNonMissionBlocked: pct(m.fullHandBlocked, m.fullHands),
      employeeEntryAvailable: pct(m.employeeEntry, m.reached),
      sureEmployeeEntryAvailable: pct(m.sureEmployeeEntry, m.reached),
      meanRecyclesSoFar: (m.recycles / m.reached).toFixed(2),
      meanPlaysSoFar: (m.plays / m.reached).toFixed(2),
      effectOkRate: pct(m.playEffectsOk, m.plays),
      tailInfraCaptureOutcomesSoFar: m.tailCapturedInfra,
      tailInfraParalysisOutcomesSoFar: m.tailParalyzedInfra,
    })
    return [checkpoint, { baseline: summarize(baselineMid.get(checkpoint)!), current: summarize(currentMid.get(checkpoint)!) }]
  }))),
  byMission: Object.fromEntries(baselineData.MISSION_IDS.map((mission: string) => [mission, {
    baseline: report('8fd6c54', baselineEngine as Engine, [...baseline.summaries.entries()].filter(([key]) => key.endsWith(`/${mission}`)).reduce((acc, [, v]) => { merge(acc, v); return acc }, empty())),
    current: report('working-tree', currentEngine, [...current.summaries.entries()].filter(([key]) => key.endsWith(`/${mission}`)).reduce((acc, [, v]) => { merge(acc, v); return acc }, empty())),
  }])),
}, null, 2))
} finally {
  const resolvedRoot = realpathSync(baselineRoot)
  const resolvedTemp = realpathSync(tmpdir())
  if (dirname(resolvedRoot) !== resolvedTemp || !basename(resolvedRoot).startsWith('csg-balance-')) {
    throw new Error(`拒絕清理非本腳本暫存路徑：${resolvedRoot}`)
  }
  rmSync(resolvedRoot, { recursive: true, force: true })
}
