import 'dotenv/config';

const required = (name: string, fallback?: string): string => { const value = process.env[name] ?? fallback; if (!value) throw new Error(`Missing environment variable: ${name}`); return value; };

const positiveInteger = (name: string, fallback: string): number => {
	const parsed = Number(required(name, fallback));

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Environment variable ${name} must be a positive integer`);
	}

	return parsed;
};

const csv = (name: string, fallback: string): readonly string[] =>
	required(name, fallback)
		.split(',')
		.map((value) => value.trim())
		.filter((value) => value.length > 0);

export const environment = Object.freeze({
	port: positiveInteger('PORT', '3000'),
	nodeEnv: required('NODE_ENV', 'development'),
	corsAllowedOrigins: csv('CORS_ALLOWED_ORIGINS', 'http://localhost:4200'),
	coinDcxApiBaseUrl: required('COINDCX_API_BASE_URL', 'https://api.coindcx.com'),
	coinDcxPublicApiBaseUrl: required('COINDCX_PUBLIC_API_BASE_URL', 'https://public.coindcx.com'),
	coinDcxApiTimeoutMs: positiveInteger('COINDCX_API_TIMEOUT_MS', '10000'),
	coinDcxApiRetries: positiveInteger('COINDCX_API_RETRIES', '3'),
	sqliteDatabasePath: required('SQLITE_DATABASE_PATH', './data/vishal-scanner.sqlite'),
	schedulerEnabled: required('SCHEDULER_ENABLED', 'false') === 'true'
});
