import cors from 'cors';
import express, { Express } from 'express';
import { errorMiddleware } from './common/middleware/error.middleware.js';
import { loggingMiddleware } from './common/middleware/logging.middleware.js';
import { environment } from './config/environment.js';
import { createCandlesRouter } from './modules/candles/controller/candles.controller.js';
import { createMarketsRouter } from './modules/markets/markets.router.js';
import { createScannerRouter } from './modules/scanner/scanner.router.js';

export const createApp = (): Express => {
	const app = express();

	app.use(
		cors({
			origin: [...environment.corsAllowedOrigins]
		})
	);
	app.use(express.json());
	app.use(loggingMiddleware);

	app.get('/api/v1/health', (_request, response) =>
		response.json({ status: 'ok', timestamp: new Date().toISOString() })
	);

	const marketsRouter = createMarketsRouter();
	const candlesRouter = createCandlesRouter();
	app.use('/api/markets', marketsRouter);
	app.use('/api/v1/markets', marketsRouter);
	app.use('/api/candles', candlesRouter);
	app.use('/api/v1/candles', candlesRouter);
	app.use('/api/v1/scanner', createScannerRouter());
	app.use(errorMiddleware);

	return app;
};
