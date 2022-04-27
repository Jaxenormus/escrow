import { container } from '@sapphire/framework';
import axios from 'axios';

export default async function findRobloxHeadShot(accountId: string) {
  try {
    const thumbnail = await axios.get('https://thumbnails.roblox.com/v1/users/avatar-headshot', {
      params: {
        userIds: accountId,
        size: '150x150',
        format: 'Png',
      },
    });
    return thumbnail.data.data[0].imageUrl ?? '';
  } catch (e) {
    container.sentry.handleException(e);
    return '';
  }
}
