const Discord = require('discord.js');
const { defaultPrefix, embedColor, botAttribution } = require('./configuration/config.json');

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

  generateInvite: (client) => client.generateInvite({
    permissions: [
      'ADD_REACTIONS',
      'VIEW_CHANNEL',
      'SEND_MESSAGES', 
      'EMBED_LINKS',
      'ATTACH_FILES',
      'READ_MESSAGE_HISTORY', 
      'CHANGE_NICKNAME',
    ],
  }),


  // Parsing Mentions

  CHAN_REGEX: /^<#(\d+)>$/,
  USER_REGEX: /^<@!?(\d+)>$/,
  ROLE_REGEX: /^<@&(\d+)>$/,

  isChannelFromMention: (mention) => mention.match(utils.CHAN_REGEX) !== null,

  getChannelFromMention(message, mention) {
    const matches = mention.match(utils.CHAN_REGEX);
    if (!matches) return null;
    const id = matches[1];
    return message.client.channels.cache.get(id);
  },

  isUserFromMention: (mention) => mention.match(utils.USER_REGEX) !== null,

  getUserFromMention: (message, mention) => {
    const matches = mention.match(utils.USER_REGEX);
    if (!matches) return null;
    const id = matches[1];
    return message.client.users.cache.get(id);
  },

  isRoleFromMention: (mention) => mention.match(utils.ROLE_REGEX) !== null,


  // Messaging / Editing

  replyOrEdit: async (originalMessage, newMessage, content, checkWasReply = true) => {
    let c = content;
    if (!newMessage) return originalMessage.reply(c);
    if (!newMessage.editable) return newMessage;
    if (checkWasReply) {
      const tokens = newMessage.content.split(/[, ]+/);
      const firstToken = tokens.shift();
      const wasReply = firstToken.match(utils.USER_REGEX);
      if (wasReply) c = `${firstToken}, ${c}`;
    }
    return newMessage.edit(c);
  },

  sendOrEdit: async (channel, newMessage, content, checkWasReply = true) => {
    let c = content;
    if (!newMessage) return channel.send(c);
    if (!newMessage.editable) return newMessage;
    if (checkWasReply) {
      const tokens = newMessage.content.split(/[, ]+/);
      const firstToken = tokens.shift();
      const wasReply = firstToken.match(utils.USER_REGEX);
      if (wasReply) c = `${firstToken}, ${c}`;
    }
    return newMessage.edit(c);
  },

  appendEdit: async (message, content) => {
    if (!message) return message;
    if (!message.editable) return message;
    return message.edit(message.content + content);
  },

  deleteMessage: (message, ms = 0) => {
    if (!message) return;
    if (!message.deletable || message.deleted) return;
    message.delete({ timeout: ms });
  },


  // Embeds

  embedTemplate: (client) => {
    const embed = new Discord.MessageEmbed()
      .setAuthor(client.user.username, client.user.avatarURL())
      .setColor(embedColor)
      .setTimestamp();
    if (!utils.checkAnonymous()) {
      embed.setAuthor(client.user.username, client.user.avatarURL(), botAttribution.github);
      embed.setFooter(botAttribution.name);
    }
    return embed;
  },


  // String Functions

  titleCase: (str) => { 
    if ((str === null) || (str === '')) return str; 
    const s = str.toString(); 
    return s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()); 
  },


  // Sleep and Delays

  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  sleepThenPass: (ms) => (x) => new Promise(resolve => setTimeout(() => resolve(x), ms)),


};

module.exports = utils;
