import { ChangeDetectionStrategy, Component, OnInit, computed, effect, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CandleInterval } from './candle.interface';
import { SlopeCategory, TrendAge, VolumeQuality } from './indicator-result.interface';
import { ScannerEngineService } from './scanner-engine.service';
import { ScannerResult } from './scanner-result.interface';
import { ScannerScoreBadgeComponent } from './components/scanner-score-badge.component';
import { ChipTone, ScannerStatusChipComponent } from './components/scanner-status-chip.component';
import { ScannerTrendChipComponent } from './components/scanner-trend-chip.component';

type ScoreTier = 'excellent' | 'good' | 'average' | 'ignore';
type AlignmentState = 'bearish' | 'bullish' | 'mixed';

interface ChipConfig {
	readonly icon: string;
	readonly label: string;
	readonly tone: ChipTone;
}

@Component({
	selector: 'vs-scanner-page',
	imports: [
		MatTableModule,
		MatProgressSpinnerModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		ScannerScoreBadgeComponent,
		ScannerStatusChipComponent,
		ScannerTrendChipComponent
	],
	templateUrl: './scanner.page.html',
	styleUrl: './scanner.page.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScannerPageComponent implements OnInit {
	protected readonly displayedColumns = [
		'rank',
		'symbol',
		'score',
		'priority',
		'tradeStage',
		'trend',
		'trendAge',
		'freshCross',
		'distanceEMA200',
		'belowEMA200'
	];
	protected readonly inspectorInterval: CandleInterval = '15m';
	protected readonly searchTerm = signal('');
	protected readonly dataSource = new MatTableDataSource<ScannerResult>([]);
	protected readonly selectedSymbol = signal<string | null>(null);
	protected readonly selectedResult = signal<ScannerResult | null>(null);

	protected readonly scanResults = computed(() => this.scannerEngineService.filteredResults());
	protected readonly scanSummary = computed(() => this.scannerEngineService.summary());
	protected readonly inspectorData = computed(() => this.selectedResult());
	protected readonly scanning = computed(() => this.scannerEngineService.scanning());
	protected readonly scanError = computed(() => this.scannerEngineService.error());
	protected readonly scanProgress = computed(() => this.scannerEngineService.progress());
	protected readonly scoreLegend = [
		'🟢 Excellent (90-100)',
		'🟡 Good (75-89)',
		'🟠 Average (60-74)',
		'🔴 Ignore (<60)'
	] as const;

	public constructor(
		protected readonly scannerEngineService: ScannerEngineService
	) {
		this.dataSource.filterPredicate = (row: ScannerResult, filter: string) =>
			row.symbol.toLowerCase().includes(filter.trim().toLowerCase());

		effect(() => {
			this.dataSource.data = [...this.scanResults()];

			const selected = this.selectedSymbol();
			if (!selected) {
				this.applyFilter();
				return;
			}

			const updated = this.scanResults().find((result) => result.symbol === selected) ?? null;
			this.selectedResult.set(updated);
			this.applyFilter();
		});
	}

	public ngOnInit(): void {
		void this.scan();
	}

	protected onSearch(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.searchTerm.set(input.value);
		this.applyFilter();
	}

	protected async scan(): Promise<void> {
		await this.scannerEngineService.scan(this.inspectorInterval);
	}

	protected isSelectedMarket(symbol: string): boolean {
		return this.selectedSymbol() === symbol;
	}

	protected onSelectOpportunity(result: ScannerResult): void {
		this.selectedSymbol.set(result.symbol);
		this.selectedResult.set(result);
	}

	protected formatNumber(value: number | null): string {
		return value === null ? 'N/A' : value.toLocaleString(undefined, { maximumFractionDigits: 8 });
	}

	protected formatPercent(value: number | null): string {
		return value === null ? 'N/A' : `${value.toFixed(3)}%`;
	}

	protected formatSignedPercent(value: number): string {
		return `${value >= 0 ? '+' : ''}${value.toFixed(4)}%`;
	}

	protected formatDistance(value: number): string {
		return `${value >= 0 ? '+' : ''}${value.toFixed(4)}%`;
	}

	protected emptyStateMessage(): string {
		if (this.scanResults().length === 0) {
			return 'No high-quality bearish opportunities found right now.';
		}

		return 'No opportunities found for the current search.';
	}

	protected scoreTier(score: number): ScoreTier {
		if (score >= 90) {
			return 'excellent';
		}

		if (score >= 75) {
			return 'good';
		}

		if (score >= 60) {
			return 'average';
		}

		return 'ignore';
	}

	protected isScoreTier(score: number, tier: ScoreTier): boolean {
		return this.scoreTier(score) === tier;
	}

	protected trendAgeChip(age: TrendAge): ChipConfig {
		if (age === 'Fresh') {
			return { icon: '🟢', label: 'Fresh', tone: 'green' };
		}

		if (age === 'Developing') {
			return { icon: '🟠', label: 'Developing', tone: 'orange' };
		}

		return { icon: '🔴', label: 'Old', tone: 'red' };
	}

	protected freshCrossChip(freshCross: boolean): ChipConfig {
		return freshCross
			? { icon: '✅', label: 'Fresh', tone: 'green' }
			: { icon: '❌', label: 'Old Trend', tone: 'red' };
	}

	protected alignmentState(result: ScannerResult): AlignmentState {
		if (result.bearishAlignment) {
			return 'bearish';
		}

		if (result.ema9 > result.ema20 && result.ema20 > result.ema200) {
			return 'bullish';
		}

		return 'mixed';
	}

	protected alignmentChip(result: ScannerResult): ChipConfig {
		const state = this.alignmentState(result);

		if (state === 'bearish') {
			return { icon: '🔴', label: 'Bearish Alignment', tone: 'red' };
		}

		if (state === 'bullish') {
			return { icon: '🟢', label: 'Bullish Alignment', tone: 'green' };
		}

		return { icon: '⚪', label: 'Mixed Alignment', tone: 'neutral' };
	}

	protected slopeChip(category: SlopeCategory): ChipConfig {
		if (category === 'Strong Down') {
			return { icon: '📉', label: 'Strong Down', tone: 'red' };
		}

		if (category === 'Moderate Down') {
			return { icon: '↘️', label: 'Moderate Down', tone: 'orange' };
		}

		if (category === 'Flat') {
			return { icon: '➖', label: 'Flat', tone: 'neutral' };
		}

		return { icon: '↗️', label: 'Rising', tone: 'green' };
	}

	protected volumeQualityChip(volumeQuality: VolumeQuality): ChipConfig {
		if (volumeQuality === 'Poor') {
			return { icon: '🔴', label: 'Poor', tone: 'red' };
		}

		if (volumeQuality === 'Average') {
			return { icon: '🟠', label: 'Average', tone: 'orange' };
		}

		if (volumeQuality === 'Good') {
			return { icon: '🟢', label: 'Good', tone: 'green' };
		}

		return { icon: '⭐', label: 'Excellent', tone: 'green' };
	}

	protected sidewaysChip(isSideways: boolean): ChipConfig {
		return isSideways
			? { icon: '⚠️', label: 'Sideways', tone: 'amber' }
			: { icon: '✅', label: 'Directional', tone: 'green' };
	}

	protected priorityChip(priority: 'High' | 'Medium' | 'Low'): ChipConfig {
		if (priority === 'High') {
			return { icon: '🔥', label: 'High', tone: 'red' };
		}

		if (priority === 'Medium') {
			return { icon: '⚡', label: 'Medium', tone: 'orange' };
		}

		return { icon: '•', label: 'Low', tone: 'neutral' };
	}

	protected tradeStageChip(result: ScannerResult): ChipConfig {
		if (result.tradeStageColor === 'green') {
			return { icon: '🟢', label: result.tradeStageLabel, tone: 'green' };
		}

		if (result.tradeStageColor === 'blue') {
			return { icon: '🔵', label: result.tradeStageLabel, tone: 'neutral' };
		}

		if (result.tradeStageColor === 'orange') {
			return { icon: '🟠', label: result.tradeStageLabel, tone: 'orange' };
		}

		if (result.tradeStageColor === 'red') {
			return { icon: '🔴', label: result.tradeStageLabel, tone: 'red' };
		}

		return { icon: '⚪', label: result.tradeStageLabel, tone: 'neutral' };
	}

	protected distanceClass(distance: number): 'distance-green' | 'distance-orange' | 'distance-red' {
		const magnitude = Math.abs(distance);

		if (magnitude <= 3) {
			return 'distance-green';
		}

		if (magnitude <= 8) {
			return 'distance-orange';
		}

		return 'distance-red';
	}

	private applyFilter(): void {
		this.dataSource.filter = this.searchTerm().trim().toLowerCase();
	}
}
