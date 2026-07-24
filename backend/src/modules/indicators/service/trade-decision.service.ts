import {
  DECISION_DIRECTIONAL_MOVEMENT_MIN,
  DECISION_ENTRY_POOR_EMA20_DISTANCE_MIN,
  DECISION_ENTRY_READY_EMA20_DISTANCE_MAX,
  DECISION_ENTRY_WATCH_EMA20_DISTANCE_MAX,
  DECISION_HARD_BLOCK_RISK_REWARD_MIN,
  DECISION_MAX_ABS_EMA200_DISTANCE_PERCENT,
  DECISION_MAX_ABS_EMA20_EXTENSION_PERCENT,
  DECISION_OLD_TREND_CANDLES_MIN,
  DECISION_TREND_MAX_SIDEWAYS_SCORE,
  DECISION_TREND_MIN_STRENGTH,
  ENTRY_SCORE_READY_MIN,
  ENTRY_SCORE_WATCH_MIN,
  TREND_SCORE_EXCELLENT_MIN,
  TREND_SCORE_GOOD_MIN,
  TRADE_DECISION_WEIGHTS
} from '../constants/indicator.constants.js';
import {
  ExtensionState,
  PullbackQuality,
  RiskRewardBand,
  TradeDecisionAdjustment,
  TradeDecisionVerdict,
  TradeStage,
  VolumeQuality
} from '../interfaces/indicator-result.interface.js';

export interface TradeDecisionInput {
  readonly trendScore: number;
  readonly entryScore: number;
  readonly riskReward: number | null;
  readonly volumeQuality: VolumeQuality;
  readonly tradeStage: TradeStage;
  readonly distanceFromEMA20Percent: number;
  readonly distanceFromEMA200Percent: number;
  readonly trendStrengthScore: number;
  readonly freshCross: boolean;
  readonly trendAge: 'Fresh' | 'Developing' | 'Old';
  readonly candlesSinceEMA200Cross: number;
  readonly isBelowEMA200: boolean;
  readonly isBearishAlignment: boolean;
  readonly ema20SlopePercent: number;
  readonly isSideways: boolean;
  readonly sidewaysScore: number;
}

export interface TradeDecisionResult {
  readonly tradeDecisionScore: number;
  readonly tradeDecisionVerdict: TradeDecisionVerdict;
  readonly riskRewardBand: RiskRewardBand;
  readonly pullbackQuality: PullbackQuality;
  readonly extensionState: ExtensionState;
  readonly tradeDecisionAdjustments: readonly TradeDecisionAdjustment[];
  readonly finalRecommendation: string;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

type EntryQualification = 'READY' | 'WATCH' | 'DEVELOPING' | 'POOR';
type TrendQualification = 'Excellent' | 'Good' | 'Average' | 'Rejected';

export class TradeDecisionService {
  public assess(input: TradeDecisionInput): TradeDecisionResult {
    const riskRewardBand = this.resolveRiskRewardBand(input.riskReward);
    const pullbackQuality = this.resolvePullbackQuality(input.tradeStage, input.distanceFromEMA20Percent);
    const extensionState = this.resolveExtensionState(input.distanceFromEMA20Percent, input.distanceFromEMA200Percent);

    const trendGateFailures = this.resolveTrendGateFailures(input);
    const entryQualification = this.resolveEntryQualification(input, pullbackQuality, extensionState, riskRewardBand);
    const hardBlockers = this.resolveHardBlockers(input, extensionState, riskRewardBand);

    const trendQualification: TrendQualification = trendGateFailures.length > 0
      ? 'Rejected'
      : this.resolveTrendQualification(input.trendScore);

    const blockerReasons = [...trendGateFailures, ...hardBlockers];

    const adjustments: TradeDecisionAdjustment[] = blockerReasons.map((reason) => ({
      label: 'Blocked because',
      points: -12,
      reason
    }));

    const boosters = this.resolveBoosters(input, pullbackQuality);
    for (const booster of boosters) {
      adjustments.push(booster);
    }

    const baseScore =
      input.trendScore * TRADE_DECISION_WEIGHTS.trendScore +
      input.entryScore * TRADE_DECISION_WEIGHTS.entryScore +
      this.riskRewardBandScore(riskRewardBand) * TRADE_DECISION_WEIGHTS.riskReward +
      this.volumeQualityScore(input.volumeQuality) * TRADE_DECISION_WEIGHTS.volumeQuality +
      this.tradeStageScore(input.tradeStage) * TRADE_DECISION_WEIGHTS.tradeStage;

    const boosterImpact = boosters.reduce((total, current) => total + current.points, 0);
    const blockerPenalty = blockerReasons.length > 0 ? 30 : 0;
    const adjustedScore = baseScore + boosterImpact - blockerPenalty;
    const tradeDecisionScore = roundTo(clamp(adjustedScore, 0, 100), 2);

    const tradeDecisionVerdict = blockerReasons.length > 0
      ? 'AVOID'
      : this.resolveMatrixVerdict(trendQualification, entryQualification);

    return {
      tradeDecisionScore,
      tradeDecisionVerdict,
      riskRewardBand,
      pullbackQuality,
      extensionState,
      tradeDecisionAdjustments: adjustments,
      finalRecommendation: this.resolveRecommendation(tradeDecisionVerdict, blockerReasons, entryQualification)
    };
  }

