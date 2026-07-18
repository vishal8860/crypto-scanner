import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'vs-dashboard-page',
	templateUrl: './dashboard.page.html',
	styleUrl: './dashboard.page.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {}
