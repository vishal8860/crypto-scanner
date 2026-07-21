import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Trend } from '../indicator-result.interface';
import { ChipTone, ScannerStatusChipComponent } from './scanner-status-chip.component';

@Component({
  selector: 'vs-scanner-trend-chip',
  standalone: true,
  imports: [ScannerStatusChipComponent],
  templateUrl: './scanner-trend-chip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScannerTrendChipComponent {
  public readonly trend = input.required<Trend>();

  protected icon(): string {
    const value = this.trend();
    if (value === 'Bearish') {
      return '🔻';
    }

    if (value === 'Bullish') {
      return '🟢';
    }

    return '⚪';
  }

  protected tone(): ChipTone {
    const value = this.trend();
    if (value === 'Bearish') {
      return 'red';
    }

    if (value === 'Bullish') {
      return 'green';
    }

    return 'neutral';
  }
}
