import { AxiosInstance } from 'axios';
import { AppError } from '../../common/errors/app-error.js';
import { createAxiosClient } from '../../common/http/axios-client.js';
import { environment } from '../../config/environment.js';
import { CoinDcxFuturesInstrument, CoinDcxTicker } from './coindcx-api.interface.js';

export class CoinDcxApiService {
  private readonly client: AxiosInstance;

  public constructor(client?: AxiosInstance) {
    this.client =
      client ??
      createAxiosClient({
        baseUrl: environment.coinDcxApiBaseUrl,
        timeoutMs: environment.coinDcxApiTimeoutMs,
        retries: environment.coinDcxApiRetries
      });
  }

  public async getActiveFuturesInstruments(): Promise<readonly CoinDcxFuturesInstrument[]> {
    try {
      const response = await this.client.get<readonly CoinDcxFuturesInstrument[]>(
        '/exchange/v1/derivatives/futures/data/active_instruments'
      );

      return response.data;
    } catch (error) {
      throw new AppError(502, `Failed to fetch active futures instruments from CoinDCX: ${this.getErrorMessage(error)}`);
    }
  }

  public async getTicker(): Promise<readonly CoinDcxTicker[]> {
    try {
      const response = await this.client.get<readonly CoinDcxTicker[]>('/exchange/ticker');

      return response.data;
    } catch (error) {
      throw new AppError(502, `Failed to fetch ticker data from CoinDCX: ${this.getErrorMessage(error)}`);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
