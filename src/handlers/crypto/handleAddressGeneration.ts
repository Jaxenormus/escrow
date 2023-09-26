import type { Address } from "@prisma/client";
import { container } from "@sapphire/pieces";
import type { GuildTextBasedChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { Effect } from "effect";

import { EmbedColors } from "@/src/config";
import type { TradeMediums } from "@/src/config";
import type { ExpectedExecutionError } from "@/src/errors/ExpectedExecutionError";
import type { Identification } from "@/src/handlers/core/handleIdentification";
import { MessageService } from "@/src/helpers/services/Message";

export function handleAddressGeneration(
  channel: GuildTextBasedChannel,
  ids: Identification,
  medium: TradeMediums
): Effect.Effect<never, ExpectedExecutionError | Error, Address> {
  return Effect.gen(function* (_) {
    const disclaimer = yield* _(
      MessageService.send(channel, {
        content: ids.SENDER.mention,
        embeds: [
          new EmbedBuilder()
            .setTitle(`Generating a new ${medium} address`)
            .setDescription(
              `Standby while we generate a new ${medium} address for you to send the funds to. This may take a few seconds.`
            )
            .setColor(EmbedColors.Loading),
        ],
      })
    );
    const address = yield* _(container.api.crypto.newBotAddress(medium));
    yield* _(MessageService.delete(disclaimer));
    // yield* _(container.db.editTicket(channel, { address: { create: address } }));
    return address;
  });
}
