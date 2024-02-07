import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { buildInviteEmbed } from "../commands/invite";


export const inviteSlashCommand: SlashCommand = {

  command: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the invite link for the bot.'),

  execute: async (interaction) => {
    const embed = buildInviteEmbed(interaction.client);
    return interaction.reply({ embeds: [embed] });
  },
  
};