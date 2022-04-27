import {
  BaseEntity,
  Collection,
  Entity,
  Enum,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';

import { TRADE_TYPES } from '@/context';

import Server from './Server';
import Ticket from './Ticket';

@Entity()
export default class Account extends BaseEntity<Account, 'id'> {
  @PrimaryKey()
  id!: string;

  @Property({ default: 'Unknown' })
  username: string;

  @Property({ type: 'text' })
  cookie: string;

  @Property()
  secret: string;

  @Property({ default: 10000 })
  proxyPort: number;

  @Enum(() => TRADE_TYPES)
  type: TRADE_TYPES;

  @OneToMany(() => Ticket, ticket => ticket.account)
  tickets = new Collection<Ticket>(this);

  @OneToOne(() => Server, server => server.account, { onDelete: 'set null', nullable: true })
  server?: Server;

  @Property({ default: false })
  hasJoinedServer: boolean;
}
