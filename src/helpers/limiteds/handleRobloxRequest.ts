import { AxiosInstance } from 'axios';

import CustomClient from '@/client';
import Account from '@/entities/Account';

import handleCsrfFetch from './handleCsrfFetch';

export type RobloxWrapper<T> = { data: T };

export default async function handleRobloxRequest(
  account: Account,
  isPost = false
): Promise<AxiosInstance> {
  return CustomClient.createBaseInstance(
    {
      headers: {
        Cookie: `.ROBLOSECURITY=${account.cookie}`,
        ...(isPost ? { 'X-CSRF-TOKEN': await handleCsrfFetch(account) } : {}),
      },
    },
    false,
    account.proxyPort
  );
}
