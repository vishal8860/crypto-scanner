import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  BreakdownsPayload,
  DashboardMetrics,
  HeatmapCell,
  IndicatorValidationPayload,
  TradeHistoryRecord,
  VersionMetrics
} from '../../shared/models/performance.interface';

interface ApiResponse<T> {
  readonly data: T;
}

@Injectable({ providedIn: 'root' })
export class PerformanceIntelligenceService {
  public constructor(private readonly http: HttpClient) {}

  public async getTrades(scannerVersion?: string): Promise<readonly TradeHistoryRecord[]> {
    const params = this.buildParams(scannerVersion);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<readonly TradeHistoryRecord[]>>('/api/v1/performance/trades', { params })
      );
      return response.data;
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  public async getDashboard(scannerVersion?: string): Promise<DashboardMetrics> {
    const params = this.buildParams(scannerVersion);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<DashboardMetrics>>('/api/v1/performance/dashboard', { params })
      );
      return response.data;
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  public async getBreakdowns(scannerVersion?: string): Promise<BreakdownsPayload> {
    const params = this.buildParams(scannerVersion);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<BreakdownsPayload>>('/api/v1/performance/breakdowns', { params })
      );
      return response.data;
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  public async getHeatmap(scannerVersion?: string): Promise<readonly HeatmapCell[]> {
    const params = this.buildParams(scannerVersion);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<readonly HeatmapCell[]>>('/api/v1/performance/heatmap', { params })
      );
      return response.data;
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  public async getIndicatorValidation(scannerVersion?: string): Promise<IndicatorValidationPayload> {
    const params = this.buildParams(scannerVersion);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<IndicatorValidationPayload>>('/api/v1/performance/indicator-validation', { params })
      );
      return response.data;
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  public async getVersionComparison(): Promise<readonly VersionMetrics[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<readonly VersionMetrics[]>>('/api/v1/performance/version-comparison')
      );
      return response.data;
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  private buildParams(scannerVersion?: string): HttpParams {
    if (!scannerVersion) {
      return new HttpParams();
    }

    return new HttpParams({ fromObject: { scannerVersion } });
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

    return 'Unable to load performance data.';
  }
}
