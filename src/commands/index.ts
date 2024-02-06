import type { Command } from '../types';
import help from './help';
import invite from './invite';

const commands: Command[] = [ help, invite ];

export default commands;