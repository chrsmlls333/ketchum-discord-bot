import { Client, Events } from 'discord.js';
import { BotEvent } from '../types';

import logger from '../logger';
import { checkPrefix, embedTemplate } from '../utils';


const guildCreate: BotEvent = {
  name: Events.GuildCreate,
  load: (client: Client) => {
    client.on(Events.GuildCreate, guild => {
      // TODO add guild to database
      logger.info(`Joined guild: ${guild.name} (${guild.id})`);

      const prefix = checkPrefix();
      const embed = embedTemplate(guild.client)
        .setTitle('Thanks for adding me to your server!')
        .setDescription(`I'm a downloader bot which can pull attachments and embeds into a big list to download later. \n\nFor a list of commands, send \`${prefix}help [command name]\` here or in your server!`);
      guild.fetchOwner()
        .then(member => member.send({ embeds: [embed] }));
    });
  },
};

export default guildCreate;