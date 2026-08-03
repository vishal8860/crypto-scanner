import { Injectable, signal } from '@angular/core';

export interface ScannerSettings {
  readonly minimumMarketCapUsd: number;
  readonly minimumVolume24hUsd: number;
}

const STORAGE_KEY = 'vishal-scanner-settings';
const DEFAULT_SETTINGS: ScannerSettings = {
  minimumMarketCapUsd: 25_000_000,
  minimumVolume24hUsd: 10_000_000
};

@Injectable({ providedIn: 'root' })
export class ScannerSettingsService {
  private readonly settingsState = signal<ScannerSettings>(this.load());

  public readonly settings = this.settingsState.asReadonly();

  public update(settings: ScannerSettings): void {
    this.settingsState.set(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  public reset(): void {
    this.update(DEFAULT_SETTINGS);
  }

  private load(): ScannerSettings {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ScannerSettings>;
      return {
        minimumMarketCapUsd: this.safeNumber(parsed.minimumMarketCapUsd, DEFAULT_SETTINGS.minimumMarketCapUsd),
        minimumVolume24hUsd: this.safeNumber(parsed.minimumVolume24hUsd, DEFAULT_SETTINGS.minimumVolume24hUsd)
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private safeNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }
}
