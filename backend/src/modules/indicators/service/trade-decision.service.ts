import {
  TRADE_DECISION_A_PLUS_MIN,
  TRADE_DECISION_STRONG_MIN,
  TRADE_DECISION_WATCH_MIN,
  TRADE_DECISION_WEAK_MIN,
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

export class TradeDecisionService {
  public assess(input: TradeDecisionInput): TradeDecisionResult {
    const riskRewardBand = this.resolveRiskRewardBand(input.riskReward);
    const pullbackQuality = this.resolvePullbackQuality(input.tradeStage, input.distanceFromEMA20Percent);
    const extensionState = this.resolveExtensionState(input.distanceFromEMA20Percent, input.distanceFromEMA200Percent);

    const baseScore =
      input.trendScore * TRADE_DECISION_WEIGHTS.trendScore +
      input.entryScore * TRADE_DECISION_WEIGHTS.entryScore +
      this.riskRewardBandScore(riskRewardBand) * TRADE_DECISION_WEIGHTS.riskReward +
      this.volumeQualityScore(input.volumeQuality) * TRADE_DECISION_WEIGHTS.volumeQuality +
      this.tradeStageScore(input.tradeStage) * TRADE_DECISION_WEIGHTS.tradeStage;

    const adjustments: TradeDecisionAdjustment[] = [];

    this.pushExtensionAdjustment(adjustments, extensionState);
    this.pushRiskRewardAdjustment(adjustments, riskRewardBand);
    this.pushPullbackAdjustment(adjustments, pullbackQuality);
    this.pushVolumeAdjustment(adjustments, input.volumeQuality);
    this.pushMomentumAdjustment(adjustments, input.trendStrengthScore);
    this.pushTrendFreshnessAdjustment(adjustments, input.freshCross);

    const adjustedScore = baseScore + adjustments.reduce((total, current) => total + current.points, 0);
    const tradeDecisionScore = roundTo(clamp(adjustedScore, 0, 100), 2);
    const tradeDecisionVerdict = this.resolveVerdict(tradeDecisionScore);

    return {
      tradeDecisionScore,
      tradeDecisionVerdict,
      riskRewardBand,
      pullbackQuality,
      extensionState,
      tradeDecisionAdjustments: adjustments,
      finalRecommendation: this.resolveRecommendation(tradeDecisionVerdict, input, riskRewardBand, pullbackQuality, extensionState)
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

  private pushExtensionAdjustment(adjustments: TradeDecisionAdjustment[], extensionState: ExtensionState): void {
    if (extensionState === 'Extended') {
      adjustments.push({
        label: 'Extension',
        points: -8,
        reason: 'Price already extended from EMA20/EMA200.'
      });
      return;
    }

    if (extensionState === 'Slightly Extended') {
      adjustments.push({
        label: 'Extension',
        points: -4,
        reason: 'Price is a bit stretched after the breakdown move.'
      });
      return;
    }

    adjustments.push({
      label: 'Extension',
      points: 4,
      reason: 'Price is not extended and still near workable entry zones.'
    });
  }

  private pushRiskRewardAdjustment(adjustments: TradeDecisionAdjustment[], riskRewardBand: RiskRewardBand): void {
    if (riskRewardBand === 'Excellent') {
      adjustments.push({ label: 'Risk Reward', points: 10, reason: 'Excellent reward-to-risk profile.' });
      return;
    }

    if (riskRewardBand === 'Good') {
      adjustments.push({ label: 'Risk Reward', points: 6, reason: 'Reward is worth the defined risk.' });
      return;
    }

    if (riskRewardBand === 'Average') {
      adjustments.push({ label: 'Risk Reward', points: 1, reason: 'Risk/reward is usable but not ideal.' });
      return;
    }

    if (riskRewardBand === 'Poor') {
      adjustments.push({ label: 'Risk Reward', points: -6, reason: 'Poor risk/reward reduces execution quality.' });
      return;
    }

    adjustments.push({ label: 'Risk Reward', points: -4, reason: 'Risk/reward unavailable from current levels.' });
  }

  private pushPullbackAdjustment(adjustments: TradeDecisionAdjustment[], pullbackQuality: PullbackQuality): void {
    if (pullbackQuality === 'Perfect Pullback') {
      adjustments.push({ label: 'Pullback Quality', points: 12, reason: 'Price is in an ideal pullback-entry location.' });
      return;
    }

    if (pullbackQuality === 'Acceptable Pullback') {
      adjustments.push({ label: 'Pullback Quality', points: 6, reason: 'Pullback is acceptable near EMA20.' });
      return;
    }

    adjustments.push({ label: 'Pullback Quality', points: -8, reason: 'Move is already away from ideal pullback zone.' });
  }

  private pushVolumeAdjustment(adjustments: TradeDecisionAdjustment[], volumeQuality: VolumeQuality): void {
    if (volumeQuality === 'Excellent') {
      adjustments.push({ label: 'Volume', points: 6, reason: 'Strong participation confirms move quality.' });
      return;
    }

    if (volumeQuality === 'Good') {
      adjustments.push({ label: 'Volume', points: 3, reason: 'Volume supports continuation.' });
      return;
    }

    if (volumeQuality === 'Average') {
      adjustments.push({ label: 'Volume', points: -2, reason: 'Volume support is only average.' });
      return;
    }

    adjustments.push({ label: 'Volume', points: -4, reason: 'Weak volume reduces confidence in continuation.' });
  }

  private pushMomentumAdjustment(adjustments: TradeDecisionAdjustment[], trendStrengthScore: number): void {
    if (trendStrengthScore >= 8) {
      adjustments.push({ label: 'Momentum', points: 6, reason: 'Momentum is strong and aligned with trend.' });
      return;
    }

    if (trendStrengthScore >= 6) {
      adjustments.push({ label: 'Momentum', points: 3, reason: 'Momentum remains constructive.' });
      return;
    }

    if (trendStrengthScore >= 4) {
      adjustments.push({ label: 'Momentum', points: -2, reason: 'Momentum is moderate and needs confirmation.' });
      return;
    }

    adjustments.push({ label: 'Momentum', points: -6, reason: 'Momentum is fading.' });
  }

  private pushTrendFreshnessAdjustment(adjustments: TradeDecisionAdjustment[], freshCross: boolean): void {
    if (freshCross) {
      adjustments.push({ label: 'Trend Freshness', points: 4, reason: 'Breakdown is fresh and actionable.' });
      return;
    }

    adjustments.push({ label: 'Trend Freshness', points: -2, reason: 'Trend is older, so edge is lower.' });
  }

  private resolveVerdict(score: number): TradeDecisionVerdict {
    if (score >= TRADE_DECISION_A_PLUS_MIN) {
      return 'A_PLUS_SETUP';
    }

    if (score >= TRADE_DECISION_STRONG_MIN) {
      return 'STRONG_SETUP';
    }

    if (score >= TRADE_DECISION_WATCH_MIN) {
      return 'WATCH';
    }

    if (score >= TRADE_DECISION_WEAK_MIN) {
      return 'WEAK';
    }

    return 'AVOID';
  }

  private resolveRecommendation(
    verdict: TradeDecisionVerdict,
    input: TradeDecisionInput,
    riskRewardBand: RiskRewardBand,
    pullbackQuality: PullbackQuality,
    extensionState: ExtensionState
  ): string {
    if (verdict === 'A_PLUS_SETUP') {
      return 'Ready for entry on candle confirmation.';
    }

    if (verdict === 'STRONG_SETUP') {
      if (pullbackQuality === 'Extended Move' || extensionState !== 'Not Extended') {
        return 'Wait for pullback before entering.';
      }

      return 'Excellent candidate for today\'s watchlist.';
    }

    if (verdict === 'WATCH') {
      if (riskRewardBand === 'Poor' || riskRewardBand === 'Unknown') {
        return 'Trend is healthy but reward is insufficient.';
      }

      return 'Wait for pullback before entering.';
    }

    if (verdict === 'WEAK') {
      if (input.trendStrengthScore < 5) {
        return 'Momentum is fading. Skip.';
      }

      return 'Trend is healthy but reward is insufficient.';
    }

    return 'Momentum is fading. Skip.';
  }
}
