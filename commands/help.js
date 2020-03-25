// const Discord = require("discord.js");
const logger = require('winston');
// const utils = require("../utils");

const { prefix } = require('../configuration/config.json');

module.exports = {

  name: 'help',
  aliases: ['commands'],

  description: 'List all of my commands or info about a specific command.',

  guildOnly: false,

  args: false,
  usage: '[command name]',
  
  execute(message, args) {

    const data = [];
    const { commands } = message.client;

    // Just help!!
    if (!args.length) {
      data.push("Here's a list of all my commands:");
      data.push(commands.map(command => command.name).join(', '));
      data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);

      return message.author.send(data, { split: true })
        .then(() => {
          if (message.channel.type === 'dm') return null;
          return message.reply("I've sent you a DM with all my commands!");
        })
        .catch(error => {
          logger.error(`Could not send help DM to ${message.author.tag}.\n`, error);
          return message.reply("it seems like I can't DM you! Do you have DMs disabled?");
        });
    }


    // I ACTUALLY WANT INFO

    const name = args[0].toLowerCase();
    const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

    if (!command) return message.reply('that\'s not a valid command!');

    data.push(`**Name:** ${command.name}`);
    if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
    if (command.description) data.push(`**Description:** ${command.description}`);
    if (command.usage) data.push(`**Usage:** ${prefix}${command.name} ${command.usage}`);
    // data.push(`**Cooldown:** ${command.cooldown || 3} second(s)`);

    return message.channel.send(data, { split: true });
    
  },
};
