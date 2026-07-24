import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { TradeHistoryCreateInput, TradeHistoryRecord } from './trade-history.interface.js';

export interface TradeHistoryRepository {
  list(scannerVersion?: string): Promise<readonly TradeHistoryRecord[]>;
  create(input: TradeHistoryCreateInput): Promise<TradeHistoryRecord>;
}

const STORAGE_FILE = path.resolve(process.cwd(), 'outputs', 'trade-history.json');

export class FileTradeHistoryRepository implements TradeHistoryRepository {
  private writeChain: Promise<void> = Promise.resolve();

  public async list(scannerVersion?: string): Promise<readonly TradeHistoryRecord[]> {
    const all = await this.readAll();

    if (!scannerVersion) {
      return all;
    }

    return all.filter((trade) => trade.scannerVersion === scannerVersion);
  }

  public async create(input: TradeHistoryCreateInput): Promise<TradeHistoryRecord> {
    const record: TradeHistoryRecord = {
      id: randomUUID(),
      direction: input.direction ?? 'Short',
      ...input
    };

    await this.enqueueWrite(async () => {
      const all = await this.readAll();
      all.push(record);
      await this.writeAll(all);
    });

    return record;
  }

  private async enqueueWrite(operation: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(operation);
    await this.writeChain;
  }

  private async readAll(): Promise<TradeHistoryRecord[]> {
    await this.ensureFile();
    const raw = await fs.readFile(STORAGE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as TradeHistoryRecord[];
  }

  private async writeAll(records: readonly TradeHistoryRecord[]): Promise<void> {
    await this.ensureFile();
    await fs.writeFile(STORAGE_FILE, JSON.stringify(records, null, 2), 'utf8');
  }

  private async ensureFile(): Promise<void> {
    const dir = path.dirname(STORAGE_FILE);
    await fs.mkdir(dir, { recursive: true });

    try {
      await fs.access(STORAGE_FILE);
    } catch {
      await fs.writeFile(STORAGE_FILE, '[]', 'utf8');
    }
  }
}
