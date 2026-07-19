import { Router } from 'express';
import { AppError } from '../../../common/errors/app-error.js';
import {
  CANDLE_DEFAULT_INTERVAL,
  CANDLE_DEFAULT_LIMIT,
  CANDLE_INTERVALS,
  CANDLE_MAX_LIMIT,
  CANDLE_MIN_LIMIT
} from '../constants/candle.constants.js';
import { CandlesQueryDto } from '../dto/candles-query.dto.js';
import { CandlesResponseDto } from '../dto/candles-response.dto.js';
import { CandlesService } from '../service/candles.service.js';
import { CandleInterval } from '../types/candle-interval.type.js';

const INTERVAL_SET = new Set<string>(CANDLE_INTERVALS);

const toInterval = (value: string | undefined): CandleInterval => {
  const candidate = value ?? CANDLE_DEFAULT_INTERVAL;

  if (!INTERVAL_SET.has(candidate)) {
    throw new AppError(400, `Invalid interval. Allowed: ${CANDLE_INTERVALS.join(', ')}`);
  }

  return candidate as CandleInterval;
};

const toLimit = (value: string | undefined): number => {
  if (!value) {
    return CANDLE_DEFAULT_LIMIT;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new AppError(400, 'Limit must be an integer');
  }

  if (parsed < CANDLE_MIN_LIMIT || parsed > CANDLE_MAX_LIMIT) {
    throw new AppError(400, `Limit must be between ${CANDLE_MIN_LIMIT} and ${CANDLE_MAX_LIMIT}`);
  }

  return parsed;
};

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

export const createCandlesRouter = (): Router => {
  const router = Router();
  const service = new CandlesService();

  router.get('/', async (request, response) => {
    const query: CandlesQueryDto = {
      symbol: toSymbol(typeof request.query.symbol === 'string' ? request.query.symbol : undefined),
      interval: toInterval(typeof request.query.interval === 'string' ? request.query.interval : undefined),
      limit: toLimit(typeof request.query.limit === 'string' ? request.query.limit : undefined)
    };

    const payload: CandlesResponseDto = await service.list(query);
    response.json(payload);
  });

  return router;
};
