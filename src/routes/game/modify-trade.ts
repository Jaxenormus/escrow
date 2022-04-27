import { type ApiRequest, type ApiResponse, methods, Route } from '@sapphire/plugin-api';
import { z } from 'zod';

import GameTrade, { TRADE_STATUS } from '@/entities/GameTrade';

export default class ModifyTradeRoute extends Route {
  public constructor(context: Route.Context, options: Route.Options) {
    super(context, {
      ...options,
      route: 'game/deal/:tid/trade/:tradeId',
    });
  }

  public async [methods.PATCH](_request: ApiRequest, response: ApiResponse) {
    const params = z.object({ tid: z.string(), tradeId: z.string() }).parse(_request.params);
    const body = z.object({ status: z.nativeEnum(TRADE_STATUS) }).parse(_request.body);
    const trade = await this.container.db.em.findOne(GameTrade, {
      id: params.tradeId,
      deal: { ticket: { id: params.tid } },
    });
    if (!trade) return response.status(404).json({ message: 'Trade not found' });
    trade.accepted = body.status === TRADE_STATUS.ACCEPTED;
    trade.declined = body.status === TRADE_STATUS.DECLINED;
    await this.container.db.em.persistAndFlush(trade);
    return response.json(trade);
  }
}
