import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ScannerSettingsService } from '../../core/services/scanner-settings.service';

@Component({
	selector: 'vs-settings-page',
	imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
	templateUrl: './settings.page.html',
	styleUrl: './settings.page.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
	protected readonly saved = signal(false);
	protected minimumMarketCapUsd = this.scannerSettingsService.settings().minimumMarketCapUsd;
	protected minimumVolume24hUsd = this.scannerSettingsService.settings().minimumVolume24hUsd;

	public constructor(private readonly scannerSettingsService: ScannerSettingsService) {}

	protected save(): void {
		this.scannerSettingsService.update({
			minimumMarketCapUsd: Number(this.minimumMarketCapUsd),
			minimumVolume24hUsd: Number(this.minimumVolume24hUsd)
		});
		this.saved.set(true);
	}

	protected reset(): void {
		this.scannerSettingsService.reset();
		const settings = this.scannerSettingsService.settings();
		this.minimumMarketCapUsd = settings.minimumMarketCapUsd;
		this.minimumVolume24hUsd = settings.minimumVolume24hUsd;
		this.saved.set(false);
	}
}
