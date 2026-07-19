import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CandleInterval } from './candle.interface';
import { CandlesResponse } from './candles-response.interface';

@Injectable({ providedIn: 'root' })
export class CandlesService {
  public constructor(private readonly http: HttpClient) {}

  public async getCandles(symbol: string, interval: CandleInterval, limit: number): Promise<CandlesResponse> {
    const params = new HttpParams({
      fromObject: {
        symbol,
        interval,
        limit: String(limit)
      }
    });

    try {
      return await firstValueFrom(this.http.get<CandlesResponse>('/api/v1/candles', { params }));
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'object' && error.error !== null && 'error' in error.error) {
        const payload = error.error as { error?: { message?: string } };
        if (payload.error?.message) {
          return payload.error.message;
        }
      }

      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to fetch candles';
  }
}
