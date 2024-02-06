import { Client, REST, Routes } from 'discord.js';
import logger from '../logger';

import CommandImports from '../commands';
import SlashCommandImports from '../slash';

export default (client: Client) => {
  logger.info('Registering commands...');

  CommandImports.forEach(item => {
    client.commands.set(item.name, item);
    logger.debug(`Loaded message command: ${item.name}`);
  });
  logger.info(`Loaded ${client.commands.size} message command(s)`);

  SlashCommandImports.forEach(item => {
    client.slashCommands.set(item.command.name, item);
    logger.debug(`Loaded slash command: ${item.command.name}`);
  });
  logger.info(`Loaded ${client.slashCommands.size} slash command(s)`);

  // Register commands with Discord
  if (client.slashCommands.size) {
    const rest = new REST().setToken(process.env.BOT_TOKEN);
    (async () => {
      try {
        logger.info('Started refreshing application (/) commands with Discord.');

        await rest.put(
          Routes.applicationCommands(process.env.APP_ID),
          { body: SlashCommandImports.map(sc => sc.command.toJSON()) },
        );

        logger.info('Successfully reloaded application (/) commands with Discord.');
      } catch (error) {
        logger.error(error);
      }

    })();
  }
};