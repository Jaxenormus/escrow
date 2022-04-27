import { type ApiRequest, type ApiResponse, methods, Route } from '@sapphire/plugin-api';
import { z } from 'zod';

import GameDeal from '@/entities/GameDeal';
import GameTrade from '@/entities/GameTrade';

export default class FindTradeRoute extends Route {
  public constructor(context: Route.Context, options: Route.Options) {
    super(context, {
      ...options,
      route: 'game/deal/:tid/trade',
    });
  }

  public async [methods.POST](_request: ApiRequest, response: ApiResponse) {
    const params = z.object({ tid: z.string() }).parse(_request.params);
    const body = z.object({ id: z.string(), items: z.array(z.any()) }).parse(_request.body);
    const deal = await this.container.db.em.findOne(GameDeal, params.tid);
    if (!deal) return response.status(404).json({ message: 'Deal not found' });
    const trade = this.container.db.em.create(GameTrade, {
      id: body.id,
      deal: { id: deal.id },
      items: body.items,
    });
    await this.container.db.em.persistAndFlush(trade);
    return response.json(trade);
  }
}
