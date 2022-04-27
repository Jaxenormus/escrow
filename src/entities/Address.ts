import { BaseEntity, Entity, Enum, OneToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { TRADE_TYPES } from '@/context';

import Ticket from './Ticket';

@Entity()
export default class Address extends BaseEntity<Address, 'id'> {
  @PrimaryKey()
  id: string = v4();

  @Property()
  address!: string;

  @Property()
  privateKey: string;

  @Property({ nullable: true })
  wifKey?: string;

  @Enum(() => TRADE_TYPES)
  type: TRADE_TYPES;

  @OneToOne(() => Ticket, ticket => ticket.address, { orphanRemoval: true })
  ticket: Ticket;
}
