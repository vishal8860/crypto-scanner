import { NgClass } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChipTone } from './scanner-status-chip.component';

interface ScoreBadge {
  readonly label: 'Excellent' | 'Good' | 'Average' | 'Ignore';
  readonly icon: string;
  readonly tone: ChipTone;
}

@Component({
  selector: 'vs-scanner-score-badge',
  standalone: true,
  imports: [NgClass, DecimalPipe],
  templateUrl: './scanner-score-badge.component.html',
  styleUrl: './scanner-score-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScannerScoreBadgeComponent {
  public readonly score = input.required<number>();

  protected readonly badge = computed<ScoreBadge>(() => {
    const value = this.score();

    if (value >= 90) {
      return { label: 'Excellent', icon: '🟢', tone: 'green' };
    }

    if (value >= 75) {
      return { label: 'Good', icon: '🟡', tone: 'amber' };
    }

    if (value >= 60) {
      return { label: 'Average', icon: '🟠', tone: 'orange' };
    }

    return { label: 'Ignore', icon: '🔴', tone: 'red' };
  });
}
