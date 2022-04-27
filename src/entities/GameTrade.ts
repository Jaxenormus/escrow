import {
  BaseEntity,
  Cascade,
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';

import GameDeal from './GameDeal';

export enum TRADE_STATUS {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  PENDING = 'PENDING',
}

export interface AdoptMeItem {
  id: string;
  image_id: string;
  properties: {
    flyable: boolean;
    rideable: boolean;
    neon: boolean;
    mega_neon: boolean;
  };
}

export interface HoodModdedItem {
  name: string;
  type: 'stomp' | 'tag' | 'color' | 'unknown';
  properties?: {
    rotate: boolean;
    color: string;
  };
}

@Entity()
export default class GameTrade extends BaseEntity<GameTrade, 'id'> {
  @PrimaryKey()
  id: string;

  @Property({ type: 'json' })
  items: (HoodModdedItem | AdoptMeItem)[];

  @ManyToOne(() => GameDeal, { cascade: [Cascade.REMOVE] })
  deal: GameDeal;

  @Enum({ items: () => TRADE_STATUS, default: TRADE_STATUS.PENDING })
  status: TRADE_STATUS;

  @Property({ default: false })
  accepted: boolean;

  @Property({ default: false })
  declined: boolean;
}
