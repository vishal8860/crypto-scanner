import { Router } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { MarketsService } from './markets.service.js';
import { MarketsResponseDto } from './markets-response.dto.js';

const toSymbolList = (value: string | undefined): readonly string[] | undefined => {
	if (value === undefined || value.trim() === '') {
		return undefined;
	}

	const symbols = value
		.split(',')
		.map((item) => item.trim().toUpperCase())
		.filter((item) => item.length > 0);

	if (symbols.length === 0) {
		return undefined;
	}

	for (const symbol of symbols) {
		if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
			throw new AppError(400, `Invalid symbol in symbols filter: ${symbol}`);
		}
	}

	return [...new Set(symbols)];
};

export const createMarketsRouter = (): Router => {
	const router = Router();
	const service = new MarketsService();

	router.get('/', async (request, response) => {
		const symbols = toSymbolList(
			typeof request.query.symbols === 'string' ? request.query.symbols : undefined
		);
		const markets = await service.list(symbols);
		const payload: MarketsResponseDto = { data: markets };
		response.json(payload);
	});

	return router;
};
