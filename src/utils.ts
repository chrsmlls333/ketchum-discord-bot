import { EmbedBuilder, PermissionsBitField, OAuth2Scopes, Client, Message, ChannelMention, UserMention, RoleMention, TextChannel } from 'discord.js';

import { defaultPrefix, embedColor, botAttribution } from './configuration/config.json';


const utils = {

  // check Prefix setting

  checkPrefix: () => {
    const p = process.env.PREFIX || defaultPrefix;
    return p;
  },

  // check Anonymous Mode

  checkAnonymous: () => {
    let a = process.env.ANONYMOUS || false;
    if (typeof a === 'string') {
      if (a.toLowerCase() === 'false' ||
          a === '0') {
        a = false;
      }
    }
    return a;
  },

  // Get Invite // Set permissions here
  generateInvite: (client: Client) => client.generateInvite({
    scopes: [
      OAuth2Scopes.Bot,
    ],
    permissions: [
      PermissionsBitField.Flags.ChangeNickname,
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.AddReactions,
    ],
  }),


  // Parsing Mentions

  CHAN_REGEX: /^<#(\d+)>$/,
  USER_REGEX: /^<@!?(\d+)>$/,
  ROLE_REGEX: /^<@&(\d+)>$/,

  isChannelFromMention: (mention: ChannelMention) => mention.match(utils.CHAN_REGEX) !== null,

  getChannelFromMention(message: Message, mention: ChannelMention) {
    const matches = mention.match(utils.CHAN_REGEX);
    if (!matches) return null;
    const id = matches[1];
    return message.client.channels.cache.get(id);
  },

  isUserFromMention: (mention: UserMention) => mention.match(utils.USER_REGEX) !== null,

  getUserFromMention: (message: Message, mention: UserMention) => {
    const matches = mention.match(utils.USER_REGEX);
    if (!matches) return null;
    const id = matches[1];
    return message.client.users.cache.get(id);
  },

  isRoleFromMention: (mention: RoleMention) => mention.match(utils.ROLE_REGEX) !== null,


  // Messaging / Editing

  replyOrEdit: async (originalMessage: Message, newMessage: Message, content: string, ping = false) => {
    let c = { content };
    if (!ping) c = { ...c, ...utils.doNotNotifyReply };
    if (!newMessage) return originalMessage.reply(c);
    if (!newMessage.editable) return newMessage;
    return newMessage.edit(c);
  },

  sendOrEdit: async (channel: TextChannel, newMessage: Message, content: string) => {
    if (!newMessage) return channel.send({ content });
    if (!newMessage.editable) return newMessage;
    return newMessage.edit({ content });
  },

  appendEdit: async (message: Message, content: string) => {
    if (!message) return message;
    if (!message.editable) return message;
    return message.edit({ content: (message.content + content) });
  },

  deleteMessage: (message: Message, ms = 0) => {
    if (!message) return null;
    if (!message.deletable) return null;
    return utils.sleep(ms).then(() => message.delete());
  },

  doNotNotifyReply: {
    allowedMentions: {
      repliedUser: false,
    },
  },


  // Embeds

  embedTemplate: (client: Client<true>) => {
    const embed = new EmbedBuilder()
      .setAuthor({
        name: client.user.username,
        iconURL: client.user.avatarURL() ?? undefined,
      })
      .setColor(embedColor as [number, number, number])
      .setTimestamp();
    if (!utils.checkAnonymous()) {
      embed.setAuthor({
        name: client.user.username,
        iconURL: client.user.avatarURL() ?? undefined,
        url: botAttribution.github,
      });
      embed.setFooter({
        text: botAttribution.name,
      });
    }
    return embed;
  },


  // String Functions

  titleCase: (str: string) => {
    if ((str === null) || (str === '')) return str;
    const s = str.toString();
    return s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  },


  // Sleep and Delays

  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  sleepThenPass: <T>(ms: number) => (x: T) => new Promise(resolve => setTimeout(() => resolve(x), ms)),


};

export default utils;
