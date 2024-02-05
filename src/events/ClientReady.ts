import { Client, Events } from 'discord.js';
import { BotEvent } from '../types';

import logger from '../logger';
import utils from '../utils';

const event: BotEvent = {
  name: Events.ClientReady,
  load: (client: Client) => {
    client.once(Events.ClientReady, (readyClient) => {
      logger.info(`I am ready! Logged in as ${readyClient.user.tag}!`);
      logger.info(`Bot has started, with ${readyClient.users.cache.size} users, in ${readyClient.channels.cache.size} channels of ${readyClient.guilds.cache.size} guilds.`);

      // client.user.setActivity('the upright organ');
      const link = utils.generateInvite(readyClient);
      logger.info(`Generated bot invite link: ${link}`);
    });
  },
};

export default event;