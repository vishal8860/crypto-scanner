import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

interface RetryConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly retries: number;
}

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
}

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const delay = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const shouldRetry = (error: AxiosError): boolean => {
  if (error.code === 'ECONNABORTED') {
    return true;
  }

  if (!error.response) {
    return true;
  }

  return RETRYABLE_STATUS_CODES.has(error.response.status);
};

export const createAxiosClient = (config: RetryConfig): AxiosInstance => {
  const client = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const request = error.config as RetryRequestConfig | undefined;

      if (!request || !shouldRetry(error)) {
        throw error;
      }

      request.retryCount = request.retryCount ?? 0;

      if (request.retryCount >= config.retries) {
        throw error;
      }

      request.retryCount += 1;
      const backoffMs = request.retryCount * 250;
      await delay(backoffMs);

      return client.request(request);
    }
  );

  return client;
};
