import { ChatInputCommand, Command } from '@sapphire/framework';
import { Formatters } from 'discord.js';
import humanFormat from 'human-format';

import Embed from '@/classes/Embed';
import Statistics from '@/entities/Statistics';

export default class StatsCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'stats',
      description: 'View all client statistics',
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(option =>
          option.setName('user').setDescription('The user to view stats for').setRequired(false)
        )
    );
  }

  private format(number: number, type: 'crypto' | 'limiteds' = 'limiteds') {
    return humanFormat(number, {
      // eslint-disable-next-line no-nested-ternary
      maxDecimals: type === 'limiteds' ? (number >= 1000000 ? 'auto' : 0) : 2,
      ...(type === 'crypto' ? { decimals: 2 } : {}),
      separator: '',
    });
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const user = interaction.options.getUser('user', false) ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const statistics = await this.container.db.em.findOne(Statistics, user.id);
    if (!statistics) {
      await interaction.reply({ content: 'This user has no statistics', ephemeral: true });
      return;
    }
    const embed = new Embed()
      .setTitle(`${user.tag}'s Statistics`)
      .addFields([
        {
          name: 'Roles',
          value:
            member.roles.cache.size <= 1
              ? 'No Roles'
              : member.roles.cache
                  .filter(role => role.id !== role.guild.id)
                  .map(({ id }) => Formatters.roleMention(id))
                  .join(' '),
        },
        {
          name: 'Limiteds',
          value: `Completed: **${this.format(
            statistics.limitedsCount
          )}**\nTotal Bought: **${this.format(
            statistics.limitedsReceived
          )}**\nTotal Sold: **${this.format(statistics.limitedsSent)}**`,
        },
        {
          name: 'Crypto',
          value: `Completed: **${this.format(
            statistics.cryptoCount
          )}**\nTotal Sent: **$${this.format(
            statistics.cryptoSent,
            'crypto'
          )}**\nTotal Received: **$${this.format(statistics.cryptoReceived, 'crypto')}**`,
        },
        {
          name: 'Adopt Me',
          value: `Completed: **${this.format(statistics.adpCount)}**\nTotal Bought: **${this.format(
            statistics.adpReceived
          )}**\nTotal Sold: **${this.format(statistics.adpSent)}**`,
        },
      ])
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));
    interaction.reply({ embeds: [embed] });
  }
}
