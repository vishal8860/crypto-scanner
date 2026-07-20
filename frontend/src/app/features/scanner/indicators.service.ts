import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CandleInterval } from './candle.interface';
import { IndicatorResult } from './indicator-result.interface';

interface IndicatorsResponse {
  readonly data: IndicatorResult;
}

@Injectable({ providedIn: 'root' })
export class IndicatorsService {
  public constructor(private readonly http: HttpClient) {}

  public async getIndicators(symbol: string, interval: CandleInterval): Promise<IndicatorResult> {
    const params = new HttpParams({
      fromObject: {
        symbol,
        interval
      }
    });

    try {
      const response = await firstValueFrom(this.http.get<IndicatorsResponse>('/api/v1/indicators', { params }));
      return response.data;
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

    return 'Failed to fetch indicators';
  }
}
