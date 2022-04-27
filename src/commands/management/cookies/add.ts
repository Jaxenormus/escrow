import { ChatInputCommand, Command, container } from '@sapphire/framework';
import axios from 'axios';
import { Formatters } from 'discord.js';
import { isNil } from 'lodash';

import { TRADE_TYPES } from '@/context';
import Account from '@/entities/Account';
import getProxyConfig from '@/helpers/shared/getProxyConfig';

export default class AddCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'add-account',
      description: 'Adds a new account to the bot',
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
            .setName('cookie')
            .setDescription('The cookie of the account to add')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('purpose')
            .setDescription('What the cookie is for')
            .setRequired(true)
            .addChoices(
              { name: 'Limiteds', value: TRADE_TYPES.LIMITEDS },
              { name: 'Adopt Me', value: TRADE_TYPES.ADOPT_ME },
              { name: 'Hood Modded', value: TRADE_TYPES.HOOD_MODDED }
            )
        )
        .addStringOption(option =>
          option.setName('secret').setDescription('The secret of the account to add')
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const cookie = interaction.options.getString('cookie', true);
    const secret = interaction.options.getString('secret');
    try {
      const userReq = await this.container.api.get(
        'https://users.roblox.com/v1/users/authenticated',
        {
          headers: {
            Cookie: `.ROBLOSECURITY=${cookie}`,
          },
        }
      );
      const { name, id } = userReq.data;
      const old = await this.container.db.em.findOne(Account, id.toString());
      const accounts = await this.container.db.em.find(
        Account,
        {},
        { orderBy: { proxyPort: 'DESC' } }
      );
      if (isNil(old) && isNil(secret)) {
        await interaction.reply({
          content: 'Secret is required for new accounts. Please try again with a secret',
          ephemeral: true,
        });
        return;
      }
      const account = await this.container.db.em.upsert(Account, {
        id: id.toString(),
        username: name,
        cookie,
        type: interaction.options.getString('purpose', true) as TRADE_TYPES,
        ...(isNil(secret) ? { secret: old.secret } : { secret }),
        ...(isNil(old)
          ? { proxyPort: (accounts.length === 0 ? 10000 : accounts[0].proxyPort) + 1 }
          : {}),
      });
      if (isNil(old)) {
        await axios('https://api.ipify.org', { proxy: getProxyConfig(account.proxyPort) });
      }
      await this.container.db.em.persistAndFlush(account);
      await interaction.reply({
        content: `${Formatters.inlineCode(name)} has successfully been ${
          isNil(old) ? 'added' : 'updated'
        }`,
        ephemeral: true,
      });
    } catch (e) {
      container.sentry.handleException(e);
      await interaction.reply({ content: 'The cookie provided is invalid', ephemeral: true });
    }
  }
}
