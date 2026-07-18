import type { ScheduledTask } from 'node-cron';
export class SchedulerService { private task?: ScheduledTask; public register(): void { /* Scheduled task registration placeholder. No business action is scheduled. */ } public stop(): void { this.task?.stop(); } }
