import { MarketDto } from './market.dto.js';

export interface MarketsResponseDto {
  readonly data: readonly MarketDto[];
}
