import { type ApiRequest, type ApiResponse, methods, Route } from '@sapphire/plugin-api';
import { isEmpty } from 'lodash';
import { z } from 'zod';

import Account from '@/entities/Account';

export default class FindTicketIdRoute extends Route {
  public constructor(context: Route.Context, options: Route.Options) {
    super(context, {
      ...options,
      route: 'game/tid/:userId',
    });
  }

  public async [methods.GET](_request: ApiRequest, response: ApiResponse) {
    const params = z.object({ userId: z.string() }).parse(_request.params);
    const account = await this.container.db.em.findOne(Account, params.userId);
    if (!account) return response.status(404).json({ message: 'User not found' });
    await account.tickets.init();
    const tickets = account.tickets.toArray();
    if (isEmpty(tickets)) return response.status(400).json({ message: 'User has no tickets' });
    return response.json({ id: tickets[0].id });
  }
}
