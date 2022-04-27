import { BaseEntity, Entity, Enum, OneToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { TRADE_TYPES } from '@/context';

import Account from './Account';

@Entity()
export default class Server extends BaseEntity<Server, 'id'> {
  @PrimaryKey()
  id!: string;

  @Property()
  placeId: string;

  @Property()
  attemptingToJoin: boolean;

  @Enum(() => TRADE_TYPES)
  type: TRADE_TYPES;

  @OneToOne(() => Account, { onDelete: 'set null', nullable: true })
  account?: Account;
}
