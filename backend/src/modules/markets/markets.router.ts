import { Router } from 'express';
import { MarketsService } from './markets.service.js';
import { MarketsResponseDto } from './markets-response.dto.js';

export const createMarketsRouter = (): Router => {
	const router = Router();
	const service = new MarketsService();

	router.get('/', async (_request, response) => {
		const markets = await service.list();
		const payload: MarketsResponseDto = { data: markets };
		response.json(payload);
	});

	return router;
};
