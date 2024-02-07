import type { BotEvent } from '../types';
import clientReady from './clientReady';
import guildCreate from './guildCreate';
import messageCreate from './messageCreate';
import interactionCreate from './interactionCreate';

const events: BotEvent[] = [ clientReady, guildCreate, messageCreate, interactionCreate ];

export default events;