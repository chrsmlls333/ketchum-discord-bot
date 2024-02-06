import { Client } from 'discord.js';
import events from '../events';
import logger from '../logger';

export default (client: Client) => {

  events.forEach(event => {
    event.load(client);
    logger.info(`Loaded event: ${event.name}`);
  });

};