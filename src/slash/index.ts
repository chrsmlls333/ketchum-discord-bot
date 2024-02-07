import type { SlashCommand } from '../types';
import { helpSlashCommand } from './help';
import { inviteSlashCommand } from './invite';

const slashCommands: SlashCommand[] = [ helpSlashCommand, inviteSlashCommand ];

export default slashCommands;