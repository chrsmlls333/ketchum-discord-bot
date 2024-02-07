import type { APIEmbedField, Client, RestOrArray } from "discord.js";
import type { Command, SlashCommand } from "../types";
import { checkPrefix, embedTemplate, doNotNotifyReply, titleCase } from "../utils";
const prefix = checkPrefix();


export const helpCommand: Command = {

  name: 'help',
  aliases: ['h', 'commands'],

  description: 'List all of my commands or info about a specific command.',
  
  guildOnly: false,

  args: false,
  usage: '[command name or alias]',

  execute(message, args) {

    const { commands, slashCommands } = message.client;

    // Simple help command
    if (!args.length) {
      const embed = buildGenericHelpEmbed(message.client);
      return message.channel.send({ embeds: [embed] });
    }

    // Parse command name
    let name = args[0].toLowerCase();

    // Find command, check if it's a message command or a slash command using the prefix or / character, or no prefix at all
    // if no prefix, check if name matches a message command, alias, or slash command lastly

    if (commands.has(name) || commands.find(c => c.aliases && c.aliases.includes(name))) name = prefix + name;
    if (name.startsWith(prefix)) {
      const command = commands.get(name.slice(prefix.length)) || 
        commands.find(c => c.aliases && c.aliases.includes(name.slice(prefix.length)));
      if (!command) return message.reply({ content: 'that\'s not a valid command!', ...doNotNotifyReply });
      const embed = buildCommandHelpEmbed(message.client, command);
      return message.channel.send({ embeds: [embed] });
    }

    if (slashCommands.has(name)) name = '/' + name;
    if (name.startsWith('/')) {
      const command = slashCommands.get(name.slice(1));
      if (!command) return message.reply({ content: 'that\'s not a valid slash command!', ...doNotNotifyReply });
      const embed = buildSlashCommandHelpEmbed(message.client, command);
      return message.channel.send({ embeds: [embed] });
    }

    // return error if no command found
    return message.reply({ content: 'that\'s not a valid command!', ...doNotNotifyReply });
  },
};

export function buildGenericHelpEmbed(client: Client<true>) {
  const { commands, slashCommands } = client;

  const msgCommandList = commands
    .map(c => (
      `- ${prefix}${c.name}` + 
      (c.aliases.length ? 
      ` ( ${c.aliases.map(a => prefix + a).join(', ')} )` 
      : '')
    ))
    .join('\n');

  const slashCommandList = slashCommands
    .map(command => "- " + '/' + command.command.name)
    .join('\n');

  return embedTemplate(client)
    .setTitle('Here are all of my commands...')
    .addFields(
      { name: 'Message Commands', value: msgCommandList },
      { name: 'Slash Commands', value: slashCommandList },
      // { name: '\u200B', value: '\u200B' },
      { name: 'Learn More', value: `\nYou can send \`${prefix}help [command name]\` to get info on a specific command!` },
    );
}

export function buildCommandHelpEmbed(client: Client<true>, command: Command) {
  const fields = [
    { name: 'Command Name', value: `${prefix}${command.name}`, inline: true },
    command.aliases.length > 0 &&
    { name: 'Aliases', value: `${command.aliases.map(a => prefix + a).join(', ')}`, inline: true },
    command.cancelAliases &&
    { name: 'Cancel With', value: `${command.cancelAliases ? command.cancelAliases.map(a => prefix + a).join(', ') : 'none'}`, inline: true },
    command.description &&
    { name: 'Description', value: `${command.description}` },
    command.usage &&
    { name: 'Usage', value: `${prefix}${command.name} ${command.usage}`, inline: true },
    { name: 'Arguments Required?', value: titleCase(command.args.toString()), inline: true },
    // { name: 'Cooldown', value: `${command.cooldown || 3} second(s)`, inline: true },
  ].filter(f => f) as RestOrArray<APIEmbedField>;

  return embedTemplate(client)
    .setTitle(titleCase(command.name))
    .addFields(...fields);
}

export function buildSlashCommandHelpEmbed(client: Client<true>, command: SlashCommand) {
  const fields = [
    { name: 'Command Name', value: `/${command.command.name}`, inline: true },
    command.command.description &&
    { name: 'Description', value: `${command.command.description}` },
    command.command.options &&
    { name: 'Options', value: `${command.command.options.map(o => (o as any).name ?? '').join(', ')}`, inline: true },
    // { name: 'Cooldown', value: `${command.cooldown || 3} second(s)`, inline: true },
    // { name: 'Learn More', value: `This is integrated into your server's '/' commands list.` },
  ].filter(f => f) as RestOrArray<APIEmbedField>;

  return embedTemplate(client)
    .setTitle(titleCase(command.command.name))
    .addFields(...fields);
}
