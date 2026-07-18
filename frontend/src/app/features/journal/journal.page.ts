import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'vs-journal-page',
	templateUrl: './journal.page.html',
	styleUrl: './journal.page.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class JournalPageComponent {}
