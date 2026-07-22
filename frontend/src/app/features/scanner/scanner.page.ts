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
		'entryQuality',
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
		return value === null ? 'N/A' : value.toFixed(5);
	}

	protected formatPercent(value: number | null): string {
		return value === null ? 'N/A' : `${value.toFixed(2)}%`;
	}

	protected formatSignedPercent(value: number): string {
		return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
	}

	protected formatDistance(value: number): string {
		return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
	}

	protected formatRiskReward(value: number | null): string {
		return value === null ? 'N/A' : value.toFixed(2);
	}

	protected formatEfficiency(value: number): string {
		return `${value.toFixed(2)}%/candle`;
	}

	protected rrChip(riskReward: number | null): ChipConfig {
		if (riskReward === null) {
			return { icon: '⚪', label: 'Unavailable', tone: 'neutral' };
		}

		if (riskReward < 1) {
			return { icon: '🔴', label: `Very Poor (${riskReward.toFixed(2)})`, tone: 'red' };
		}

		if (riskReward < 1.5) {
			return { icon: '🟠', label: `Poor (${riskReward.toFixed(2)})`, tone: 'orange' };
		}

		if (riskReward < 2) {
			return { icon: '🟡', label: `Fair (${riskReward.toFixed(2)})`, tone: 'amber' };
		}

		if (riskReward <= 3) {
			return { icon: '🟢', label: `Good (${riskReward.toFixed(2)})`, tone: 'green' };
		}

		return { icon: '⭐', label: `Excellent (${riskReward.toFixed(2)})`, tone: 'green' };
	}

	protected entryQualityLabel(score: number): string {
		if (score >= 90) {
			return `Excellent (${Math.round(score)})`;
		}

		if (score >= 75) {
			return `Good (${Math.round(score)})`;
		}

		if (score >= 60) {
			return `Fair (${Math.round(score)})`;
		}

		return `Poor (${Math.round(score)})`;
	}

	protected whyThisTradeBullets(summary: ScannerResult): readonly string[] {
		const bullets: string[] = [];

		if (summary.tradeStage === 'EARLY_BREAKDOWN') {
			bullets.push('✓ Fresh bearish structure below EMA200');
		} else if (summary.tradeStage === 'PULLBACK_ENTRY') {
			bullets.push('✓ Pullback toward EMA20 within active bearish trend');
		} else if (summary.tradeStage === 'TREND_CONTINUATION') {
			bullets.push('✓ Trend continuation setup remains valid');
		} else if (summary.tradeStage === 'LATE_TREND') {
			bullets.push('⚠ Trend is mature; avoid chasing extended moves');
		} else {
			bullets.push('⚠ Sideways structure reduces directional confidence');
		}

		if (summary.trendStrengthScore >= 7) {
			bullets.push('✓ Strong trend alignment is intact');
		} else if (summary.trendStrengthScore >= 5) {
			bullets.push('✓ Trend structure remains acceptable');
		} else {
			bullets.push('⚠ Trend strength is currently weak');
		}

		if (summary.volumeQuality === 'Excellent' || summary.volumeQuality === 'Good') {
			bullets.push('✓ Volume is above average');
		} else {
			bullets.push('⚠ Volume quality is only moderate');
		}

		if (summary.riskReward !== null && summary.riskReward >= 2) {
			bullets.push('✓ Risk/reward profile is favorable');
		} else if (summary.riskReward !== null) {
			bullets.push('⚠ Risk/reward is only moderate');
		} else {
			bullets.push('⚠ Risk/reward is unavailable for this setup');
		}

		return bullets;
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
