import { type ApiRequest, type ApiResponse, methods, Route } from '@sapphire/plugin-api';
import { z } from 'zod';

import { GAME_TRADE_STATUSES } from '@/context';
import GameDeal from '@/entities/GameDeal';

export default class ModifyDealRoute extends Route {
  public constructor(context: Route.Context, options: Route.Options) {
    super(context, {
      ...options,
      route: 'game/deal/:tid',
    });
  }

  public async [methods.PATCH](_request: ApiRequest, response: ApiResponse) {
    const params = z.object({ tid: z.string() }).parse(_request.params);
    const body = z.object({ status: z.nativeEnum(GAME_TRADE_STATUSES) }).parse(_request.body);
    const deal = await this.container.db.em.findOne(GameDeal, { id: params.tid });
    if (!deal) return response.status(404).json({ message: 'Deal not found' });
    deal.status = body.status;
    const newData = await this.container.db.em.persistAndFlush(deal);
    return response.json(newData);
  }
}
