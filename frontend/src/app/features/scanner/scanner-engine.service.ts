import { Injectable, signal } from '@angular/core';
import { CandleInterval } from './candle.interface';
import { IndicatorResult } from './indicator-result.interface';
import { IndicatorsService } from './indicators.service';
import { Market } from './market.interface';
import { MarketsService } from './markets.service';
import { ScannerResult } from './scanner-result.interface';

interface ScanProgress {
  readonly current: number;
  readonly total: number;
}

const SCAN_BATCH_SIZE = 8;

const toScannerResult = (indicator: IndicatorResult): ScannerResult => ({
  rank: 0,
  symbol: indicator.symbol,
  price: indicator.price,
  score: indicator.scannerScore,
  trend: indicator.trend,
  trendAge: indicator.trendAge,
  freshCross: indicator.freshCross,
  belowEMA200: indicator.isBelowEMA200,
  bearishAlignment: indicator.isBearishAlignment,
  distanceEMA200: indicator.distanceFromEMA200Percent,
  candlesSinceCross: indicator.candlesSinceEMA200Cross,
  ema9: indicator.ema9,
  ema20: indicator.ema20,
  ema200: indicator.ema200,
  distanceEMA20: indicator.distanceFromEMA20Percent
});

const rankByScore = (results: readonly ScannerResult[]): readonly ScannerResult[] =>
  [...results]
    .sort((left, right) => right.score - left.score)
    .map((result, index) => ({ ...result, rank: index + 1 }));

@Injectable({ providedIn: 'root' })
export class ScannerEngineService {
  private readonly opportunitiesState = signal<readonly ScannerResult[]>([]);
  private readonly scanningState = signal(false);
  private readonly progressState = signal<ScanProgress | null>(null);
  private readonly errorState = signal<string | null>(null);

  public readonly opportunities = this.opportunitiesState.asReadonly();
  public readonly scanning = this.scanningState.asReadonly();
  public readonly progress = this.progressState.asReadonly();
  public readonly error = this.errorState.asReadonly();

  public constructor(
    private readonly marketsService: MarketsService,
    private readonly indicatorsService: IndicatorsService
  ) {}

  public async scan(interval: CandleInterval): Promise<void> {
    if (this.scanningState()) {
      return;
    }

    this.scanningState.set(true);
    this.errorState.set(null);

    try {
      await this.marketsService.refresh();

      const marketsError = this.marketsService.error();
      if (marketsError) {
        throw new Error(marketsError);
      }

      const activeMarkets = this.marketsService
        .markets()
        .filter((market) => market.status.toLowerCase() === 'active');

      const total = activeMarkets.length;
      this.progressState.set({ current: 0, total });

      if (total === 0) {
        this.opportunitiesState.set([]);
        return;
      }

      const scanned: ScannerResult[] = [];
      let completed = 0;

      for (let start = 0; start < activeMarkets.length; start += SCAN_BATCH_SIZE) {
        const batch = activeMarkets.slice(start, start + SCAN_BATCH_SIZE);
        const batchResults = await Promise.all(batch.map((market) => this.scanSingleMarket(market, interval)));

        for (const result of batchResults) {
          completed += 1;
          this.progressState.set({ current: completed, total });

          if (result) {
            scanned.push(result);
          }
        }
      }

      this.opportunitiesState.set(rankByScore(scanned));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scan markets';
      this.errorState.set(message);
      this.opportunitiesState.set([]);
    } finally {
      this.scanningState.set(false);
      this.progressState.set(null);
    }
  }

  private async scanSingleMarket(
    market: Market,
    interval: CandleInterval
  ): Promise<ScannerResult | null> {
    try {
      const indicator = await this.indicatorsService.getIndicators(market.symbol, interval);
      return toScannerResult(indicator);
    } catch {
      return null;
    }
  }
}
