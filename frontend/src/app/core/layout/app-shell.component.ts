import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
	selector: 'vs-app-shell',
	imports: [MatSidenavModule, MatToolbarModule, MatListModule, RouterLink, RouterLinkActive, RouterOutlet],
	templateUrl: './app-shell.component.html',
	styleUrl: './app-shell.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
	protected readonly navigationOpen = signal(true);
	protected readonly navigation = [
		{ path: '/dashboard', label: 'Dashboard' },
		{ path: '/scanner', label: 'Scanner' },
		{ path: '/watchlist', label: 'Watchlist' },
		{ path: '/journal', label: 'Journal' },
		{ path: '/settings', label: 'Settings' }
	] as const;
}
