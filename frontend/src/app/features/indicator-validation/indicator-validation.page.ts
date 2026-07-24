import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { PerformanceIntelligenceService } from '../../core/services/performance-intelligence.service';
import { BreakdownRow, IndicatorValidationPayload } from '../../shared/models/performance.interface';

@Component({
  selector: 'vs-indicator-validation-page',
  templateUrl: './indicator-validation.page.html',
  styleUrl: './indicator-validation.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorValidationPageComponent implements OnInit {
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly payload = signal<IndicatorValidationPayload | null>(null);

  public constructor(private readonly performanceService: PerformanceIntelligenceService) {}

  public ngOnInit(): void {
    void this.load();
  }

  protected async reload(): Promise<void> {
    await this.load();
  }

  protected formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  protected formatR(value: number): string {
    return `${value.toFixed(2)}R`;
  }

  protected sections(payload: IndicatorValidationPayload): readonly { readonly title: string; readonly rows: readonly BreakdownRow[] }[] {
    return [
      { title: 'Trend Age Validation', rows: payload.trendAge },
      { title: 'Volume Quality Validation', rows: payload.volumeQuality },
      { title: 'EMA Distance Buckets', rows: payload.emaDistanceBuckets },
      { title: 'Pullback Quality Buckets', rows: payload.pullbackQualityBuckets },
      { title: 'Risk Reward Buckets', rows: payload.riskRewardBuckets }
    ];
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.performanceService.getIndicatorValidation();
      this.payload.set(response);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to load indicator validation data.');
    } finally {
      this.loading.set(false);
    }
  }
}
