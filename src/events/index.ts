import type { BotEvent } from '../types';
import clientReady from './clientReady';
import guildCreate from './guildCreate';
import messageCreate from './messageCreate';

const events: BotEvent[] = [ clientReady, guildCreate, messageCreate ];

export default events;