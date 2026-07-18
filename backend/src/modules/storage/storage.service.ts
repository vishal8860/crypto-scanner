export interface StorageService { connect(): Promise<void>; disconnect(): Promise<void>; }
export class SqliteStorageService implements StorageService { public async connect(): Promise<void> { /* SQLite adapter placeholder */ } public async disconnect(): Promise<void> { /* SQLite adapter placeholder */ } }
