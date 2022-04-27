import { AllFlowsPrecondition, Piece } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuInteraction, Message } from 'discord.js';

export default class AdminOnlyPrecondition extends AllFlowsPrecondition {
  public constructor(context: Piece.Context, options: AllFlowsPrecondition.Options) {
    super(context, {
      ...options,
      name: 'AdminOnly',
    });
  }

  public override async messageRun(message: Message) {
    return this.checkAdmin(message.author.id);
  }

  public override async chatInputRun(interaction: CommandInteraction) {
    return this.checkAdmin(interaction.user.id);
  }

  public override async contextMenuRun(interaction: ContextMenuInteraction) {
    return this.checkAdmin(interaction.user.id);
  }

  public async checkAdmin(id: string) {
    return AdminOnlyPrecondition.isAdmin(id)
      ? this.ok()
      : this.error({ message: 'You do not have permission to use this command.' });
  }

  static isAdmin(id: string): boolean {
    return ['978373060447051837', '1136480592175841421', '1137545470625976481'].includes(id);
  }
}
