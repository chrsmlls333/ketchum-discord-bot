import type { Command } from '../types';
import { helpCommand } from './help';
import { inviteCommand } from './invite';
import downloadCommand from './download';

const commands: Command[] = [ helpCommand, inviteCommand, downloadCommand ];

export default commands;