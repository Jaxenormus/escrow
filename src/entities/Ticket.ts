import { BaseEntity, Entity, Enum, ManyToOne, OneToOne, PrimaryKey } from '@mikro-orm/core';

import { TRADE_TYPES } from '@/context';

import Account from './Account';
import Address from './Address';
import GameDeal from './GameDeal';
import Server from './Server';

@Entity()
export default class Ticket extends BaseEntity<Ticket, 'id'> {
  @PrimaryKey()
  id!: string;

  @Enum(() => TRADE_TYPES)
  type: TRADE_TYPES;

  @ManyToOne(() => Account, { nullable: true })
  account?: Account;

  @ManyToOne(() => Server, { nullable: true })
  server?: Server;

  @OneToOne(() => Address, { orphanRemoval: true, nullable: true })
  address?: Address;

  @OneToOne(() => GameDeal, { orphanRemoval: true, nullable: true })
  gameDeal?: GameDeal;
}
