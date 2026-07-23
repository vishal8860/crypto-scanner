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

interface ScoreBreakdownLine {
	readonly label: string;
	readonly points: number;
}

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
		'trendScore',
		'entryScore',
		'verdict',
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
		'Trend Grade: Excellent / Good / Average / Poor',
		'Entry Grade: Ready / Watch / Developing / Poor',
		'Verdict: READY / WATCH / DEVELOPING / IGNORE'
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

	protected trendScoreBreakdown(summary: ScannerResult): readonly ScoreBreakdownLine[] {
		const lines: ScoreBreakdownLine[] = [
			{ label: 'EMA Structure', points: this.roundContribution(summary.alignmentScore) },
			{ label: 'EMA20 Slope', points: this.roundContribution(summary.slopeScore) },
			{ label: 'EMA200 Position', points: summary.belowEMA200 ? 8 : 0 },
			{ label: 'Trend Freshness', points: summary.freshCross ? 8 : 0 },
			{ label: 'Trend Strength', points: this.trendStrengthContribution(summary.trendStrengthScore) },
			{ label: 'Directional Movement', points: this.roundContribution(summary.momentumScore) },
			{ label: 'Volume Quality', points: this.trendVolumeContribution(summary.volumeQuality) },
			{ label: 'Trend Age', points: this.trendAgeContribution(summary.trendAge) }
		];

		const sidewaysPenalty = this.trendSidewaysPenalty(summary.sidewaysScore);
		if (sidewaysPenalty > 0) {
			lines.push({ label: 'Sideways Penalty', points: -sidewaysPenalty });
		}

		const delta = this.roundTo(summary.trendScore - this.sumPoints(lines), 2);
		if (Math.abs(delta) > 0.01) {
			lines.push({ label: 'Model Normalization', points: delta });
		}

		return lines;
	}

	protected entryScoreBreakdown(summary: ScannerResult): readonly ScoreBreakdownLine[] {
		const lines: ScoreBreakdownLine[] = [
			{ label: 'Entry Location', points: this.entryStageContribution(summary.tradeStage) },
			{ label: 'Distance EMA20', points: this.entryDistanceContribution(summary.distanceEMA20) },
			{ label: 'Pullback Quality', points: this.entryPullbackContribution(summary.tradeStage, summary.distanceEMA20) },
			{ label: 'Risk Reward', points: this.entryRiskRewardContribution(summary.riskReward) },
			{ label: 'Support / Resistance', points: this.entrySupportContribution(summary) },
			{ label: 'Volume Context', points: this.entryVolumeContextContribution(summary.volumeQuality) }
		];

		const extensionPenalty = this.entryExtensionPenalty(summary.distanceEMA20);
		if (extensionPenalty > 0) {
			lines.push({ label: 'Extension Penalty', points: -extensionPenalty });
		}

		if (summary.suggestedEntry === null) {
			lines.push({ label: 'No Plan Penalty', points: -25 });
		}

		const delta = this.roundTo(summary.entryScore - this.sumPoints(lines), 2);
		if (Math.abs(delta) > 0.01) {
			lines.push({ label: 'Model Normalization', points: delta });
		}

		return lines;
	}

	protected scoreBreakdownTotal(lines: readonly ScoreBreakdownLine[]): number {
		return this.roundTo(this.sumPoints(lines), 2);
	}

	protected formatContribution(points: number): string {
		if (Number.isInteger(points)) {
			return points >= 0 ? `+${points}` : `${points}`;
		}

		const rounded = this.roundTo(points, 2);
		return rounded >= 0 ? `+${rounded.toFixed(2)}` : `${rounded.toFixed(2)}`;
	}

	protected whyThisTradeBullets(summary: ScannerResult): readonly string[] {
		const bullets: string[] = [];

		if (summary.bearishAlignment) {
			bullets.push('Strong bearish trend structure is intact.');
		}

		if (summary.ema20SlopeCategory === 'Strong Down' || summary.ema20SlopeCategory === 'Moderate Down') {
			bullets.push('EMA20 is sloping downward, supporting continuation.');
		}

		if (summary.belowEMA200) {
			bullets.push('Price remains below EMA200, confirming bearish bias.');
		}

		if (summary.tradeStage === 'PULLBACK_ENTRY') {
			bullets.push('Setup is in pullback-entry zone near dynamic resistance.');
		} else if (summary.tradeStage === 'EARLY_BREAKDOWN') {
			bullets.push('Fresh breakdown context still offers directional opportunity.');
		}

		if (summary.riskReward !== null && summary.riskReward >= 2) {
			bullets.push(`Risk/reward profile is favorable at ${summary.riskReward.toFixed(2)}.`);
		}

		if (summary.volumeQuality === 'Excellent' || summary.volumeQuality === 'Good') {
			bullets.push('Volume participation is supportive for continuation.');
		}

		if (summary.freshCross) {
			bullets.push('Trend transition is recent, reducing late-trend risk.');
		}

		if (summary.trendStrengthScore >= 7) {
			bullets.push('Directional movement is strong enough to sustain momentum.');
		}

		return bullets.slice(0, 5);
	}

	protected blockersBullets(summary: ScannerResult): readonly string[] {
		const blockers: string[] = [];

		if (!summary.bearishAlignment) {
			blockers.push('EMA structure is not fully bearish yet.');
		}

		if (summary.ema20SlopeCategory === 'Flat' || summary.ema20SlopeCategory === 'Rising') {
			blockers.push('EMA20 slope is not decisively downward.');
		}

		if (summary.trendAge === 'Old' || !summary.freshCross) {
			blockers.push('Trend is aging, which reduces freshness edge.');
		}

		if (summary.riskReward === null) {
			blockers.push('Risk/reward could not be confirmed from current plan levels.');
		} else if (summary.riskReward < 2) {
			blockers.push('Risk/reward is below the preferred threshold.');
		}

		if (summary.volumeQuality === 'Poor' || summary.volumeQuality === 'Average') {
			blockers.push('Volume support is only moderate for continuation.');
		}

		if (Math.abs(summary.distanceEMA20) > 1.2) {
			blockers.push('Price is stretched from EMA20, raising extension risk.');
		}

		if (summary.isSideways || summary.sidewaysScore >= 60) {
			blockers.push('Sideways pressure is still elevated in current structure.');
		}

		if (!summary.belowEMA200) {
			blockers.push('Price is not below EMA200, weakening bearish conviction.');
		}

		return blockers.slice(0, 5);
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

	protected verdictChip(verdict: ScannerResult['tradeVerdict']): ChipConfig {
		if (verdict === 'READY') {
			return { icon: '🟢', label: 'READY', tone: 'green' };
		}

		if (verdict === 'WATCH') {
			return { icon: '🟡', label: 'WATCH', tone: 'amber' };
		}

		if (verdict === 'DEVELOPING') {
			return { icon: '🔵', label: 'DEVELOPING', tone: 'neutral' };
		}

		return { icon: '🔴', label: 'IGNORE', tone: 'red' };
	}

	protected verdictReason(verdict: ScannerResult['tradeVerdict']): string {
		if (verdict === 'READY') {
			return 'Strong market quality and strong entry timing.';
		}

		if (verdict === 'WATCH') {
			return 'Market quality is strong, but entry timing is not ideal yet.';
		}

		if (verdict === 'DEVELOPING') {
			return 'Trend quality is building, but setup is not fully mature.';
		}

		return 'Market quality is below threshold for consideration.';
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

	private trendStrengthContribution(value: number): number {
		return this.roundContribution(Math.max(0, Math.min(20, value * 2)));
	}

	private trendVolumeContribution(volumeQuality: VolumeQuality): number {
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

	private trendAgeContribution(trendAge: TrendAge): number {
		if (trendAge === 'Fresh') {
			return 8;
		}

		if (trendAge === 'Developing') {
			return 4;
		}

		return 0;
	}

	private trendSidewaysPenalty(sidewaysScore: number): number {
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

	private entryStageContribution(stage: ScannerResult['tradeStage']): number {
		if (stage === 'EARLY_BREAKDOWN') {
			return 22;
		}

		if (stage === 'PULLBACK_ENTRY') {
			return 26;
		}

		if (stage === 'TREND_CONTINUATION') {
			return 14;
		}

		if (stage === 'LATE_TREND') {
			return 6;
		}

		return 0;
	}

	private entryDistanceContribution(distanceFromEMA20Percent: number): number {
		const distance = Math.abs(distanceFromEMA20Percent);

		if (distance <= 0.4) {
			return 18;
		}

		if (distance <= 1) {
			return 14;
		}

		if (distance <= 2) {
			return 8;
		}

		return 2;
	}

	private entryPullbackContribution(stage: ScannerResult['tradeStage'], distanceFromEMA20Percent: number): number {
		const distance = Math.abs(distanceFromEMA20Percent);

		if (stage === 'PULLBACK_ENTRY' && distance <= 0.8) {
			return 14;
		}

		if (stage === 'EARLY_BREAKDOWN' && distance <= 1.2) {
			return 10;
		}

		if (stage === 'TREND_CONTINUATION' && distance <= 1) {
			return 8;
		}

		return 0;
	}

	private entryRiskRewardContribution(riskReward: number | null): number {
		if (riskReward === null) {
			return 0;
		}

		if (riskReward > 3) {
			return 22;
		}

		if (riskReward >= 2) {
			return 16;
		}

		if (riskReward >= 1.5) {
			return 9;
		}

		return 2;
	}

	private entryExtensionPenalty(distanceFromEMA20Percent: number): number {
		const distance = Math.abs(distanceFromEMA20Percent);

		if (distance > 3) {
			return 12;
		}

		if (distance > 2) {
			return 8;
		}

		if (distance > 1.2) {
			return 4;
		}

		return 0;
	}

	private entrySupportContribution(summary: ScannerResult): number {
		if (summary.suggestedEntry === null || summary.suggestedTakeProfit === null || summary.price <= 0) {
			return 0;
		}

		const targetDistancePercent = Math.abs(((summary.suggestedEntry - summary.suggestedTakeProfit) / summary.price) * 100);

		if (targetDistancePercent >= 2) {
			return 8;
		}

		if (targetDistancePercent >= 1) {
			return 5;
		}

		return 2;
	}

	private entryVolumeContextContribution(volumeQuality: VolumeQuality): number {
		if (volumeQuality === 'Excellent') {
			return 6;
		}

		if (volumeQuality === 'Good') {
			return 4;
		}

		if (volumeQuality === 'Average') {
			return 2;
		}

		return 0;
	}

	private sumPoints(lines: readonly ScoreBreakdownLine[]): number {
		return lines.reduce((total, line) => total + line.points, 0);
	}

	private roundContribution(value: number): number {
		return this.roundTo(value, 2);
	}

	private roundTo(value: number, precision: number): number {
		const factor = 10 ** precision;
		return Math.round(value * factor) / factor;
	}
}
