import { ChatInputCommand, Command } from '@sapphire/framework';
import humanFormat from 'human-format';
import { startCase } from 'lodash';

import Embed from '@/classes/Embed';
import { TRADE_TYPES } from '@/context';
import Statistics from '@/entities/Statistics';

export default class LeaderboardCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'leaderboard',
      description: 'View the top 10 clients in crypto and limiteds trades',
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
            .setDescription('The type of leaderboard to display')
            .setRequired(true)
            .addChoices(
              { name: 'crypto', value: TRADE_TYPES.CRYPTO },
              { name: 'limiteds', value: TRADE_TYPES.LIMITEDS },
              { name: 'adopt me', value: TRADE_TYPES.ADOPT_ME }
            )
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const type = interaction.options.getString('type', true) as TRADE_TYPES;
    const statistics = await this.container.db.em.find(Statistics, {});
    const members = await interaction.guild.members.fetch();
    const stats = new Map<string, number>();
    // eslint-disable-next-line no-restricted-syntax
    for (const member of members.values()) {
      const data = statistics.find(stat => stat.id === member.id);
      if (data) {
        const sent =
          // eslint-disable-next-line no-nested-ternary
          type === TRADE_TYPES.CRYPTO
            ? data.cryptoSent
            : type === TRADE_TYPES.LIMITEDS
            ? data.limitedsSent
            : data.adpSent;
        const received =
          // eslint-disable-next-line no-nested-ternary
          type === TRADE_TYPES.CRYPTO
            ? data.cryptoReceived
            : type === TRADE_TYPES.LIMITEDS
            ? data.limitedsReceived
            : data.adpReceived;
        const total = sent + received;
        if (total > 0) stats.set(member.id, total);
      }
    }
    const sorted = new Map([...stats.entries()].sort((a, b) => b[1] - a[1]));
    const top = [...sorted.entries()].slice(0, 10);
    const name = type.toLowerCase().split('_').join(' ');
    const embed = new Embed().setTitle(`${startCase(name)} Leaderboard`).setDescription(
      top
        .map(
          (entry, index) =>
            `${index + 1}. <@${entry[0]}> | **${
              type === TRADE_TYPES.CRYPTO ? '$' : ''
            }${humanFormat(entry[1], {
              ...(type === TRADE_TYPES.CRYPTO ? { decimals: 2 } : {}),
              ...(type !== TRADE_TYPES.CRYPTO
                ? { maxDecimals: entry[1] >= 1000000 ? 'auto' : 0 }
                : {}),
              separator: '',
            })}**`
        )
        .join('\n')
    );
    return interaction.reply({ embeds: [embed] });
  }
}
