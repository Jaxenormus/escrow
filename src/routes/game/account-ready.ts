import { type ApiRequest, type ApiResponse, methods, Route } from '@sapphire/plugin-api';
import { z } from 'zod';

import Account from '@/entities/Account';

export default class AccountReadyRoute extends Route {
  public constructor(context: Route.Context, options: Route.Options) {
    super(context, {
      ...options,
      route: 'game/account/:userId/ready',
    });
  }

  public async [methods.GET](_request: ApiRequest, response: ApiResponse) {
    const params = z.object({ userId: z.string() }).parse(_request.params);
    const account = await this.container.db.em.findOne(Account, params.userId);
    if (!account) return response.status(200).json({ action: 'SHUTDOWN' });
    account.hasJoinedServer = true;
    await this.container.db.em.persistAndFlush(account);
    return response.json({ action: 'NONE' });
  }
}
