import {
  MARKET_STRUCTURE_EMA20_FLAT_THRESHOLD,
  MARKET_STRUCTURE_EMA20_SLIGHT_DOWN_THRESHOLD,
  MARKET_STRUCTURE_EMA20_STRONG_DOWN_THRESHOLD,
  MARKET_STRUCTURE_EMA20_STRONG_RISE_THRESHOLD,
  MARKET_STRUCTURE_EMA200_SLOPE_DOWN_THRESHOLD,
  MARKET_STRUCTURE_EMA200_SLOPE_UP_THRESHOLD,
  MARKET_STRUCTURE_EMA200_TEST_DISTANCE_PERCENT,
  MARKET_STRUCTURE_ENTRY_SCORE_CAPS,
  MARKET_STRUCTURE_TREND_ADJUSTMENTS
} from '../constants/indicator.constants.js';
import { MarketStructure } from '../interfaces/indicator-result.interface.js';

export interface ProfessionalMarketStructureInput {
  readonly price: number;
  readonly ema20: number;
  readonly ema200: number;
  readonly ema20SlopePercent: number;
  readonly ema200SlopePercent: number;
  readonly distanceFromEMA200Percent: number;
  readonly higherTimeframeConfirmedBearish: boolean;
}

export interface ProfessionalMarketStructureResult {
  readonly marketStructure: MarketStructure;
  readonly reason: readonly string[];
  readonly whySentence: string;
  readonly trendAdjustment: number;
  readonly entryScoreCap: number | null;
  readonly priority: number;
}

export class ProfessionalMarketStructureService {
  public classify(input: ProfessionalMarketStructureInput): ProfessionalMarketStructureResult {
    const marketStructure = this.resolveStructure(input);

    return {
      marketStructure,
      reason: this.resolveReason(marketStructure, input),
      whySentence: this.resolveWhySentence(marketStructure),
      trendAdjustment: this.resolveTrendAdjustment(marketStructure),
      entryScoreCap: this.resolveEntryCap(marketStructure),
      priority: this.resolvePriority(marketStructure)
    };
  }

  private resolveStructure(input: ProfessionalMarketStructureInput): MarketStructure {
    const priceBelowEma200 = input.price < input.ema200;
    const priceAboveEma200 = input.price > input.ema200;
    const ema20BelowEma200 = input.ema20 < input.ema200;
    const ema20AboveEma200 = input.ema20 > input.ema200;
    const ema20Flat = Math.abs(input.ema20SlopePercent) <= MARKET_STRUCTURE_EMA20_FLAT_THRESHOLD;
    const ema20Down = input.ema20SlopePercent < MARKET_STRUCTURE_EMA20_SLIGHT_DOWN_THRESHOLD;
    const ema20StrongDown = input.ema20SlopePercent <= MARKET_STRUCTURE_EMA20_STRONG_DOWN_THRESHOLD;
    const ema20Rising = input.ema20SlopePercent > MARKET_STRUCTURE_EMA20_FLAT_THRESHOLD;
    const ema20StrongRising = input.ema20SlopePercent >= MARKET_STRUCTURE_EMA20_STRONG_RISE_THRESHOLD;
    const ema200Down = input.ema200SlopePercent <= MARKET_STRUCTURE_EMA200_SLOPE_DOWN_THRESHOLD;
    const ema200Rising = input.ema200SlopePercent >= MARKET_STRUCTURE_EMA200_SLOPE_UP_THRESHOLD;
    const testingEma200 = Math.abs(input.distanceFromEMA200Percent) <= MARKET_STRUCTURE_EMA200_TEST_DISTANCE_PERCENT;

    if (priceBelowEma200 && ema20BelowEma200 && ema20StrongDown && ema200Down) {
      return MarketStructure.StrongBearish;
    }

    if (priceBelowEma200 && ema20BelowEma200 && (ema20Down || ema20Flat)) {
      return MarketStructure.Bearish;
    }

    if (priceBelowEma200 && (ema20Rising || testingEma200)) {
      return MarketStructure.TransitionalBearish;
    }

    if (testingEma200 && ema20Flat) {
      return MarketStructure.Neutral;
    }

    if (priceAboveEma200 && (ema20Rising || testingEma200)) {
      if (!ema20AboveEma200 || testingEma200) {
        return MarketStructure.TransitionalBullish;
      }
    }

    if (priceAboveEma200 && ema20AboveEma200 && ema20StrongRising && ema200Rising) {
      return MarketStructure.StrongBullish;
    }

    if (priceAboveEma200 && ema20AboveEma200 && ema20Rising) {
      return MarketStructure.Bullish;
    }

    if (priceAboveEma200) {
      return MarketStructure.TransitionalBullish;
    }

    return MarketStructure.Neutral;
  }

