import type { Piece } from "@sapphire/framework";
import { AllFlowsPrecondition } from "@sapphire/framework";
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from "discord.js";

export default class AdminOnlyPrecondition extends AllFlowsPrecondition {
  public constructor(context: Piece.Context, options: AllFlowsPrecondition.Options) {
    super(context, {
      ...options,
      name: "AdminOnly",
    });
  }

  public override async messageRun(message: Message) {
    return this.checkAdmin(message.author.id);
  }

  public override async chatInputRun(interaction: CommandInteraction) {
    return this.checkAdmin(interaction.user.id);
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.checkAdmin(interaction.user.id);
  }

  public async checkAdmin(id: string) {
    return AdminOnlyPrecondition.isAdmin(id)
      ? this.ok()
      : this.error({ message: "You do not have permission to use this command." });
  }

  static isAdmin(id: string): boolean {
    return ["1138627371965100063"].includes(id);
  }
}
