import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Market } from './market.interface';

interface MarketsResponse {
  readonly data: readonly Market[];
}

@Injectable({ providedIn: 'root' })
export class MarketsService {
  private readonly marketsState = signal<readonly Market[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  public readonly markets = this.marketsState.asReadonly();
  public readonly loading = this.loadingState.asReadonly();
  public readonly error = this.errorState.asReadonly();

  public constructor(private readonly http: HttpClient) {}

  public async refresh(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const response = await firstValueFrom(this.http.get<MarketsResponse>('/api/v1/markets'));
      this.marketsState.set(response.data);
    } catch (error) {
      this.errorState.set(this.resolveErrorMessage(error));
      this.marketsState.set([]);
    } finally {
      this.loadingState.set(false);
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'object' && error.error !== null && 'error' in error.error) {
        const maybeError = (error.error as { error?: { message?: string } }).error;
        if (maybeError?.message) {
          return maybeError.message;
        }
      }

      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to fetch markets right now. Please try again.';
  }
}
