/*
    Discord-Downloader
    written by Chris Eugene Mills 
    March 2020

    Pulls data and files from Discord
*/

//=========================================

const { token } = require('./configuration/token.json');
const { prefix } = require('./configuration/config.json');
const logger = require('./configuration/logConfig');

const Discord = require('discord.js');
const client = new Discord.Client();
client.commands = new Discord.Collection();

const fs = require('fs');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

var moment = require('moment'); // eslint-disable-line no-unused-vars
const cooldowns = new Discord.Collection();

//=========================================


client.once('ready', () => {
    logger.info('Ready!');
    // client.user.setActivity('the thread!', { type: 'WATCHING' });
});


client.on('message', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;

    logger.debug(`'${message.content}'`); //log recieved command!

    if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply('I can\'t execute that command inside DMs!');
    }

    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;
        if (command.usage) reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        return message.channel.send(reply);
    }

    if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
    }
    
    const now = Date.now();
	const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;
    
    if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
    }
    
    timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
        logger.debug("Execute!");
        await command.execute(message, args);
    } catch (error) {
    // if (error.message) logger.error(error.message);
        logger.error(error.stack);
        await message.reply(error.message ? error.message : 'there was an error trying to execute that command!');
    }

    


    
});

client.login(token);