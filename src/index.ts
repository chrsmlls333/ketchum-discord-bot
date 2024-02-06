import 'dotenv/config';

// TODO: Add a check for the .env file

import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
const client = new Client({
  intents: [
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [
    // handle DMs
    Partials.Channel,
  ],
});

import logger from './logger';

import { checkAnonymous, checkPrefix } from './utils';
const anonymous = checkAnonymous();
if (anonymous) logger.info('Running anonymously...');
const prefix = checkPrefix();
logger.info(`Using prefix: ${prefix}`);

// discord.js recommends polluting client namespace with "global" collections
import { Command, SlashCommand } from './types';
client.slashCommands = new Collection<string, SlashCommand>();
client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, number>();

import handlers from './handlers';
handlers.forEach(handler => handler.default(client));


client.login(process.env.BOT_TOKEN);


// // client.on("debug", function(info){
// //   console.log(`debug -> ${info}`);
// // });

// client.on('disconnect', (event) => {
//   logger.info(`The WebSocket has closed and will no longer attempt to reconnect: ${event}`);
// });

// client.on('error', (error) => {
//   logger.error(`client's WebSocket encountered a connection error: ${error}`);
// });

// client.on('warn', (info) => {
//   logger.warn(`warn: ${info}`);
// });