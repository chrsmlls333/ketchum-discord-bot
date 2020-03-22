const Discord = require('discord.js');
const logger = require('winston');

var moment = require('moment');


module.exports = {

    name: 'download',
    aliases: ['dl', 'save'],

    description: 'Download... something!',

    guildOnly: true,

    args: true,
    usage: '[channel] [time]',
    
	execute(message, args) {

        const client = message.client;

        const getUserFromMention = (mention) => {
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return;
            const id = matches[1];
            return client.users.cache.get(id);
        }
        
        const getChannelFromMention = (mention) => {
            const matches = mention.match(/^<#(\d+)>$/);
            if (!matches) return;
            const id = matches[1];
            return client.channels.cache.get(id);
        }

        const channel = getChannelFromMention(args[0]);
        if (!channel) return message.reply("I don't see a channel mention, sorry!");

        let user;
        if (args.length > 1) {
            user = getUserFromMention(args[1]);
            if (!user) message.reply("I don't see a user mention, but thats fine I guess!");
        }

        //=================================================================================


        let initData = {
            commandMessage: message,
            statusMessage: null,

            scanChannel: channel,
            scanUser: user,

            iterations: 0,
            iterationsMax: 10,

            collectedTotal: 0,
            collectedFiltered() { return this.collectionFiltered.size },
            collectedFilteredDelta: 0,
            collectionFiltered: new Discord.Collection(),

            nextFetchSettings: {
                before: null,
                limit: 50
            },
            fetchDelay: 1000,

            exhausted: false
        }

        const sleeper = (ms) => {
            return function(x) {
              return new Promise(resolve => setTimeout(() => resolve(x), ms));
            };
        }

        const fetch = ( idata ) => {
            logger.info("Fetch! " + (idata.iterations+1));
            
            return idata.scanChannel.messages.fetch(idata.nextFetchSettings)
            // .then(messages => data.commandMessage.reply(`I see ${messages.size} results here!`))
            .then(messages => {
                let data = idata;
                data.iterations++;

                // CHECK FOR NOTHING
                if (!messages.size) {
                    data.exhausted = true;
                    data.commandMessage.reply(`(${data.iterations}) We're fresh out!`);
                    return { data };
                }

                // GET EARLIEST
                let earliestTimestamp = messages.map(m => m.createdTimestamp).reduce((min, cur) => Math.min(min, cur), Infinity);
                let earliestSnowflake = messages.findKey(m => m.createdTimestamp === earliestTimestamp);

                // FILTER
                let newFiltered = messages.filter(m => m.attachments.size); //make sure at least one attachment
                if (data.scanUser) newFiltered = newFiltered.filter(m => m.author.id === data.scanUser.id);

                // UPDATE DATA
                data.collectedTotal += messages.size;
                let collectedFilteredLast = data.collectedFiltered();
                data.collectionFiltered = data.collectionFiltered.concat(newFiltered);
                data.collectedFilteredDelta = data.collectedFiltered() - collectedFilteredLast;
                data.nextFetchSettings.before = earliestSnowflake;
                
                // REPORT
                data.commandMessage.reply(`(${data.iterations}) I see ${data.collectedFilteredDelta}/${messages.size} results here!`)

                // RETURN
                return {
                    messages,
                    data
                };
            })
            .then(sleeper(idata.fetchDelay))
            .then(({ data }) => {

                // Check if exhausted
                if (data.exhausted) return data;

                // Iteration limiter
                if (data.iterationsMax) {
                    if (data.iterations >= data.iterationsMax) return data;
                } 

                // Else lets go for another round
                return fetch( data )
            });
        
		}
		
		
        let results = fetch(initData).catch(console.error);


        // Prepare for export




        // const channel = <client>.channels.cache.get('<id>');
        // channel.send('<content>');

        // const user = <client>.users.cache.get('<id>');
        // user.send('<content>');

        // if (message.mentions.users include me)
	},
};