import { BaseEntity, Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';

import { TRADE_TYPES } from '@/context';

@Entity()
export default class Queue extends BaseEntity<Queue, 'id'> {
  @PrimaryKey()
  id!: string;

  @Enum(() => TRADE_TYPES)
  type: TRADE_TYPES;

  @Property()
  createdAt: Date = new Date();
}
