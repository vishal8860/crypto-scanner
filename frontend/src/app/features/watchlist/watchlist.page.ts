import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'vs-watchlist-page',
	templateUrl: './watchlist.page.html',
	styleUrl: './watchlist.page.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WatchlistPageComponent {}
