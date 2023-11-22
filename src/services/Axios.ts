import { container } from "@sapphire/pieces";
import type { AxiosRequestConfig } from "axios";
import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";


export class AxiosService {
  static newInstance(options?: AxiosRequestConfig) {
    const instance = axios.create(options);
    instance.interceptors.response.use(
      (response) => {
        container.log.info(
          `[${response.request.host}] [${response.request.method}] [${response.status}] ${response.config.url}`,
          {
            response: { status: response.status, body: response.data, headers: response.headers },
            request: {
              method: response.request.method,
              url: `${response.request.res.responseUrl}`,
              body: response.config.data,
            },
          }
        );
        return response;
      },
      (error) => {
        if (error instanceof AxiosError) {
          container.log.error(
            `[${error.request.host}] [${error.request.method}] [${error.response?.status}] ${error.config?.url}`,
            {
              response: {
                status: error.response?.status,
                body: error.response?.data,
                headers: error.response?.headers,
              },
              request: {
                method: error.request.method,
                url: `${error.request.res.responseUrl}`,
                body: error.config?.data,
              },
            }
          );
        }
        throw error;
      }
    );
    axiosRetry(instance, {
      retries: 5,
      retryDelay(retryCount, error) {
        const delay = axiosRetry.exponentialDelay(retryCount);
        const handShakeFailedDelay = delay + 10000;
        return (error.response?.status ?? 0) === 565 ? handShakeFailedDelay : delay;
      },
      retryCondition(error) {
        return (error.response?.status ?? 0) === 565 ? true : axiosRetry.isNetworkOrIdempotentRequestError(error);
      },
    });
    return instance;
  }
}
