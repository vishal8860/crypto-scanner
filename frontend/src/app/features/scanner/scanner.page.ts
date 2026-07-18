import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, effect, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
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
	protected readonly searchTerm = signal('');
	protected readonly dataSource = new MatTableDataSource<Market>([]);

	protected readonly markets = computed(() => this.marketsService.markets());

	public constructor(protected readonly marketsService: MarketsService) {
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

	protected formatNumber(value: number | null): string {
		return value === null ? 'N/A' : value.toLocaleString(undefined, { maximumFractionDigits: 8 });
	}

	protected formatPercent(value: number | null): string {
		return value === null ? 'N/A' : `${value.toFixed(3)}%`;
	}

	private applyFilter(): void {
		this.dataSource.filter = this.searchTerm().trim().toLowerCase();
	}
}
