import '@sentry/tracing';

import { container } from '@sapphire/framework';
import * as dotenv from 'dotenv';
import path from 'path';

import CustomClient from './client';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve('.env') });
}

const client = new CustomClient();

client.login(process.env.BOT_TOKEN);

process.on('SIGTERM', () => process.exit());

process.on('unhandledRejection', (error: Error) => {
  container.sentry.handleException(error);
});
