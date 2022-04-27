import { type ApiRequest, type ApiResponse, methods, Route } from '@sapphire/plugin-api';
import { z } from 'zod';

import Ticket from '@/entities/Ticket';

export default class FindDealRoute extends Route {
  public constructor(context: Route.Context, options: Route.Options) {
    super(context, {
      ...options,
      route: 'game/deal/:tid',
    });
  }

  public async [methods.GET](_request: ApiRequest, response: ApiResponse) {
    const params = z.object({ tid: z.string() }).parse(_request.params);
    const ticket = await this.container.db.em.findOne(Ticket, params.tid);
    if (!ticket) return response.status(404).json({ message: 'Ticket not found' });
    await ticket.gameDeal.init();
    const deal = ticket.gameDeal;
    if (!deal) return response.status(400).json({ message: 'Ticket has no deal' });
    return response.json(deal);
  }
}
