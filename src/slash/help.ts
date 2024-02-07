import { APIApplicationCommandOptionChoice, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { buildCommandHelpEmbed, buildGenericHelpEmbed, buildSlashCommandHelpEmbed, helpCommand } from "../commands/help";
import { checkPrefix } from "../utils";
const prefix = checkPrefix();

import commands from '../commands';

export const helpSlashCommand: SlashCommand = {

  command: new SlashCommandBuilder()
    .setName(helpCommand.name)
    .setDescription(helpCommand.description || '')
    .addStringOption(option => {
      // make custom slashCommand array to thwart circular dependency
      // TODO: replace this with autocomplete choices
      const slashCommands: SlashCommand[] = [
      ]
      const commandNameChoices: APIApplicationCommandOptionChoice<string>[] = [
        commands.map(c => prefix + c.name),
        slashCommands.map(c => '/' + c.command.name),
        '/help' // manually add this help command
      ].flat().map(s => ({ name: s, value: s }));
      return option
        .setName('command')
        .setDescription('The command to get help for')
        .setRequired(false)
        .addChoices(...commandNameChoices)
    }),

  execute: async (interaction) => {
    const { commands, slashCommands } = interaction.client;
    const name = interaction.options.getString('command');

    if (!name) {
      const embed = buildGenericHelpEmbed(interaction.client);
      return interaction.reply({ embeds: [embed] });
    }

    if (name.startsWith(prefix)) {
      const command = commands.get(name.slice(prefix.length)) || 
        commands.find(c => c.aliases && c.aliases.includes(name.slice(prefix.length)));
      if (!command) return interaction.reply({ content: 'that\'s not a valid command!', ephemeral: true });
      const embed = buildCommandHelpEmbed(interaction.client, command);
      return interaction.reply({ embeds: [embed] });
    }

    if (name.startsWith('/')) {
      const command = slashCommands.get(name.slice(1));
      if (!command) return interaction.reply({ content: 'that\'s not a valid slash command!', ephemeral: true });
      const embed = buildSlashCommandHelpEmbed(interaction.client, command);
      return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply({ content: 'that\'s not a valid command!', ephemeral: true });
  }
};