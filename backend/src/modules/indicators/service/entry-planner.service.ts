import {
  ENTRY_CONTINUATION_MAX_EMA20_DISTANCE_PERCENT,
  ENTRY_EARLY_BREAKDOWN_EXTENDED_DISTANCE_PERCENT,
  ENTRY_PULLBACK_NEAR_EMA9_DISTANCE_PERCENT,
  ENTRY_QUALITY_MAX,
  ENTRY_QUALITY_MIN,
  ENTRY_QUALITY_RR_HIGH,
  ENTRY_QUALITY_RR_LOW,
  ENTRY_QUALITY_RR_MEDIUM,
  ENTRY_STOP_BUFFER_PERCENT,
  ENTRY_SUPPORT_LOOKBACK,
  ENTRY_SWING_LOOKBACK,
  ELIGIBILITY_MAX_SIDEWAYS_SCORE
} from '../constants/indicator.constants.js';
import { TradeStage, VolumeQuality } from '../interfaces/indicator-result.interface.js';

export interface EntryPlannerInput {
  readonly eligible: boolean;
  readonly tradeStage: TradeStage;
  readonly price: number;
  readonly ema9: number;
  readonly ema20: number;
  readonly ema200: number;
  readonly distanceFromEMA20Percent: number;
  readonly trendStrengthScore: number;
  readonly volumeQuality: VolumeQuality;
  readonly sidewaysScore: number;
  readonly highs: readonly number[];
  readonly lows: readonly number[];
}

export interface EntryPlannerResult {
  readonly suggestedEntry: number | null;
  readonly suggestedStopLoss: number | null;
  readonly suggestedTakeProfit: number | null;
  readonly riskReward: number | null;
  readonly entryQuality: number;
  readonly planningReason: string;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const distancePercent = (value: number, base: number): number => {
  if (base === 0) {
    return 0;
  }

  return ((value - base) / base) * 100;
};

export class EntryPlannerService {
  public plan(input: EntryPlannerInput): EntryPlannerResult {
    if (!input.eligible) {
      return {
        suggestedEntry: null,
        suggestedStopLoss: null,
        suggestedTakeProfit: null,
        riskReward: null,
        entryQuality: 0,
        planningReason: 'Market is not eligible; no trade plan is generated.'
      };
    }

    const suggestedEntry = this.resolveEntry(input);

    if (suggestedEntry === null) {
      return {
        suggestedEntry: null,
        suggestedStopLoss: null,
        suggestedTakeProfit: null,
        riskReward: null,
        entryQuality: 0,
        planningReason: 'No entry: trend continuation is too far from EMA20 for a safe risk profile.'
      };
    }

    const suggestedStopLoss = this.resolveStopLoss(input, suggestedEntry);
    const riskPerUnit = suggestedStopLoss - suggestedEntry;

    if (riskPerUnit <= 0) {
      return {
        suggestedEntry: roundTo(suggestedEntry, 8),
        suggestedStopLoss: null,
        suggestedTakeProfit: null,
        riskReward: null,
        entryQuality: 0,
        planningReason: 'Unable to place a protective stop above entry; plan skipped.'
      };
    }

    const target = this.resolveTakeProfit(input, suggestedEntry, riskPerUnit);
    const rewardPerUnit = suggestedEntry - target;
    const riskReward = rewardPerUnit > 0 ? rewardPerUnit / riskPerUnit : null;

    const entryQuality = this.resolveEntryQuality({
      riskReward,
      tradeStage: input.tradeStage,
      trendStrengthScore: input.trendStrengthScore,
      volumeQuality: input.volumeQuality,
      sidewaysScore: input.sidewaysScore
    });

    return {
      suggestedEntry: roundTo(suggestedEntry, 8),
      suggestedStopLoss: roundTo(suggestedStopLoss, 8),
      suggestedTakeProfit: roundTo(target, 8),
      riskReward: riskReward === null ? null : roundTo(riskReward, 2),
      entryQuality,
      planningReason: this.resolvePlanningReason(input, riskReward)
    };
  }

  private resolveEntry(input: EntryPlannerInput): number | null {
    if (input.tradeStage === 'EARLY_BREAKDOWN') {
      const extended = Math.abs(input.distanceFromEMA20Percent) >= ENTRY_EARLY_BREAKDOWN_EXTENDED_DISTANCE_PERCENT;
      return extended ? input.ema9 : input.price;
    }

    if (input.tradeStage === 'PULLBACK_ENTRY') {
      const nearEMA9 = Math.abs(distancePercent(input.price, input.ema9)) <= ENTRY_PULLBACK_NEAR_EMA9_DISTANCE_PERCENT;
      return nearEMA9 ? input.ema9 : input.ema20;
    }

    if (input.tradeStage === 'TREND_CONTINUATION') {
      if (Math.abs(input.distanceFromEMA20Percent) < ENTRY_CONTINUATION_MAX_EMA20_DISTANCE_PERCENT) {
        return input.price;
      }

      return null;
    }

    if (input.tradeStage === 'LATE_TREND') {
      return input.ema20;
    }

    return null;
  }

