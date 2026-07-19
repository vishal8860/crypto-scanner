import { CandlesQueryDto } from '../dto/candles-query.dto.js';
import { CandlesResponseDto } from '../dto/candles-response.dto.js';
import { CandleDataProvider } from '../interfaces/candle-data-provider.interface.js';
import { CoinDcxCandlesService } from './coindcx-candles.service.js';

export class CandlesService {
  public constructor(private readonly provider: CandleDataProvider = new CoinDcxCandlesService()) {}

  public async list(query: CandlesQueryDto): Promise<CandlesResponseDto> {
    const candles = await this.provider.listCandles(query);

    return {
      data: candles,
      meta: {
        symbol: query.symbol,
        interval: query.interval,
        limit: query.limit,
        count: candles.length
      }
    };
  }
}
