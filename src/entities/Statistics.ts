import { BaseEntity, Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export default class Statistics extends BaseEntity<Statistics, 'id'> {
  @PrimaryKey()
  id!: string;

  @Property({ default: 0 })
  cryptoCount: number;

  @Property({ default: 0 })
  cryptoSent: number;

  @Property({ default: 0 })
  cryptoReceived: number;

  @Property({ default: 0 })
  limitedsCount: number;

  @Property({ default: 0 })
  limitedsSent: number;

  @Property({ default: 0 })
  limitedsReceived: number;

  @Property({ default: 0 })
  adpCount: number;

  @Property({ default: 0 })
  adpSent: number;

  @Property({ default: 0 })
  adpReceived: number;

  @Property({ default: 0 })
  hoodModdedCount: number;

  @Property({ default: 0 })
  hoodModdedSent: number;

  @Property({ default: 0 })
  hoodModdedReceived: number;
}
