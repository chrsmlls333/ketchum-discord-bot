//const Discord = require('discord.js');

const utils = {

    // Parsing Mentions
    CHAN_REGEX: /^<#(\d+)>$/,
    USER_REGEX: /^<@!?(\d+)>$/,
    ROLE_REGEX: /^<@&(\d+)>$/,

    isChannelFromMention: (mention) => mention.match(utils.CHAN_REGEX) == true,

    getChannelFromMention: (message, mention) => {
        const matches = mention.match(utils.CHAN_REGEX);
        if (!matches) return;
        const id = matches[1];
        return message.client.channels.cache.get(id);
    },

    isUserFromMention: (mention) => mention.match(utils.USER_REGEX) == true,

    getUserFromMention: (message, mention) => {
        const matches = mention.match(utils.USER_REGEX);
        if (!matches) return;
        const id = matches[1];
        return message.client.users.cache.get(id);
    },

    isRoleFromMention: (mention) => mention.match(utils.ROLE_REGEX) == true,



    // Messaging / Editing

    replyOrEdit: (originalMessage, newMessage, content) => {
        if (!newMessage) return originalMessage.reply(content);
        if (!newMessage.editable) return newMessage;

        const searchTerm = '>, ';
        const i = newMessage.content.indexOf(searchTerm) + searchTerm.length;
        const before = newMessage.content.slice(0, i);
        const after = newMessage.content.slice(i);
        return newMessage.edit(before + content);
    },

    appendEdit: (message, content) => {
        if (!message) return message;
        if (!message.editable) return message;
        return message.edit(message.content + content);
    },


    // Sleep and Delays

    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    sleepThenPass: (ms) => {
        return function(x) {
          return new Promise(resolve => setTimeout(() => resolve(x), ms));
        };
    },


}

module.exports = utils;