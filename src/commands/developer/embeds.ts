/* eslint-disable no-await-in-loop */
import { ChatInputCommand, Command } from '@sapphire/framework';

import Embed from '@/classes/Embed';

export default class EmbedsCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: 'embeds',
      description: 'Sends multiple embeds',
      preconditions: ['AdminOnly'],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder.setName(this.name).setDescription(this.description)
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply();
    interaction.channel.send({
      embeds: [
        new Embed()
          .setTitle('Escrow - Cryptocurrency Services')
          .setDescription(
            'The following rules must be followed - failure to abide may result in an instant ban. Staff will have independent thresholds to what is deemed completely inappropriate.'
          )
          .setColor(6684511)
          .addFields(
            {
              name: 'Supported Currencies <:crypto:1137863802612875264>',
              value: 'Bitcoin, Ethereum & Litecoin',
            },
            { name: 'Service Fees :credit_card:', value: '**$0.00**' },
            {
              name: 'How does it work? <:ques:1137863807713148949>',
              value:
                "Simply press the 'Crypto Middleman' button below to create a ticket. We will ask you a series of questions in order for us to understand the deal.\n\n> What Cryptocurrency? (BTC|ETH|LTC)\n> Who are you dealing with? (dev id)\n> What is the type of deal? (Limiteds/Exchange etc)\n> How much USD should the bot receive?\n\nOnce we understand what the deal is regarding, we will create a payment invoice for the sender, once the payment has securely been received we will tell both users to exchange assets, or whatever the deal is regarding. Once the product has been delivered the funds can be released for the other dealer to claim.",
            },
            {
              name: 'Is this system safe? :shield:',
              value:
                'This system is **100% secure**, we ensure every ticket has its own unique wallet to avoid any confliction. All wallet private keys are encrypted and securely stored, they are backed up and can be accessed if needed.',
            }
          )
          .setImage(
            'https://cdn.discordapp.com/attachments/1095363097113399376/1095363463095795832/crypto.gif'
          ),
      ],
    });
    interaction.channel.send({
      embeds: [
        new Embed()
          .setTitle('Escrow - Limiteds Middleman Service')
          .setDescription(
            'The subsequent guidelines must be adhered to; non-compliance could lead to an immediate ban. Staff members possess individual discretion in determining what is considered wholly unacceptable.'
          )
          .setColor(6684511)
          .addFields(
            { name: 'Service Fees', value: '**$0.00**' },
            {
              name: 'How does it work?',
              value:
                'Press the **Limiteds Middleman** button below. Upon the ticket opening, follow the steps the bot provides as follows:\n\n>>> 1. Who are you dealing with?\n2. Specify whether you are buying or selling the item\n3. Seller sends the trade to our ROBLOX Middleman account\n4.  Both dealers confirm items involved in trade\n5. Buyer pays for item\n6. Seller releases item\n7. Buyer gives username\n8. Buyer claims item',
            },
            {
              name: 'Is this service safe?',
              value:
                'This service has been in development for a year now, It has been cross-checked for any possible exploits with every released update. We have had over 10,000 deals using this system.',
            }
          )
          .setImage(
            'https://media.discordapp.net/attachments/1095363097113399376/1095363463557165226/limiteds.gif'
          ),
      ],
    });
    interaction.channel.send({
      embeds: [
        new Embed()
          .setTitle('Escrow - Adopt Me Services')
          .setDescription(
            'The subsequent guidelines must be adhered to; non-compliance could lead to an immediate ban. Staff members possess individual discretion in determining what is considered wholly unacceptable.'
          )
          .setColor(6684511)
          .addFields(
            { name: 'Service Fees', value: '**$0.00**' },
            {
              name: 'How does it work?',
              value:
                'Press the **Adopt Me Middleman** button below. Upon the ticket opening, follow the steps the bot provides as follows:\n\n>>> 1. Who are you dealing with?\n2. Specify whether you are sending or receiving the item\n3. Sender will be prompted to join private server\n4. Sender follows steps in game to send the bot the items\n5. Seller will type a command in game once all items have been sent, both sender and receiver will confirm the items are correct in discord\n6. Receiver provides his side of the deal to sender\n7. Sender releases items\n8. Receiver joins private server and claims item',
            },
            {
              name: 'Is this service safe?',
              value:
                'This service has been in development for a year now. It has been cross-checked for any possible exploits with every released update. We have had over 10,000 deals using this system.',
            }
          )
          .setImage(
            'https://media.discordapp.net/attachments/1095363097113399376/1095363462646988921/adopt.gif'
          ),
      ],
    });
    interaction.channel.send({
      embeds: [
        new Embed()
          .setTitle('Escrow - Hood Modded Services')
          .setDescription(
            'The subsequent guidelines must be adhered to; non-compliance could lead to an immediate ban. Staff members possess individual discretion in determining what is considered wholly unacceptable.'
          )
          .setColor(6684511)
          .addFields(
            { name: 'Service Fees', value: '**$0.00**' },
            {
              name: 'How does it work?',
              value:
                'Press the **Hood Modded Middleman** button below Upon the ticket opening, follow the steps the bot provides as follows:\n\n>>> 1. Who are you dealing with?\n2. Specify whether you are sending or receiving the item\n3. Sender will be prompted to join private server\n4. Sender follows steps in game to send the bot the items\n5. Seller will type a command in game once all items have been sent, both sender and receiver will confirm the items are correct in discord\n6. Receiver provides his side of the deal to sender\n7. Sender releases items\n8. Receiver joins private server and claims item',
            },
            {
              name: 'Is this service safe?',
              value:
                'This service has been in development for a year now. It has been cross-checked for any possible exploits with every released update. We have had over 10,000 deals using this system.',
            }
          )
          .setImage(
            'https://cdn.discordapp.com/attachments/1095363097113399376/1095363462043021322/hoodmodded.gif'
          ),
      ],
    });
    interaction.channel.send({
      embeds: [
        new Embed()
          .setTitle('Escrow - Roles Info')
          .setColor(1373284)
          .setDescription(
            `Roles you can earn in our discord.\n\n<@&${process.env.CLIENT_ROLE_ID}> - Complete a deal with our service\n<@&${process.env.LUCKY_ROLE_ID}> - Receive the client role, and get lucky in <#${process.env.LUCKY_CHANNEL_ID}>\n<@&${process.env.TOP_CLIENT_ROLE_ID}> - Send/Receive **5M** in limiteds or **10k** in crypto\n<@&${process.env.RICH_CLIENT_ROLE_ID}> - Send/Receive 10M in limiteds or **20k** in crypto\n<@&${process.env.PREMIER_CLIENT_ROLE_ID}> - Send/Receive **25M** in limiteds or **50k** in crypto`
          ),
      ],
    });
    interaction.channel.send({
      embeds: [
        new Embed()
          .setTitle('Terms of Service')
          .setDescription(
            'When using our service you accept the Discord ToS `(https://discord.com/terms)` and the the terms of service listed below:'
          )
          .setColor(129373)
          .addFields([
            {
              name: 'User Liability',
              value:
                'While you are using our bot, you are responsible to read each and every bot message thoroughly. This means, user error, is not insured, and will result in the loss of your items/crypto.',
            },
            {
              name: 'Account Terminations',
              value:
                'Sometimes, the unfortunate circumstance may arise that our bot account gets terminated/shadowbanned while it is holding your limiteds. Unfortunately, these situations will not be compensated by us.',
            },
            {
              name: 'User Guarantee',
              value:
                'Using our service, you should feel confident in the safety of your funds. This is why while your funds are in our possession, they will be compensated 1:1 if lost because of a middleman/bot error not caused by user error.',
            },
            {
              name: 'Account Security',
              value:
                'When using our services, your discord account is to be in a secure state, with nobody having access to it. Your middleman interaction may be compromised if a 3rd party has access to your discord account.',
            },
          ]),
      ],
    });
    interaction.channel.send({
      embeds: [
        new Embed()
          .setTitle('Escrow Middleman Service')
          .setColor(1373284)
          .addFields([
            {
              name: 'What is this? 🤔',
              value:
                '**Escrow** is a fully automatic middleman service designed to be impenetrable and **100% safe**. Our middleman process is fully automated and supports a variety of different services. Manual intervention is only required when a disagreement arises between dealers.',
            },
            {
              name: 'Why should you trust us? <:admin:1057053461130252310>',
              value: `Since our inception  <t:1659679320:R> we have always aimed to provide a safe and secure service. With thousands of clients and millions of dollars worth of completed deals, every client we have ever had has been satisfied. Check out what our clients have to say in <#${process.env.VOUCH_CHANNEL_ID}>`,
            },
            {
              name: 'How much does it cost? 💳',
              value: 'As of right now, our service is entirely **free**',
            },
          ])
          .setImage(
            'https://cdn.discordapp.com/attachments/1035941590000218187/1059368297809850408/GG-Draco.gif'
          ),
      ],
    });
  }
}
