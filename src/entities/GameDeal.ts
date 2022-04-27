import {
  BaseEntity,
  Cascade,
  Collection,
  Entity,
  Enum,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';

import { GAME_TRADE_STATUSES } from '@/context';

import GameTrade from './GameTrade';
import Ticket from './Ticket';

@Entity()
export default class GameDeal extends BaseEntity<GameDeal, 'id'> {
  @PrimaryKey()
  id: string;

  @Enum({ items: () => GAME_TRADE_STATUSES, default: GAME_TRADE_STATUSES.WAITING_FOR_SENDER })
  status: GAME_TRADE_STATUSES;

  @Property()
  seller: string;

  @Property()
  buyer: string;

  @OneToMany(() => GameTrade, item => item.deal, { orphanRemoval: true, cascade: [Cascade.REMOVE] })
  trades = new Collection<GameTrade>(this);

  @OneToOne(() => Ticket, ticket => ticket.gameDeal, { orphanRemoval: true })
  ticket: Ticket;
}
