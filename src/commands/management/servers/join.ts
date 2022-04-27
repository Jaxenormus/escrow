/* eslint-disable no-await-in-loop */
import { ChatInputCommand, Command, container } from '@sapphire/framework';
import { Formatters } from 'discord.js';
import interval from 'interval-promise';

import { PLACE_IDS, TRADE_TYPES } from '@/context';
import Account from '@/entities/Account';
import Server from '@/entities/Server';
import handleGameJoin from '@/helpers/game/handleGameLaunch';

export default class JoinServersCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'join-servers',
      description: 'Handles the joining of servers for all game accounts',
      preconditions: ['AdminOnly'],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('type')
            .setRequired(true)
            .setDescription('The type of servers to join')
            .addChoices(
              { name: 'Adopt Me', value: TRADE_TYPES.ADOPT_ME },
              { name: 'Hood Modded', value: TRADE_TYPES.HOOD_MODDED }
            )
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const type = interaction.options.getString('type', true) as TRADE_TYPES;
    const accounts = await container.db.em.find(Account, { type, hasJoinedServer: false });
    if (accounts.length === 0) {
      await interaction.reply({ content: 'No accounts need to join servers', ephemeral: true });
    } else {
      await interaction.deferReply();
      let joinSuccesses = 0;
      // eslint-disable-next-line no-restricted-syntax, guard-for-in
      for (const accountId in accounts) {
        const account = accounts[accountId];
        if (account) {
          const message = await interaction.channel.send(
            `Joining server with ${Formatters.inlineCode(account.id)}`
          );
          const server = await container.db.em.findOne(Server, {
            type: account.type,
            account: { $exists: false },
          });
          if (server) {
            server.attemptingToJoin = true;
            await container.db.em.persistAndFlush(server);
            // eslint-disable-next-line no-param-reassign
            await message.edit(
              `Joining ${Formatters.inlineCode(server.id)} with ${Formatters.inlineCode(
                account.username
              )}`
            );
            await handleGameJoin(account.id, PLACE_IDS[account.type], server.id);
            const hasJoined = await new Promise(resolve => {
              interval(async (i, stop) => {
                if (i >= 12) {
                  server.attemptingToJoin = false;
                  await container.db.em.persistAndFlush(server);
                  stop();
                  resolve(false);
                }
                const updatedAcc = await container.db.em.findOne(Account, account.id);
                if (updatedAcc.hasJoinedServer) {
                  updatedAcc.server = server;
                  updatedAcc.server.attemptingToJoin = false;
                  await container.db.em.persistAndFlush(updatedAcc);
                  stop();
                  resolve(true);
                }
              }, 10_000);
            });
            if (hasJoined) {
              joinSuccesses += 1;
              await message.edit(
                `${Formatters.inlineCode(account.username)} has joined ${Formatters.inlineCode(
                  server.id
                )}`
              );
            } else {
              await message.edit(
                `${Formatters.inlineCode(
                  account.username
                )} was unable to join ${Formatters.inlineCode(server.id)}`
              );
            }
          } else {
            await message.edit(
              `No servers available for ${Formatters.inlineCode(account.username)}`
            );
          }
        }
      }
      await interaction.followUp({
        content: `Successfully joined ${Formatters.inlineCode(
          joinSuccesses.toString()
        )} server(s), failed to join ${Formatters.inlineCode(
          (accounts.length - joinSuccesses).toString()
        )} server(s)`,
        components: [],
      });
    }
  }
}
