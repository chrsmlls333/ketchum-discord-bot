import type { Command } from '../types';
import help from './help';
import invite from './invite';
import download from './download';

const commands: Command[] = [ help, invite, download ];

export default commands;