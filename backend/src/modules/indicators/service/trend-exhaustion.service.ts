import {
  ATR_BASELINE_PERIOD,
  ATR_PERIOD,
  EXHAUSTION_ATR_EXPANSION_EXHAUSTED,
  EXHAUSTION_ATR_EXPANSION_EXTENDED,
  EXHAUSTION_ATR_EXPANSION_PARABOLIC,
  EXHAUSTION_CLIMAX_VOLUME_EXHAUSTED,
  EXHAUSTION_CLIMAX_VOLUME_EXTENDED,
  EXHAUSTION_CLIMAX_VOLUME_PARABOLIC,
  EXHAUSTION_EMA20_EXHAUSTED_PERCENT,
  EXHAUSTION_EMA20_EXTENDED_PERCENT,
  EXHAUSTION_EMA20_PARABOLIC_PERCENT,
  EXHAUSTION_IMPULSIVE_BODY_MULTIPLIER,
  EXHAUSTION_IMPULSIVE_LOOKBACK,
  EXHAUSTION_MIN_IMPULSIVE_CANDLES
} from '../constants/indicator.constants.js';
import { TrendExhaustionState } from '../interfaces/indicator-result.interface.js';

export interface TrendExhaustionInput {
  readonly opens: readonly number[];
  readonly highs: readonly number[];
  readonly lows: readonly number[];
  readonly closes: readonly number[];
  readonly volumes: readonly number[];
  readonly distanceFromEMA20Percent: number;
}

