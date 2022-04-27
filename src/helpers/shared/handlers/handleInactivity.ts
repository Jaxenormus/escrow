import { DurationFormatter } from '@sapphire/time-utilities';
import dayjs from 'dayjs';
import { Formatters, MessageActionRow, MessageButton, TextBasedChannel } from 'discord.js';
import interval from 'interval-promise';

import Embed from '@/classes/Embed';
import { INTERACTIONS, RESPONSES, TRADE_EVENTS } from '@/context';

const TIME_TO_WAIT = 5 * 60 * 1000;
const TIME_TO_RESPOND = 1 * 60 * 1000;

export default async function handleInactivity(channel: TextBasedChannel) {
  const collector = channel.createMessageCollector({ filter: m => !m.author.bot });
  let lastMessage = new Date();
  let paused = false;
  let stopped = false;
  collector.on('collect', m => {
    lastMessage = m.createdAt;
  });
  process.on(channel.id, message => {
    if (message === TRADE_EVENTS.ITEMS_SECURED || message === TRADE_EVENTS.TERMINATED) {
      paused = true;
      stopped = true;
    }
  });
  await interval(async (_, stop) => {
    if (stopped) {
      stop();
      collector.stop();
    }
    if (!paused) {
      const time = dayjs().diff(lastMessage);
      if (time >= TIME_TO_WAIT) {
        const msg = await channel.send({
          embeds: [
            new Embed()
              .setTitle('Is this ticket inactive?')
              .setDescription(
                `This ticket has been inactive for ${new DurationFormatter().format(
                  time
                )}, would you like to close it?`
              )
              .setColor('RED'),
          ],
          components: [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId(INTERACTIONS.CONFIRMATIONS_CONFIRM_BUTTON)
                .setStyle('PRIMARY')
                .setLabel(RESPONSES.SIMPLE.CONFIRM),
              new MessageButton()
                .setCustomId(INTERACTIONS.CONFIRMATIONS_DENY_BUTTON)
                .setStyle('SECONDARY')
                .setLabel(RESPONSES.SIMPLE.DENY)
            ),
          ],
        });
        msg
          .createMessageComponentCollector({ max: 1, time: TIME_TO_RESPOND })
          .on('collect', async i => {
            if (i.isButton()) {
              await i.deferReply();
              if (i.customId === INTERACTIONS.CONFIRMATIONS_CONFIRM_BUTTON) {
                await i.editReply({
                  embeds: [
                    new Embed().setDescription(
                      `${Formatters.userMention(i.user.id)} has marked this ticket as inactive.`
                    ),
                  ],
                });
                if (!paused) await channel.send('$close');
                paused = true;
                stopped = true;
              } else {
                await i.editReply({
                  embeds: [
                    new Embed().setDescription(
                      `${Formatters.userMention(i.user.id)} has marked this ticket as active.`
                    ),
                  ],
                });
                lastMessage = new Date();
              }
            }
          })
          .on('end', async (__, reason) => {
            if (reason === 'time') {
              await msg.reply({
                embeds: [
                  new Embed()
                    .setDescription('No response was given, marking this ticket as inactive.')
                    .setColor('RED'),
                ],
              });
              paused = true;
              stopped = true;
              await channel.send('$close');
            }
          });
      }
    }
  }, TIME_TO_WAIT);
}