  private resolveRiskRewardBand(riskReward: number | null): RiskRewardBand {
    if (riskReward === null) {
      return 'Unknown';
    }

    if (riskReward > 2.5) {
      return 'Excellent';
    }

    if (riskReward >= 2) {
      return 'Good';
    }

    if (riskReward >= 1.5) {
      return 'Average';
    }

    return 'Poor';
  }

  private resolvePullbackQuality(stage: TradeStage, distanceFromEMA20Percent: number): PullbackQuality {
    const distance = Math.abs(distanceFromEMA20Percent);

    if (stage === 'PULLBACK_ENTRY' && distance <= 0.8) {
      return 'Perfect Pullback';
    }

    if (distance <= 1.5) {
      return 'Acceptable Pullback';
    }

    return 'Extended Move';
  }

  private resolveTrendGateFailures(input: TradeDecisionInput): readonly string[] {
    const failures: string[] = [];

    if (!input.isBelowEMA200) {
      failures.push('Price is above EMA200.');
    }

    if (!input.isBearishAlignment) {
      failures.push('EMA20 is not below EMA200 with bearish alignment.');
    }

    if (input.ema20SlopePercent > 0) {
      failures.push('EMA20 slope is positive.');
    }

    if (input.trendStrengthScore < DECISION_TREND_MIN_STRENGTH) {
      failures.push('Trend strength is below minimum threshold.');
    }

    if (input.isSideways || input.sidewaysScore >= DECISION_TREND_MAX_SIDEWAYS_SCORE || input.tradeStage === 'SIDEWAYS') {
      failures.push('Market is classified as sideways.');
    }

    return failures;
  }

  private resolveEntryQualification(
    input: TradeDecisionInput,
    pullbackQuality: PullbackQuality,
    extensionState: ExtensionState,
    riskRewardBand: RiskRewardBand
  ): EntryQualification {
    const absEma20Distance = Math.abs(input.distanceFromEMA20Percent);
    const absEma200Distance = Math.abs(input.distanceFromEMA200Percent);

    if (
      input.entryScore >= ENTRY_SCORE_READY_MIN &&
      pullbackQuality === 'Perfect Pullback' &&
      extensionState === 'Not Extended' &&
      absEma20Distance <= DECISION_ENTRY_READY_EMA20_DISTANCE_MAX &&
      absEma200Distance <= DECISION_MAX_ABS_EMA200_DISTANCE_PERCENT &&
      (riskRewardBand === 'Excellent' || riskRewardBand === 'Good')
    ) {
      return 'READY';
    }

    if (
      input.entryScore >= ENTRY_SCORE_WATCH_MIN &&
      absEma20Distance <= DECISION_ENTRY_WATCH_EMA20_DISTANCE_MAX &&
      (riskRewardBand === 'Excellent' || riskRewardBand === 'Good' || riskRewardBand === 'Average')
    ) {
      return 'WATCH';
    }

    if (
      input.entryScore >= 50 &&
      extensionState !== 'Extended' &&
      absEma20Distance < DECISION_ENTRY_POOR_EMA20_DISTANCE_MIN
    ) {
      return 'DEVELOPING';
    }

    return 'POOR';
  }

  private resolveHardBlockers(
    input: TradeDecisionInput,
    extensionState: ExtensionState,
    riskRewardBand: RiskRewardBand
  ): readonly string[] {
    const blockers: string[] = [];

    if (input.riskReward === null || input.riskReward < DECISION_HARD_BLOCK_RISK_REWARD_MIN) {
      blockers.push('Risk/reward is below configured minimum.');
    }

    if (Math.abs(input.distanceFromEMA20Percent) > DECISION_MAX_ABS_EMA20_EXTENSION_PERCENT || extensionState === 'Extended') {
      blockers.push('Price is already extended beyond configured threshold.');
    }

    if (input.volumeQuality === 'Poor') {
      blockers.push('Volume is extremely poor.');
    }

    if (input.trendAge === 'Old' || input.candlesSinceEMA200Cross >= DECISION_OLD_TREND_CANDLES_MIN) {
      blockers.push('Trend is too old.');
    }

    if (Math.abs(input.distanceFromEMA200Percent) > DECISION_MAX_ABS_EMA200_DISTANCE_PERCENT) {
      blockers.push('Distance from EMA200 exceeds maximum threshold.');
    }

    if (riskRewardBand === 'Unknown') {
      blockers.push('Risk/reward is unavailable for decision quality.');
    }

    return blockers;
  }

