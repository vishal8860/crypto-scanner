import {
  ELIGIBILITY_MAX_DISTANCE_BELOW_EMA200_PERCENT,
  ELIGIBILITY_MAX_SIDEWAYS_SCORE,
  ELIGIBILITY_MIN_TREND_STRENGTH,
  HIGH_PRIORITY_MAX_CANDLES_SINCE_CROSS,
  HIGH_PRIORITY_MIN_TREND_STRENGTH
} from '../constants/indicator.constants.js';
import {
  TradePriority,
  TrendAge,
  TrendClassification,
  VolumeQuality
} from '../interfaces/indicator-result.interface.js';

export interface TradeEligibilityInput {
  readonly isBelowEMA200: boolean;
  readonly trendClassification: TrendClassification;
  readonly trendStrengthScore: number;
  readonly volumeQuality: VolumeQuality;
  readonly sidewaysScore: number;
  readonly trendAge: TrendAge;
  readonly distanceFromEMA200Percent: number;
  readonly candlesSinceEMA200Cross: number;
}

export interface TradeEligibilityResult {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
  readonly priority: TradePriority;
}

export class TradeEligibilityService {
  public evaluate(input: TradeEligibilityInput): TradeEligibilityResult {
    const reasons: string[] = [];

    if (!input.isBelowEMA200) {
      reasons.push('Above EMA200');
    }

    if (input.trendClassification !== 'Bearish' && input.trendClassification !== 'Strong Bearish') {
      reasons.push('Trend not bearish');
    }

    if (input.trendStrengthScore < ELIGIBILITY_MIN_TREND_STRENGTH) {
      reasons.push('Weak trend');
    }

    if (input.volumeQuality === 'Poor') {
      reasons.push('Insufficient volume');
    }

    if (input.sidewaysScore > ELIGIBILITY_MAX_SIDEWAYS_SCORE) {
      reasons.push('Sideways market');
    }

    if (input.trendAge === 'Old') {
      reasons.push('Trend too old');
    }

    if (input.distanceFromEMA200Percent < ELIGIBILITY_MAX_DISTANCE_BELOW_EMA200_PERCENT) {
      reasons.push('Move already extended');
    }

    const eligible = reasons.length === 0;

    return {
      eligible,
      reasons,
      priority: eligible ? this.resolvePriority(input) : 'Low'
    };
  }

  private resolvePriority(input: TradeEligibilityInput): TradePriority {
    const freshCross = input.candlesSinceEMA200Cross <= HIGH_PRIORITY_MAX_CANDLES_SINCE_CROSS;
    const strongBearish = input.trendClassification === 'Strong Bearish';
    const goodVolume = input.volumeQuality === 'Good' || input.volumeQuality === 'Excellent';
    const strongTrend = input.trendStrengthScore >= HIGH_PRIORITY_MIN_TREND_STRENGTH;

    if (freshCross && strongBearish && goodVolume && strongTrend) {
      return 'High';
    }

    if (freshCross) {
      return 'High';
    }

    const mediumChecks = [
      input.trendClassification === 'Bearish' || input.trendClassification === 'Strong Bearish',
      input.trendStrengthScore >= ELIGIBILITY_MIN_TREND_STRENGTH,
      input.volumeQuality === 'Average' || goodVolume,
      input.sidewaysScore <= ELIGIBILITY_MAX_SIDEWAYS_SCORE,
      input.trendAge !== 'Old'
    ].filter(Boolean).length;

    if (mediumChecks >= 4) {
      return 'Medium';
    }

    return 'Low';
  }
}
