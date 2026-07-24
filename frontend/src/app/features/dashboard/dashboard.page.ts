import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { PerformanceIntelligenceService } from '../../core/services/performance-intelligence.service';
import {
	BreakdownRow,
	BreakdownsPayload,
	DashboardMetrics,
	HeatmapCell,
	VersionMetrics
} from '../../shared/models/performance.interface';

@Component({
	selector: 'vs-dashboard-page',
	templateUrl: './dashboard.page.html',
	styleUrl: './dashboard.page.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit {
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	protected readonly metrics = signal<DashboardMetrics | null>(null);
	protected readonly breakdowns = signal<BreakdownsPayload | null>(null);
	protected readonly heatmap = signal<readonly HeatmapCell[]>([]);
	protected readonly versionComparison = signal<readonly VersionMetrics[]>([]);

	protected readonly trendGrades: readonly HeatmapCell['trendGrade'][] = ['Excellent', 'Good', 'Average', 'Poor'];
	protected readonly entryGrades: readonly HeatmapCell['entryGrade'][] = ['Ready', 'Watch', 'Developing', 'Poor'];

	public constructor(private readonly performanceService: PerformanceIntelligenceService) {}

	public ngOnInit(): void {
		void this.load();
	}

	protected async reload(): Promise<void> {
		await this.load();
	}

	protected heatmapCell(trendGrade: HeatmapCell['trendGrade'], entryGrade: HeatmapCell['entryGrade']): HeatmapCell {
		return (
			this.heatmap().find(
				(cell) => cell.trendGrade === trendGrade && cell.entryGrade === entryGrade
			) ?? {
				trendGrade,
				entryGrade,
				trades: 0,
				winRate: 0,
				averageR: 0
			}
		);
	}

	protected formatPercent(value: number): string {
		return `${value.toFixed(2)}%`;
	}

	protected formatR(value: number): string {
		return `${value.toFixed(2)}R`;
	}

	protected breakdownEntries(breakdowns: BreakdownsPayload): readonly { readonly title: string; readonly rows: readonly BreakdownRow[] }[] {
		return [
			{ title: 'Decision Grade', rows: breakdowns.decisionGrade },
			{ title: 'Trend Grade', rows: breakdowns.trendGrade },
			{ title: 'Entry Grade', rows: breakdowns.entryGrade },
			{ title: 'Trade Stage', rows: breakdowns.tradeStage },
			{ title: 'Trend Age', rows: breakdowns.trendAge },
			{ title: 'Volume Quality', rows: breakdowns.volumeQuality }
		];
	}

	private async load(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);

		try {
			const [metrics, breakdowns, heatmap, versions] = await Promise.all([
				this.performanceService.getDashboard(),
				this.performanceService.getBreakdowns(),
				this.performanceService.getHeatmap(),
				this.performanceService.getVersionComparison()
			]);

			this.metrics.set(metrics);
			this.breakdowns.set(breakdowns);
			this.heatmap.set(heatmap);
			this.versionComparison.set(versions);
		} catch (error) {
			this.error.set(error instanceof Error ? error.message : 'Failed to load performance dashboard.');
		} finally {
			this.loading.set(false);
		}
	}
}
