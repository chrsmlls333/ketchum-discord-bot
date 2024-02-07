import { Client } from "discord.js";
import type { Command } from "../types";
import { embedTemplate, generateInvite } from "../utils";


export const inviteCommand: Command = {

  name: 'invite',
  aliases: ['getinvite'],

  description: 'Get a link for inviting this bot to another server you have Manage Server permissions on...',
  
  guildOnly: false,

  args: false,
  usage: undefined,

  execute(message) {
    const embed = buildInviteEmbed(message.client);
    return message.channel.send({ embeds: [embed] });
  },
};

export function buildInviteEmbed(client: Client<true>) {
  const link = generateInvite(client);
  const embed = embedTemplate(client)
    .setTitle(`Invite ${client.user.username} to other servers!`)
    .setURL(link);
  return embed;
}