  private resolveStopLoss(input: EntryPlannerInput, entry: number): number {
    const recentSwingHigh = this.recentSwingHigh(input.highs);
    const bufferedSwing = recentSwingHigh * (1 + ENTRY_STOP_BUFFER_PERCENT / 100);
    const bufferedEMA200 = input.ema200 * (1 + ENTRY_STOP_BUFFER_PERCENT / 100);

    const swingRisk = bufferedSwing > entry ? bufferedSwing - entry : Number.POSITIVE_INFINITY;
    const emaRisk = bufferedEMA200 > entry ? bufferedEMA200 - entry : Number.POSITIVE_INFINITY;

    if (swingRisk === Number.POSITIVE_INFINITY && emaRisk === Number.POSITIVE_INFINITY) {
      return entry * (1 + ENTRY_STOP_BUFFER_PERCENT / 100);
    }

    return swingRisk <= emaRisk ? bufferedSwing : bufferedEMA200;
  }

  private resolveTakeProfit(input: EntryPlannerInput, entry: number, riskPerUnit: number): number {
    const support = this.nearestSupport(input.lows, entry);

    if (support !== null && support < entry) {
      return support;
    }

    return entry - riskPerUnit * 2;
  }

  private resolveEntryQuality(input: {
    readonly riskReward: number | null;
    readonly tradeStage: TradeStage;
    readonly trendStrengthScore: number;
    readonly volumeQuality: VolumeQuality;
    readonly sidewaysScore: number;
  }): number {
    let score = 0;

    if (input.riskReward !== null) {
      if (input.riskReward > ENTRY_QUALITY_RR_HIGH) {
        score += 30;
      } else if (input.riskReward >= ENTRY_QUALITY_RR_MEDIUM) {
        score += 20;
      } else if (input.riskReward >= ENTRY_QUALITY_RR_LOW) {
        score += 10;
      }
    }

    if (input.tradeStage === 'PULLBACK_ENTRY') {
      score += 20;
    }

    if (input.tradeStage === 'EARLY_BREAKDOWN') {
      score += 20;
    }

    score += clamp((input.trendStrengthScore / 10) * 20, 0, 20);

    if (input.volumeQuality === 'Excellent') {
      score += 10;
    } else if (input.volumeQuality === 'Good') {
      score += 6;
    } else if (input.volumeQuality === 'Average') {
      score += 2;
    }

    if (input.sidewaysScore > ELIGIBILITY_MAX_SIDEWAYS_SCORE) {
      score -= 30;
    }

    return roundTo(clamp(score, ENTRY_QUALITY_MIN, ENTRY_QUALITY_MAX), 0);
  }

  private resolvePlanningReason(input: EntryPlannerInput, riskReward: number | null): string {
    const stageLabel =
      input.tradeStage === 'EARLY_BREAKDOWN'
        ? 'Fresh EMA200 breakdown.'
        : input.tradeStage === 'PULLBACK_ENTRY'
          ? 'Healthy pullback into moving averages.'
          : input.tradeStage === 'TREND_CONTINUATION'
            ? 'Trend continuation setup remains active.'
            : input.tradeStage === 'LATE_TREND'
              ? 'Late-trend setup with tighter risk management.'
              : 'Sideways conditions reduce setup clarity.';

    const rrLabel = riskReward === null ? 'Risk/reward unavailable.' : `Risk/reward is ${roundTo(riskReward, 2)}.`;
    const volumeLabel =
      input.volumeQuality === 'Excellent'
        ? 'Volume is excellent.'
        : input.volumeQuality === 'Good'
          ? 'Volume supports continuation.'
          : 'Volume is acceptable.';

    return `${stageLabel} ${volumeLabel} ${rrLabel}`;
  }

  private recentSwingHigh(highs: readonly number[]): number {
    const window = highs.slice(Math.max(0, highs.length - ENTRY_SWING_LOOKBACK));

    if (window.length === 0) {
      return highs[highs.length - 1] ?? 0;
    }

    return Math.max(...window);
  }

  private nearestSupport(lows: readonly number[], entry: number): number | null {
    const window = lows.slice(Math.max(0, lows.length - ENTRY_SUPPORT_LOOKBACK));
    const supports = window.filter((value) => value < entry);

    if (supports.length === 0) {
      return null;
    }

    return Math.max(...supports);
  }
}
