import { container } from '@sapphire/framework';
import { AxiosError } from 'axios';

import Account from '@/entities/Account';

import handleRobloxRequest from './handleRobloxRequest';

export default async function handleCsrfFetch(account: Account) {
  try {
    const xCSRFInstance = await handleRobloxRequest(account);
    await xCSRFInstance.post('https://auth.roblox.com/v2/logout');
    return null;
  } catch (e) {
    const xCSRFToken = e.response.headers['x-csrf-token'];
    if (!xCSRFToken) {
      container.sentry.handleException(e as AxiosError);
      return null;
    }
    return xCSRFToken;
  }
}