export interface TrendExhaustionResult {
  readonly trendExhaustion: TrendExhaustionState;
  readonly impulsiveCandleCount: number;
  readonly atrExpansionRatio: number;
  readonly climaxVolumeRatio: number;
  readonly ema20ExtensionPercent: number;
}

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export class TrendExhaustionService {
  public analyze(input: TrendExhaustionInput): TrendExhaustionResult {
    const impulsiveCandleCount = this.countImpulsiveCandles(input.opens, input.closes);
    const atrExpansionRatio = this.resolveAtrExpansionRatio(input.highs, input.lows, input.closes);
    const climaxVolumeRatio = this.resolveClimaxVolumeRatio(input.volumes);
    const ema20ExtensionPercent = Math.abs(input.distanceFromEMA20Percent);

    const trendExhaustion = this.resolveExhaustionState({
      impulsiveCandleCount,
      atrExpansionRatio,
      climaxVolumeRatio,
      ema20ExtensionPercent
    });

    return {
      trendExhaustion,
      impulsiveCandleCount,
      atrExpansionRatio,
      climaxVolumeRatio,
      ema20ExtensionPercent: roundTo(ema20ExtensionPercent, 2)
    };
  }

  private countImpulsiveCandles(opens: readonly number[], closes: readonly number[]): number {
    const lookback = Math.min(EXHAUSTION_IMPULSIVE_LOOKBACK, opens.length - 1, closes.length - 1);
    if (lookback <= 1) {
      return 0;
    }

    const candleBodies: number[] = [];
    for (let index = opens.length - lookback; index < opens.length; index += 1) {
      const open = opens[index];
      const close = closes[index];
      if (open === undefined || close === undefined || open === 0) {
        continue;
      }

      candleBodies.push(Math.abs((close - open) / open) * 100);
    }

    if (candleBodies.length === 0) {
      return 0;
    }

    const averageBody = candleBodies.reduce((total, value) => total + value, 0) / candleBodies.length;
    const threshold = averageBody * EXHAUSTION_IMPULSIVE_BODY_MULTIPLIER;

    return candleBodies.filter((body) => body >= threshold).length;
  }

  private resolveAtrExpansionRatio(
    highs: readonly number[],
    lows: readonly number[],
    closes: readonly number[]
  ): number {
    const atrSeries = this.calculateAtrSeries(highs, lows, closes, ATR_PERIOD);
    if (atrSeries.length < ATR_BASELINE_PERIOD + 1) {
      return 1;
    }

    const latest = atrSeries[atrSeries.length - 1];
    const baselineSlice = atrSeries.slice(-ATR_BASELINE_PERIOD - 1, -1);
    if (latest === undefined || baselineSlice.length === 0) {
      return 1;
    }

    const baseline = baselineSlice.reduce((total, value) => total + value, 0) / baselineSlice.length;
    if (baseline === 0) {
      return 1;
    }

    return roundTo(latest / baseline, 2);
  }

  private resolveClimaxVolumeRatio(volumes: readonly number[]): number {
    if (volumes.length < 21) {
      return 1;
    }

    const latest = volumes[volumes.length - 1] ?? 0;
    const baselineSlice = volumes.slice(-21, -1);
    const baseline = baselineSlice.reduce((total, value) => total + value, 0) / Math.max(1, baselineSlice.length);

    if (baseline === 0) {
      return 1;
    }

    return roundTo(latest / baseline, 2);
  }

  private calculateAtrSeries(
    highs: readonly number[],
    lows: readonly number[],
    closes: readonly number[],
    period: number
  ): readonly number[] {
    const trueRanges: number[] = [];

    for (let index = 1; index < highs.length; index += 1) {
      const high = highs[index];
      const low = lows[index];
      const previousClose = closes[index - 1];

      if (high === undefined || low === undefined || previousClose === undefined) {
        continue;
      }

      const trueRange = Math.max(
        high - low,
        Math.abs(high - previousClose),
        Math.abs(low - previousClose)
      );

      trueRanges.push(trueRange);
    }

    if (trueRanges.length < period) {
      return [];
    }

    const atrSeries: number[] = [];
    for (let index = period - 1; index < trueRanges.length; index += 1) {
      const window = trueRanges.slice(index - period + 1, index + 1);
      const atr = window.reduce((total, value) => total + value, 0) / period;
      atrSeries.push(atr);
    }

    return atrSeries;
  }

  private resolveExhaustionState(input: {
    readonly impulsiveCandleCount: number;
    readonly atrExpansionRatio: number;
    readonly climaxVolumeRatio: number;
    readonly ema20ExtensionPercent: number;
  }): TrendExhaustionState {
    const impulsiveFlag = input.impulsiveCandleCount >= EXHAUSTION_MIN_IMPULSIVE_CANDLES;

    const parabolicSignals =
      Number(impulsiveFlag) +
      Number(input.ema20ExtensionPercent >= EXHAUSTION_EMA20_PARABOLIC_PERCENT) +
      Number(input.atrExpansionRatio >= EXHAUSTION_ATR_EXPANSION_PARABOLIC) +
      Number(input.climaxVolumeRatio >= EXHAUSTION_CLIMAX_VOLUME_PARABOLIC);

    if (parabolicSignals >= 3) {
      return 'Parabolic';
    }

    const exhaustedSignals =
      Number(impulsiveFlag) +
      Number(input.ema20ExtensionPercent >= EXHAUSTION_EMA20_EXHAUSTED_PERCENT) +
      Number(input.atrExpansionRatio >= EXHAUSTION_ATR_EXPANSION_EXHAUSTED) +
      Number(input.climaxVolumeRatio >= EXHAUSTION_CLIMAX_VOLUME_EXHAUSTED);

    if (exhaustedSignals >= 2) {
      return 'Exhausted';
    }

    const extendedSignals =
      Number(input.ema20ExtensionPercent >= EXHAUSTION_EMA20_EXTENDED_PERCENT) +
      Number(input.atrExpansionRatio >= EXHAUSTION_ATR_EXPANSION_EXTENDED) +
      Number(input.climaxVolumeRatio >= EXHAUSTION_CLIMAX_VOLUME_EXTENDED);

    if (extendedSignals >= 2) {
      return 'Extended';
    }

    return 'Healthy Trend';
  }
}
