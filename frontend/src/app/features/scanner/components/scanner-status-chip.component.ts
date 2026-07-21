import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

export type ChipTone = 'green' | 'amber' | 'orange' | 'red' | 'neutral';

@Component({
  selector: 'vs-scanner-status-chip',
  standalone: true,
  imports: [MatChipsModule, NgClass],
  templateUrl: './scanner-status-chip.component.html',
  styleUrl: './scanner-status-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScannerStatusChipComponent {
  public readonly icon = input.required<string>();
  public readonly label = input.required<string>();
  public readonly tone = input<ChipTone>('neutral');
}
