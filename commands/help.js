const Discord = require('discord.js');
const logger = require('winston');
const utils = require('../utils');

const { prefix, anonymous, embedColor } = require('../configuration/config.json');

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

      const embed = new Discord.MessageEmbed() // Makes a pretty embed
        .setTitle('Here are all of my commands...')
        // .setDescription('Here are all of my commands...')
        .addFields(
          { name: 'Commands', value: `${commands.map(command => command.name).join(', ')}` },
          // { name: '\u200B', value: '\u200B' },
          { name: 'Follow-up', value: `\nYou can send \`${prefix}help [command name]\` to get info on a specific command!` },
        )
        .setColor(embedColor)
        .setTimestamp();
      if (!anonymous) embed.setFooter('Ketchum Bot');
      return message.channel.send(embed);

      // return message.author.send(data, { split: true })
      //   .then(() => {
      //     if (message.channel.type === 'dm') return null;
      //     return message.reply("I've sent you a DM with all my commands!");
      //   })
      //   .catch(error => {
      //     logger.error(`Could not send help DM to ${message.author.tag}.\n`, error);
      //     return message.reply("it seems like I can't DM you! Do you have DMs disabled?");
      //   });
    }


    // I ACTUALLY WANT INFO

    const name = args[0].toLowerCase();
    const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

    if (!command) return message.reply('that\'s not a valid command!');

    const embed = new Discord.MessageEmbed() // Makes a pretty embed
      .setTitle(`${prefix}${command.name}`)
      // .setDescription('You rang?')
      .addFields(
        // { name: 'Command Name', value: `${command.name}` },
        // { name: '\u200B', value: '\u200B' },
        { name: 'Aliases', value: `${command.aliases.map(a => prefix + a).join(', ')}` },
        { name: 'Description', value: `${command.description}` },
        { name: 'Usage', value: `${prefix}${command.name} ${command.usage}`, inline: true },
      )
      .setColor(embedColor)
      .setTimestamp();
    if (!anonymous) embed.setFooter('Ketchum Bot');
    return message.channel.send(embed);
    
  },
};
