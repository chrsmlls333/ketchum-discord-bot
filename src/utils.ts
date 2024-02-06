import { EmbedBuilder, PermissionsBitField, OAuth2Scopes, Client, Message, TextChannel } from 'discord.js';

import { defaultPrefix, embedColor, botAttribution } from './configuration/config.json';

export function checkPrefix() {
  const p = process.env.PREFIX || defaultPrefix;
  return p;
}

export function checkAnonymous() {
  let a = process.env.ANONYMOUS || false;
  if (typeof a === 'string') {
    if (a.toLowerCase() === 'false' ||
        a === '0') {
      a = false;
    }
  }
  return a;
}

export function generateInvite(client: Client) {
  return client.generateInvite({
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
  });
}


// Parsing Mentions

const CHAN_REGEX = /^<#(\d+)>$/;
const USER_REGEX = /^<@!?(\d+)>$/;
const ROLE_REGEX = /^<@&(\d+)>$/;

export const isChannelFromMention = (mention: string) => mention.match(CHAN_REGEX) !== null;

export function getChannelFromMention(message: Message, mention: string) {
  const matches = mention.match(CHAN_REGEX);
  if (!matches) return null;
  const id = matches[1];
  return message.client.channels.cache.get(id) ?? null;
}

export const isUserFromMention = (mention: string) => mention.match(USER_REGEX) !== null;

export function getUserFromMention(message: Message, mention: string) {
  const matches = mention.match(USER_REGEX);
  if (!matches) return null;
  const id = matches[1];
  return message.client.users.cache.get(id) ?? null;
}

export const isRoleFromMention = (mention: string) => mention.match(ROLE_REGEX) !== null;


// Messaging / Editing

export async function replyOrEdit(originalMessage: Message, newMessage: Message | undefined, content: string, ping = false) {
  let c = { content };
  if (!ping) c = { ...c, ...doNotNotifyReply };
  if (!newMessage) return originalMessage.reply(c);
  if (!newMessage.editable) return newMessage;
  return newMessage.edit(c);
}

export async function sendOrEdit(channel: TextChannel, newMessage: Message | undefined, content: string) {
  if (!newMessage) return channel.send({ content });
  if (!newMessage.editable) return newMessage;
  return newMessage.edit({ content });
}

export async function appendEdit(message: Message, content: string) {
  if (!message) return message;
  if (!message.editable) return message;
  return message.edit({ content: (message.content + content) });
}

export function deleteMessage(message: Message, ms = 0) {
  if (!message) return null;
  if (!message.deletable) return null;
  return sleep(ms).then(() => message.delete());
}

export const doNotNotifyReply = {
  allowedMentions: {
    repliedUser: false,
  },
};


// Embeds

export function embedTemplate(client: Client) {
  if (!client.user) throw new Error('Client user is not available');
  const embed = new EmbedBuilder()
    .setAuthor({
      name: client.user.username,
      iconURL: client.user.avatarURL() ?? undefined,
    })
    .setColor(embedColor as [number, number, number])
    .setTimestamp();
  if (!checkAnonymous()) {
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
}


// String Functions

export function titleCase(str: string) {
  if ((str === null) || (str === '')) return str;
  const s = str.toString();
  return s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}


// Sleep and Delays

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sleepThenPass = <T>(ms: number) => (x: T) => new Promise<T>(resolve => setTimeout(() => resolve(x), ms));

