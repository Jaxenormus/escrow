import { lowerCase } from 'lodash';

import { PARTIES } from '@/context';

export default class Identities extends Map {
  public sender = this[PARTIES.SENDER];

  public receiver = this[PARTIES.RECEIVER];

  /**
   * The IDs of both parties.
   */
  public both: [string, string] = [null, null];

  /**
   * @param key The party of the user.
   * @param value - The user's ID.
   * @returns The Identities instance.
   */
  set(key: string, value: string): this {
    this[lowerCase(key)] = value;
    this.both = [this.sender, this.receiver];
    return this;
  }

  /**
   * Checks if both parties have been identified.
   * @returns boolean
   */
  valid(): boolean {
    return this.sender && this.receiver;
  }

  /**
   * Gets the ID of the party.
   * @param id The party of the user.
   * @returns The user's ID.
   */
  get(id: PARTIES) {
    return id === PARTIES.SENDER ? this.sender : this.receiver;
  }

  mention(who?: PARTIES) {
    if (who) return `<@${this.get(who)}>`;
    return this.both.map(c => `<@${c}>`).join(' ');
  }
}
