import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, effect, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Candle, CandleInterval } from './candle.interface';
import { CandlesService } from './candles.service';
import { Market } from './market.interface';
import { MarketsService } from './markets.service';

@Component({
	selector: 'vs-scanner-page',
	imports: [
		MatTableModule,
		MatSortModule,
		MatProgressSpinnerModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule
	],
	templateUrl: './scanner.page.html',
	styleUrl: './scanner.page.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScannerPageComponent implements OnInit, AfterViewInit {
	@ViewChild(MatSort) private sort?: MatSort;

	protected readonly displayedColumns = ['symbol', 'lastPrice', 'change24HourPercent', 'volume', 'status'];
	protected readonly debugInterval: CandleInterval = '15m';
	protected readonly debugLimit = 250;
	protected readonly searchTerm = signal('');
	protected readonly dataSource = new MatTableDataSource<Market>([]);
	protected readonly selectedSymbol = signal<string | null>(null);
	protected readonly candles = signal<readonly Candle[]>([]);
	protected readonly candlesLoading = signal(false);
	protected readonly candlesError = signal<string | null>(null);

	protected readonly markets = computed(() => this.marketsService.markets());
	protected readonly selectedDebugSummary = computed(() => {
		const symbol = this.selectedSymbol();
		const candles = this.candles();

		if (!symbol || candles.length === 0) {
			return null;
		}

		const first = candles[0];
		const last = candles[candles.length - 1];

		if (!first || !last) {
			return null;
		}

		return {
			symbol,
			interval: this.debugInterval,
			count: candles.length,
			latestClose: last.close,
			latestVolume: last.volume,
			firstTimestamp: first.timestamp,
			lastTimestamp: last.timestamp
		};
	});

	public constructor(
		protected readonly marketsService: MarketsService,
		private readonly candlesService: CandlesService
	) {
		this.dataSource.filterPredicate = (market: Market, filter: string) =>
			market.symbol.toLowerCase().includes(filter.trim().toLowerCase());

		this.dataSource.sortingDataAccessor = (market: Market, column: string): string | number => {
			if (column === 'symbol') {
				return market.symbol;
			}

			if (column === 'volume') {
				return market.volume ?? -1;
			}

			return 0;
		};

		effect(() => {
			this.dataSource.data = [...this.markets()];
			this.applyFilter();
		});
	}

	public ngOnInit(): void {
		void this.refresh();
	}

	public ngAfterViewInit(): void {
		if (this.sort) {
			this.dataSource.sort = this.sort;
		}
	}

	protected onSearch(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.searchTerm.set(input.value);
		this.applyFilter();
	}

	protected async refresh(): Promise<void> {
		await this.marketsService.refresh();
	}

	protected isSelectedMarket(symbol: string): boolean {
		return this.selectedSymbol() === symbol;
	}

	protected async onSelectMarket(market: Market): Promise<void> {
		this.selectedSymbol.set(market.symbol);
		this.candlesLoading.set(true);
		this.candlesError.set(null);

		try {
			const response = await this.candlesService.getCandles(market.symbol, this.debugInterval, this.debugLimit);
			this.candles.set(response.data);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to load candles';
			this.candles.set([]);
			this.candlesError.set(message);
		} finally {
			this.candlesLoading.set(false);
		}
	}

	protected formatNumber(value: number | null): string {
		return value === null ? 'N/A' : value.toLocaleString(undefined, { maximumFractionDigits: 8 });
	}

	protected formatPercent(value: number | null): string {
		return value === null ? 'N/A' : `${value.toFixed(3)}%`;
	}

  protected formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

	private applyFilter(): void {
		this.dataSource.filter = this.searchTerm().trim().toLowerCase();
	}
}