  private resolveBoosters(
    input: TradeDecisionInput,
    pullbackQuality: PullbackQuality
  ): readonly TradeDecisionAdjustment[] {
    const boosters: TradeDecisionAdjustment[] = [];

    if (input.freshCross) {
      boosters.push({ label: 'Positive factor', points: 8, reason: 'Fresh trend is still actionable.' });
    }

    if (pullbackQuality === 'Perfect Pullback') {
      boosters.push({ label: 'Positive factor', points: 12, reason: 'Perfect pullback quality near EMA20.' });
    }

    if (input.volumeQuality === 'Excellent') {
      boosters.push({ label: 'Positive factor', points: 8, reason: 'Excellent volume confirms participation.' });
    }

    if (input.trendStrengthScore >= 8) {
      boosters.push({ label: 'Positive factor', points: 8, reason: 'High trend strength supports continuation.' });
    }

    if (input.trendStrengthScore >= DECISION_DIRECTIONAL_MOVEMENT_MIN) {
      boosters.push({ label: 'Positive factor', points: 5, reason: 'Directional movement remains healthy.' });
    }

    if (Math.abs(input.distanceFromEMA20Percent) <= DECISION_ENTRY_READY_EMA20_DISTANCE_MAX) {
      boosters.push({ label: 'Positive factor', points: 6, reason: 'Price is near EMA20 for controlled entry.' });
    }

    if (input.isBearishAlignment && Math.abs(input.distanceFromEMA200Percent) <= DECISION_MAX_ABS_EMA200_DISTANCE_PERCENT) {
      boosters.push({ label: 'Positive factor', points: 5, reason: 'EMA spacing is healthy and bearish.' });
    }

    return boosters;
  }

  private resolveExtensionState(distanceFromEMA20Percent: number, distanceFromEMA200Percent: number): ExtensionState {
    const ema20Distance = Math.abs(distanceFromEMA20Percent);
    const ema200Distance = Math.abs(distanceFromEMA200Percent);

    if (ema20Distance > 2.4 || ema200Distance > 9) {
      return 'Extended';
    }

    if (ema20Distance > 1.4 || ema200Distance > 6) {
      return 'Slightly Extended';
    }

    return 'Not Extended';
  }

  private resolveTrendQualification(trendScore: number): TrendQualification {
    if (trendScore >= TREND_SCORE_EXCELLENT_MIN) {
      return 'Excellent';
    }

    if (trendScore >= TREND_SCORE_GOOD_MIN) {
      return 'Good';
    }

    return 'Average';
  }

  private riskRewardBandScore(band: RiskRewardBand): number {
    if (band === 'Excellent') {
      return 100;
    }

    if (band === 'Good') {
      return 82;
    }

    if (band === 'Average') {
      return 62;
    }

    if (band === 'Poor') {
      return 30;
    }

    return 40;
  }

  private volumeQualityScore(volumeQuality: VolumeQuality): number {
    if (volumeQuality === 'Excellent') {
      return 100;
    }

    if (volumeQuality === 'Good') {
      return 80;
    }

    if (volumeQuality === 'Average') {
      return 55;
    }

    return 30;
  }

  private tradeStageScore(tradeStage: TradeStage): number {
    if (tradeStage === 'PULLBACK_ENTRY') {
      return 100;
    }

    if (tradeStage === 'EARLY_BREAKDOWN') {
      return 90;
    }

    if (tradeStage === 'TREND_CONTINUATION') {
      return 72;
    }

    if (tradeStage === 'LATE_TREND') {
      return 45;
    }

    return 20;
  }

  private resolveMatrixVerdict(
    trendQualification: TrendQualification,
    entryQualification: EntryQualification
  ): TradeDecisionVerdict {
    if (trendQualification === 'Excellent' && entryQualification === 'READY') {
      return 'A_PLUS_SETUP';
    }

    if (
      (trendQualification === 'Excellent' && entryQualification === 'WATCH') ||
      (trendQualification === 'Good' && entryQualification === 'READY')
    ) {
      return 'STRONG_SETUP';
    }

    if (
      (trendQualification === 'Good' && entryQualification === 'WATCH') ||
      (trendQualification === 'Average' && entryQualification === 'READY')
    ) {
      return 'WATCH';
    }

    if (trendQualification === 'Average' && entryQualification === 'DEVELOPING') {
      return 'WEAK';
    }

    return 'AVOID';
  }

  private resolveRecommendation(
    verdict: TradeDecisionVerdict,
    blockers: readonly string[],
    entryQualification: EntryQualification
  ): string {
    if (blockers.length > 0) {
      return 'Blocked setup. Wait for conditions to improve.';
    }

    if (verdict === 'A_PLUS_SETUP') {
      return 'Ready for entry on candle confirmation.';
    }

    if (verdict === 'STRONG_SETUP') {
      return 'Excellent candidate for today\'s watchlist.';
    }

    if (verdict === 'WATCH') {
      if (entryQualification === 'WATCH') {
        return 'Wait for pullback before entering.';
      }

      return 'Trend is healthy but reward is insufficient.';
    }

    if (verdict === 'WEAK') {
      return 'Momentum is fading. Skip.';
    }

    return 'Momentum is fading. Skip.';
  }
}
