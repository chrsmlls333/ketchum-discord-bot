
module.exports = {

    name: 'download',
    aliases: ['dl', 'save'],

    description: 'Download... something!',

    guildOnly: true,

    args: true,
    usage: '[channel] [time]',
    
	execute(message, args) {

        message.channel.send(`Arguments: ${args}\nArguments length: ${args.length}`);
        
        if (args[0] === 'foo') {
			return message.channel.send('bar');
		}
		
		
        // const channel = <client>.channels.cache.get('<id>');
        // channel.send('<content>');

        // const user = <client>.users.cache.get('<id>');
        // user.send('<content>');

        // if (message.mentions.users include me)
	},
};