  private resolveReason(
    marketStructure: MarketStructure,
    input: ProfessionalMarketStructureInput
  ): readonly string[] {
    const reasons: string[] = [];

    if (input.ema20SlopePercent > MARKET_STRUCTURE_EMA20_FLAT_THRESHOLD) {
      reasons.push('EMA20 is attempting a bullish crossover.');
    }

    if (Math.abs(input.distanceFromEMA200Percent) <= MARKET_STRUCTURE_EMA200_TEST_DISTANCE_PERCENT) {
      reasons.push('Price is testing EMA200 after recent movement.');
    }

    if (input.higherTimeframeConfirmedBearish) {
      reasons.push('Higher timeframe remains bearish.');
    }

    switch (marketStructure) {
      case MarketStructure.StrongBearish:
        reasons.unshift('Price is below EMA200 with both EMA20 and EMA200 sloping down.');
        break;
      case MarketStructure.Bearish:
        reasons.unshift('Price and EMA20 remain below EMA200 with a bearish bias.');
        break;
      case MarketStructure.TransitionalBearish:
        reasons.unshift('Bearish context is weakening while recovery pressure appears.');
        reasons.push('Bearish edge reduced until rejection occurs.');
        break;
      case MarketStructure.Neutral:
        reasons.unshift('Price is oscillating around EMA200 and EMA20 is nearly flat.');
        break;
      case MarketStructure.TransitionalBullish:
        reasons.unshift('Bullish recovery is underway with improving EMA20 slope.');
        break;
      case MarketStructure.Bullish:
        reasons.unshift('Price and EMA20 are above EMA200 with rising momentum.');
        break;
      case MarketStructure.StrongBullish:
        reasons.unshift('Full bullish alignment with strong EMA20 rise and rising EMA200.');
        break;
      default:
        break;
    }

    return reasons.slice(0, 4);
  }

  private resolveWhySentence(marketStructure: MarketStructure): string {
    switch (marketStructure) {
      case MarketStructure.StrongBearish:
        return 'Market remains in a mature bearish trend with full EMA alignment.';
      case MarketStructure.Bearish:
        return 'Trend remains bearish although momentum has slowed.';
      case MarketStructure.TransitionalBearish:
        return 'Price is attempting a recovery into dynamic resistance. Wait for confirmation.';
      case MarketStructure.Neutral:
        return 'Market lacks directional edge.';
      case MarketStructure.TransitionalBullish:
        return 'Bullish recovery is underway. Bearish continuation has lower probability.';
      case MarketStructure.Bullish:
        return 'Structure favors long setups rather than shorts.';
      case MarketStructure.StrongBullish:
        return 'Trend strongly favors buyers. Ignore all bearish continuation setups.';
      default:
        return 'Market lacks directional edge.';
    }
  }

  private resolveTrendAdjustment(marketStructure: MarketStructure): number {
    switch (marketStructure) {
      case MarketStructure.StrongBearish:
        return MARKET_STRUCTURE_TREND_ADJUSTMENTS.StrongBearish;
      case MarketStructure.Bearish:
        return MARKET_STRUCTURE_TREND_ADJUSTMENTS.Bearish;
      case MarketStructure.TransitionalBearish:
        return MARKET_STRUCTURE_TREND_ADJUSTMENTS.TransitionalBearish;
      case MarketStructure.Neutral:
        return MARKET_STRUCTURE_TREND_ADJUSTMENTS.Neutral;
      case MarketStructure.TransitionalBullish:
        return MARKET_STRUCTURE_TREND_ADJUSTMENTS.TransitionalBullish;
      case MarketStructure.Bullish:
        return MARKET_STRUCTURE_TREND_ADJUSTMENTS.Bullish;
      case MarketStructure.StrongBullish:
        return MARKET_STRUCTURE_TREND_ADJUSTMENTS.StrongBullish;
      default:
        return 0;
    }
  }

  private resolveEntryCap(marketStructure: MarketStructure): number | null {
    if (marketStructure === MarketStructure.Neutral) {
      return MARKET_STRUCTURE_ENTRY_SCORE_CAPS.Neutral;
    }

    if (marketStructure === MarketStructure.Bullish) {
      return MARKET_STRUCTURE_ENTRY_SCORE_CAPS.Bullish;
    }

    if (marketStructure === MarketStructure.StrongBullish) {
      return MARKET_STRUCTURE_ENTRY_SCORE_CAPS.StrongBullish;
    }

    return null;
  }

  private resolvePriority(marketStructure: MarketStructure): number {
    switch (marketStructure) {
      case MarketStructure.StrongBearish:
        return 0;
      case MarketStructure.Bearish:
        return 1;
      case MarketStructure.TransitionalBearish:
        return 2;
      case MarketStructure.Neutral:
        return 3;
      case MarketStructure.TransitionalBullish:
        return 4;
      case MarketStructure.Bullish:
        return 5;
      case MarketStructure.StrongBullish:
        return 6;
      default:
        return 99;
    }
  }
}
