import { type ApiRequest, type ApiResponse, methods, Route } from '@sapphire/plugin-api';
import { z } from 'zod';

import GameTrade from '@/entities/GameTrade';

export default class FindTradeRoute extends Route {
  public constructor(context: Route.Context, options: Route.Options) {
    super(context, {
      ...options,
      route: 'game/deal/:tid/trade/:tradeId',
    });
  }

  public async [methods.GET](_request: ApiRequest, response: ApiResponse) {
    const params = z.object({ tid: z.string(), tradeId: z.string() }).parse(_request.params);
    const trade = await this.container.db.em.findOne(GameTrade, {
      id: params.tradeId,
      deal: { id: params.tid },
    });
    if (!trade) return response.status(404).json({ message: 'Trade not found' });
    return response.json(trade);
  }
}
