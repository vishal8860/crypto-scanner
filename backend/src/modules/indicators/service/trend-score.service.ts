import {
  SCORE_MAX,
  SCORE_MIN,
  TREND_SCORE_AVERAGE_MIN,
  TREND_SCORE_EXCELLENT_MIN,
  TREND_SCORE_GOOD_MIN
} from '../constants/indicator.constants.js';
import { TrendAge, TrendGrade, VolumeQuality } from '../interfaces/indicator-result.interface.js';

export interface TrendScoreInput {
  readonly emaDistanceScore: number;
  readonly alignmentScore: number;
  readonly trendStrengthScore: number;
  readonly volumeQuality: VolumeQuality;
  readonly sidewaysScore: number;
  readonly freshCross: boolean;
  readonly trendAge: TrendAge;
  readonly momentumScore: number;
  readonly isBelowEMA200: boolean;
}

export interface TrendScoreResult {
  readonly trendScore: number;
  readonly trendGrade: TrendGrade;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export class TrendScoreService {
  public score(input: TrendScoreInput): TrendScoreResult {
    let score = 0;

    score += input.emaDistanceScore;
    score += input.alignmentScore;
    score += clamp(input.trendStrengthScore * 2, 0, 20);
    score += this.volumeContribution(input.volumeQuality);
    score += input.freshCross ? 8 : 0;
    score += this.trendAgeContribution(input.trendAge);
    score += clamp(input.momentumScore, 0, 20);
    score -= this.sidewaysPenalty(input.sidewaysScore);

    if (input.isBelowEMA200) {
      score += 8;
    }

    const trendScore = roundTo(clamp(score, SCORE_MIN, SCORE_MAX), 2);

    return {
      trendScore,
      trendGrade: this.resolveGrade(trendScore)
    };
  }

  private volumeContribution(volumeQuality: VolumeQuality): number {
    if (volumeQuality === 'Excellent') {
      return 10;
    }

    if (volumeQuality === 'Good') {
      return 7;
    }

    if (volumeQuality === 'Average') {
      return 3;
    }

    return 0;
  }

  private trendAgeContribution(age: TrendAge): number {
    if (age === 'Fresh') {
      return 8;
    }

    if (age === 'Developing') {
      return 4;
    }

    return 0;
  }

  private sidewaysPenalty(sidewaysScore: number): number {
    if (sidewaysScore >= 80) {
      return 20;
    }

    if (sidewaysScore >= 60) {
      return 12;
    }

    if (sidewaysScore >= 40) {
      return 6;
    }

    return 0;
  }

  private resolveGrade(score: number): TrendGrade {
    if (score >= TREND_SCORE_EXCELLENT_MIN) {
      return 'Excellent';
    }

    if (score >= TREND_SCORE_GOOD_MIN) {
      return 'Good';
    }

    if (score >= TREND_SCORE_AVERAGE_MIN) {
      return 'Average';
    }

    return 'Poor';
  }
}
