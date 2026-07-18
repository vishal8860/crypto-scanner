import { createApp } from './app.js';
import { environment } from './config/environment.js';
import { SchedulerService } from './modules/scheduler/scheduler.service.js';

const app = createApp();
const scheduler = new SchedulerService();
if (environment.schedulerEnabled) scheduler.register();
app.listen(environment.port, () => console.info(`Vishal Scanner API listening on port ${environment.port}`));
