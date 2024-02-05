import { ChannelType, Client, Events } from 'discord.js';
import { BotEvent } from '../types';

import logger from '../logger';
import utils from '../utils';

const event: BotEvent = {
  name: Events.MessageCreate,
  load: (client: Client) => {
    client.on(Events.MessageCreate, async message => {

      // Check message for basic validity
      if (!message.member || message.member.user.bot) return;
      if (!message.guild) return;
      const prefix = utils.checkPrefix();
      if (!message.content.startsWith(prefix)) return;
      if (message.channel.type !== ChannelType.GuildText) return;

      // TODO: re-add DM capability

      // Parse command
      const args = message.content.slice(prefix.length).split(/ +/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) return;
      let command = client.commands.get(commandName);
      if (!command) {
        command = client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      }
      if (!command) return;

      // Log received command!
      logger.debug(`${message.guild.name} #${message.channel.name}: '${message.content}'`);

      if (command.guildOnly && message.channel.type !== ChannelType.GuildText) {
        message.reply({ content: 'I can\'t execute that command outside a Guild!', ...utils.doNotNotifyReply });
        return;
      }

      // Handle no args
      if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author.username}!`;
        if (command.usage) reply += `\nThe proper usage would be: \`${prefix}${command.name}${command.usage ? ` ${command.usage}` : ''}\``;
        message.reply({ content: reply, ...utils.doNotNotifyReply });
        return;
      }

      // TODO: Handle permissions

      // TODO Handle cooldowns
      // https://github.com/MericcaN41/discordjs-v14-template-ts/blob/main/src/events/messageCreate.ts


      // Finally execute command
      try {
        logger.debug('Execute!');
        await command.execute(message, args);
      } catch (error) {
        // if (error.message) logger.error(error.message);
        logger.error(error.stack);
        const defaultErrorMessage = 'there was an error trying to execute that command!';
        await message.reply({
          content: `${error.name}: ${error.message ? error.message : defaultErrorMessage}`,
          ...utils.doNotNotifyReply,
        });
      }

      // TODO: standardize the catch block

    });
  },
};

export default event;