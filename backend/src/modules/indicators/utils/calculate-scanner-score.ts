import {
  DISTANCE_BELOW_EMA200_BONUS_PERCENT,
  DISTANCE_BELOW_EMA200_PENALTY_PERCENT,
  SCORE_MAX,
  SCORE_MIN,
  SCORE_WEIGHTS
} from '../constants/indicator.constants.js';
import { TrendAge } from '../interfaces/indicator-result.interface.js';

interface ScannerScoreInput {
  readonly isBelowEMA200: boolean;
  readonly isBearishAlignment: boolean;
  readonly freshCross: boolean;
  readonly distanceFromEMA200Percent: number;
  readonly trendAge: TrendAge;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const calculateScannerScore = (input: ScannerScoreInput): number => {
  let score = 0;

  if (input.isBelowEMA200) {
    score += SCORE_WEIGHTS.belowEMA200;
  }

  if (input.isBearishAlignment) {
    score += SCORE_WEIGHTS.bearishAlignment;
  }

  if (input.freshCross) {
    score += SCORE_WEIGHTS.freshCross;
  }

  const belowByPercent = -input.distanceFromEMA200Percent;

  if (input.isBelowEMA200 && belowByPercent < DISTANCE_BELOW_EMA200_BONUS_PERCENT) {
    score += SCORE_WEIGHTS.closeToEMA200;
  }

  if (input.isBelowEMA200 && belowByPercent > DISTANCE_BELOW_EMA200_PENALTY_PERCENT) {
    score += SCORE_WEIGHTS.farBelowEMA200Penalty;
  }

  if (input.trendAge === 'Old') {
    score += SCORE_WEIGHTS.oldTrendPenalty;
  }

  return clamp(score, SCORE_MIN, SCORE_MAX);
};
