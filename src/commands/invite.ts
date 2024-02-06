import type { Command } from "../types";
import { embedTemplate, generateInvite } from "../utils";


const invite: Command = {

  name: 'invite',
  aliases: ['getinvite'],

  description: 'Get a link for inviting this bot to another server you have Manage Server permissions on...',
  
  guildOnly: false,

  args: false,
  usage: undefined,

  execute(message) {
    const link = generateInvite(message.client);
    const embed = embedTemplate(message.client)
      .setTitle(`Invite ${message.client.user.username} to other servers!`)
      .setURL(link);
    return message.channel.send({ embeds: [embed] });
  },
};

export default invite;