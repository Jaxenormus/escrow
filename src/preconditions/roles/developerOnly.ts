import type { Piece } from "@sapphire/framework";
import { AllFlowsPrecondition } from "@sapphire/framework";
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from "discord.js";

export default class DeveloperOnlyPrecondition extends AllFlowsPrecondition {
  public constructor(context: Piece.Context, options: AllFlowsPrecondition.Options) {
    super(context, {
      ...options,
      name: "DeveloperOnly",
    });
  }

  public override async messageRun(message: Message) {
    return this.checkDeveloper(message.author.id);
  }

  public override async chatInputRun(interaction: CommandInteraction) {
    return this.checkDeveloper(interaction.user.id);
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.checkDeveloper(interaction.user.id);
  }

  public async checkDeveloper(id: string) {
    return DeveloperOnlyPrecondition.isDeveloper(id)
      ? this.ok()
      : this.error({ message: "You do not have permission to use this command." });
  }

  static isDeveloper(id: string) {
    return ["1138627371965100063"].includes(id);
  }
}
