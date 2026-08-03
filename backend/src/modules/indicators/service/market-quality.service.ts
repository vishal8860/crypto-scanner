import {
  MARKET_QUALITY_AVERAGE_MIN,
  MARKET_QUALITY_DEFAULT_MIN_MARKET_CAP_USD,
  MARKET_QUALITY_DEFAULT_MIN_VOLUME_USD,
  MARKET_QUALITY_EXCELLENT_MIN,
  MARKET_QUALITY_GOOD_MIN,
  MARKET_QUALITY_MARKET_CAP_SCORES,
  MARKET_QUALITY_RISKY_MIN,
  MARKET_QUALITY_VOLUME_SCORES,
  SCORE_MAX,
  SCORE_MIN
} from '../constants/indicator.constants.js';
import { MarketQuality } from '../interfaces/indicator-result.interface.js';

export interface MarketQualityInput {
  readonly marketCapUsd: number | null;
  readonly marketVolume24hUsd: number | null;
  readonly minimumMarketCapUsd?: number;
  readonly minimumVolume24hUsd?: number;
}

export interface MarketQualityResult {
  readonly marketQuality: MarketQuality;
  readonly marketQualityScore: number;
  readonly marketQualityReasons: readonly string[];
  readonly minimumMarketCapUsd: number;
  readonly minimumVolume24hUsd: number;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export class MarketQualityService {
  public assess(input: MarketQualityInput): MarketQualityResult {
    const minimumMarketCapUsd = input.minimumMarketCapUsd ?? MARKET_QUALITY_DEFAULT_MIN_MARKET_CAP_USD;
    const minimumVolume24hUsd = input.minimumVolume24hUsd ?? MARKET_QUALITY_DEFAULT_MIN_VOLUME_USD;
    const reasons: string[] = [];

    const marketCapPoints = this.marketCapPoints(input.marketCapUsd, reasons, minimumMarketCapUsd);
    const volumePoints = this.volumePoints(input.marketVolume24hUsd, reasons, minimumVolume24hUsd);
    const rawPoints = marketCapPoints + volumePoints;
    const marketQualityScore = roundTo(clamp(((rawPoints + 30) / 55) * 100, SCORE_MIN, SCORE_MAX), 2);

    return {
      marketQuality: this.resolveLabel(marketQualityScore),
      marketQualityScore,
      marketQualityReasons: reasons,
      minimumMarketCapUsd,
      minimumVolume24hUsd
    };
  }

  private marketCapPoints(marketCapUsd: number | null, reasons: string[], minimumMarketCapUsd: number): number {
    if (marketCapUsd === null) {
      reasons.push('Market cap unavailable; quality uses partial data.');
      return 0;
    }

    if (marketCapUsd > 10_000_000_000) {
      reasons.push('Market cap is above $10B.');
      return MARKET_QUALITY_MARKET_CAP_SCORES.megaCap;
    }

    if (marketCapUsd >= 2_000_000_000) {
      reasons.push('Market cap is between $2B and $10B.');
      return MARKET_QUALITY_MARKET_CAP_SCORES.largeCap;
    }

    if (marketCapUsd >= 500_000_000) {
      reasons.push('Market cap is between $500M and $2B.');
      return MARKET_QUALITY_MARKET_CAP_SCORES.midCap;
    }

    if (marketCapUsd >= minimumMarketCapUsd) {
      reasons.push('Market cap is above configured minimum but below $500M.');
      return MARKET_QUALITY_MARKET_CAP_SCORES.smallCap;
    }

    reasons.push('Market cap is below configured minimum threshold.');
    return MARKET_QUALITY_MARKET_CAP_SCORES.microCap;
  }

  private volumePoints(marketVolume24hUsd: number | null, reasons: string[], minimumVolume24hUsd: number): number {
    if (marketVolume24hUsd === null) {
      reasons.push('24h volume unavailable; liquidity confidence is reduced.');
      return 0;
    }

    if (marketVolume24hUsd > 500_000_000) {
      reasons.push('24h volume is above $500M.');
      return MARKET_QUALITY_VOLUME_SCORES.ultra;
    }

    if (marketVolume24hUsd >= 200_000_000) {
      reasons.push('24h volume is between $200M and $500M.');
      return MARKET_QUALITY_VOLUME_SCORES.high;
    }

    if (marketVolume24hUsd >= 100_000_000) {
      reasons.push('24h volume is between $100M and $200M.');
      return MARKET_QUALITY_VOLUME_SCORES.medium;
    }

    if (marketVolume24hUsd >= minimumVolume24hUsd) {
      reasons.push('24h volume is above configured minimum but still modest.');
      return MARKET_QUALITY_VOLUME_SCORES.low;
    }

    reasons.push('24h volume is below configured minimum threshold.');
    return MARKET_QUALITY_VOLUME_SCORES.thin;
  }

  private resolveLabel(score: number): MarketQuality {
    if (score >= MARKET_QUALITY_EXCELLENT_MIN) {
      return 'Excellent';
    }

    if (score >= MARKET_QUALITY_GOOD_MIN) {
      return 'Good';
    }

    if (score >= MARKET_QUALITY_AVERAGE_MIN) {
      return 'Average';
    }

    if (score >= MARKET_QUALITY_RISKY_MIN) {
      return 'Risky';
    }

    return 'Avoid';
  }
}
