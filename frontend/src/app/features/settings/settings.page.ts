import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'vs-settings-page',
	templateUrl: './settings.page.html',
	styleUrl: './settings.page.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {}
