import { CandleInterval } from '../../candles/types/candle-interval.type.js';
import {
  HigherTimeframeConfirmation,
  MultiTimeframeSnapshot,
  Trend
} from '../interfaces/indicator-result.interface.js';

export interface MultiTimeframePrimaryAnalysis extends MultiTimeframeSnapshot {}

export interface MultiTimeframeAnalysisInput {
  readonly symbol: string;
  readonly primaryInterval: CandleInterval;
  readonly primaryAnalysis: MultiTimeframePrimaryAnalysis;
  readonly analyzeInterval: (interval: CandleInterval) => Promise<MultiTimeframeSnapshot>;
}

export interface MultiTimeframeAnalysisResult {
  readonly analyses: readonly MultiTimeframeSnapshot[];
  readonly higherTimeframeConfirmation: HigherTimeframeConfirmation;
}

const MULTI_TIMEFRAME_INTERVALS: readonly CandleInterval[] = ['15m', '1h'];

export class MultiTimeframeAnalysisService {
  public async analyze(input: MultiTimeframeAnalysisInput): Promise<MultiTimeframeAnalysisResult> {
    const intervals = [...new Set<CandleInterval>([...MULTI_TIMEFRAME_INTERVALS, input.primaryInterval])];
    const analyses: MultiTimeframeSnapshot[] = [];

    for (const interval of intervals) {
      if (interval === input.primaryInterval) {
        analyses.push(input.primaryAnalysis);
        continue;
      }

      analyses.push(await input.analyzeInterval(interval));
    }

    const primary = analyses.find((analysis) => analysis.timeframe === input.primaryInterval) ?? input.primaryAnalysis;
    const higher = analyses.find((analysis) => analysis.timeframe !== input.primaryInterval);

    return {
      analyses,
      higherTimeframeConfirmation: this.resolveConfirmation(primary.trend, higher?.trend ?? 'Neutral')
    };
  }

  private resolveConfirmation(primaryTrend: Trend, higherTrend: Trend): HigherTimeframeConfirmation {
    if (primaryTrend === 'Bearish' && higherTrend === 'Bearish') {
      return 'Confirmed';
    }

    if (primaryTrend === 'Bearish' && higherTrend === 'Bullish') {
      return 'Counter Trend';
    }

    return 'Neutral';
  }
}
