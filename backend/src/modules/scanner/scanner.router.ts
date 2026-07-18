import { Router } from 'express';
import { ScannerService } from './scanner.service.js';
export const createScannerRouter = (): Router => { const router = Router(); const service = new ScannerService(); router.get('/latest', async (_request, response) => response.json({ data: await service.getLatest() })); return router; };
