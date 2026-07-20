import { Router } from 'express';
import { AppError } from '../../../common/errors/app-error.js';
import { CANDLE_INTERVALS } from '../../candles/constants/candle.constants.js';
import { CandleInterval } from '../../candles/types/candle-interval.type.js';
import { IndicatorsQueryDto } from '../dto/indicators-query.dto.js';
import { IndicatorsResponseDto } from '../dto/indicators-response.dto.js';
import { INDICATOR_DEFAULT_INTERVAL } from '../constants/indicator.constants.js';
import { IndicatorsService } from '../service/indicators.service.js';

const INTERVAL_SET = new Set<string>(CANDLE_INTERVALS);

const toSymbol = (value: string | undefined): string => {
  const normalized = (value ?? '').trim().toUpperCase();

  if (!normalized) {
    throw new AppError(400, 'Symbol is required');
  }

  if (!/^[A-Z0-9]{5,20}$/.test(normalized)) {
    throw new AppError(400, 'Symbol format is invalid');
  }

  return normalized;
};

const toInterval = (value: string | undefined): CandleInterval => {
  const candidate = value ?? INDICATOR_DEFAULT_INTERVAL;

  if (!INTERVAL_SET.has(candidate)) {
    throw new AppError(400, `Invalid interval. Allowed: ${CANDLE_INTERVALS.join(', ')}`);
  }

  return candidate as CandleInterval;
};

export const createIndicatorsRouter = (): Router => {
  const router = Router();
  const service = new IndicatorsService();

  router.get('/', async (request, response) => {
    const query: IndicatorsQueryDto = {
      symbol: toSymbol(typeof request.query.symbol === 'string' ? request.query.symbol : undefined),
      interval: toInterval(typeof request.query.interval === 'string' ? request.query.interval : undefined)
    };

    const payload: IndicatorsResponseDto = await service.getForMarket(query);
    response.json(payload);
  });

  return router;
};
