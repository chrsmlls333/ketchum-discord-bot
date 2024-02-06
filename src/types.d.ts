import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, Client, ClientEvents, Collection, Events, Message, ModalSubmitInteraction, PermissionResolvable, SlashCommandBuilder } from "discord.js"

export interface SlashCommand {
  command: SlashCommandBuilder,
  execute: (interaction : ChatInputCommandInteraction) => void,
  autocomplete?: (interaction: AutocompleteInteraction) => void,
  modal?: (interaction: ModalSubmitInteraction<CacheType>) => void,
  cooldown?: number // in seconds
}

export interface Command {
  name: string,
  aliases: Array<string>,
  cancelAliases?: Array<string>,
  description?: string,
  usage?: string,
  permissions?: Array<PermissionResolvable>,
  guildOnly?: boolean,
  args: boolean,
  cooldown?: number,
  execute: (message: Message, args: Array<string>) => void,
}

export interface BotEvent {
  name: keyof ClientEvents,
  load: (client: Client) => void
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string,
      APP_ID: string,
      PREFIX: string,
      ANONYMOUS: string,
    }
  }
}

declare module "discord.js" {
  export interface Client {
    slashCommands: Collection<string, SlashCommand>
    commands: Collection<string, Command>,
    cooldowns: Collection<string, number>
  }
}