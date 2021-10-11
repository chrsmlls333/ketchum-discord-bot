const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require('fs');

const { prefix } = require('./configuration/config.json');
const logger = require('./configuration/logConfig');
const utils = require('./utils');


// =========================================

const anonymous = utils.checkAnonymous();
if (anonymous) logger.info('Running anonymously...');

// =========================================

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
commandFiles.forEach(file => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const command = require(`./commands/${file}`); 
  client.commands.set(command.name, command);
});

const cooldowns = new Discord.Collection();

// =========================================


client.on('ready', async () => {
  logger.info(`I am ready! Logged in as ${client.user.tag}!`);
  logger.info(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`); 

  // client.user.setActivity('the upright organ');
  utils.generateInvite(client).then(link => logger.info(`Generated bot invite link: ${link}`));
});


client.on('guildCreate', server => {
  const embed = utils.embedTemplate(client)
    .setTitle('Thanks for adding me to your server!')
    .setDescription(`I'm a downloader bot which can pull attachments and embeds into a big list to download later. \n\nFor a list of commands, send \`${prefix}help [command name]\` here or in your server!`);
  return server.owner.send(embed);
});


client.on('message', async message => {

  // Check message for basic validity
  const perms = await message.channel.permissionsFor(client.user);
  if (
    !message.content.startsWith(prefix) || 
    message.author.bot ||
    !perms.has('SEND_MESSAGES')
  ) return;
  
  // Parse command
  const args = message.content.slice(prefix.length).split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) ||
   client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
  if (!command) return;
  
  // Log received command!
  logger.debug(`${message.guild.name} #${message.channel.name}: '${message.content}'`); 

  if (command.guildOnly && message.channel.type !== 'text') {
    message.reply('I can\'t execute that command inside DMs!');
    return;
  }

  // Handle no args
  if (command.args && !args.length) {
    let reply = `You didn't provide any arguments, ${message.author}!`;
    if (command.usage) reply += `\nThe proper usage would be: \`${prefix}${command.name}${command.usage ? ` ${command.usage}` : ''}\``;
    message.channel.send(reply);
    return;
  }

  // Handle cooldowns
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
      message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
      return;
    }
  }
  
  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);


  // Finally execute command
  try {
    logger.debug('Execute!');
    await command.execute(message, args);
  } catch (error) {
    // if (error.message) logger.error(error.message);
    logger.error(error.stack);
    const defaultErrorMessage = 'there was an error trying to execute that command!';
    await message.reply(`${error.name}: ${error.message ? error.message : defaultErrorMessage}`);
  }

});

// client.on("debug", function(info){
//   console.log(`debug -> ${info}`);
// });

client.on('disconnect', (event) => {
  logger.info(`The WebSocket has closed and will no longer attempt to reconnect: ${event}`);
});

client.on('error', (error) => {
  logger.error(`client's WebSocket encountered a connection error: ${error}`);
});

client.on('warn', (info) => {
  logger.warn(`warn: ${info}`);
});

// process.on('SIGINT', function() {
//   process.exit();
// });

client.login(process.env.BOT_TOKEN);
