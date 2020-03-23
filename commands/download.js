const Discord = require('discord.js');
const utils = require('../utils');
const logger = require('winston');

const moment = require('moment');

const path = require('path');
const urlLib = require('url');


module.exports = {

    name: 'download',
    aliases: ['dl', 'save'],

    description: 'Download... something!',

    guildOnly: true,

    args: true,
    usage: '[#channel, here, this] [@user, time]',
    
	async execute(message, args) {

        // const client = message.client;

        // Parse Arguments =================================================================
        
        let channel = utils.getChannelFromMention(message, args[0]);
        if (!channel && args[0].match(/(this|here)/)) channel = message.channel;
        if (!channel) return message.reply("I don't see a channel mention, sorry!");


        let user;
        if (args.length >= 2) {
            user = utils.getUserFromMention(message, args[1]);
            if (!user && utils.isRoleFromMention(args[1])) await message.reply("I don't know what to do with roles and bots. Ignoring that last bit!");
            if (!user) await message.reply("I don't see a user mention, but thats fine I guess!");
        }

        // Reply with plain english understanding of command
        let understanding = `I hear you want to scan messages `;
        if (user) understanding += `posted by ${user} `
        understanding += `on ${channel} `
        if (false) understanding += `from the last x days `
        understanding += `for any and all attachments. One sec...`
        logger.info(understanding);
        await message.reply(understanding);


        // Go Fetch =================================================================


        let initData = {
            commandMessage: message,
            statusMessage: null,

            scanChannel: channel,
            scanUser: user,

            iterations: 0,
            iterationsMax: null, //HARDCODED

            collectedTotal: 0,
            collectedFiltered() { return this.collectionFiltered.size },
            collectedFilteredDelta: 0,
            collectionFiltered: new Discord.Collection(),

            nextFetchSettings: {
                before: null,
                limit: 50 //HARDCODED
            },
            fetchDelay: 1000, //HARDCODED

            exhausted: false
        }

        const fetch = ( idata ) => {
            logger.debug("Fetch! " + (idata.iterations+1));
            
            return idata.scanChannel.messages.fetch(idata.nextFetchSettings)
            // .then(messages => data.commandMessage.reply(`I see ${messages.size} results here!`))
            .then(async messages => {
                let data = idata;
                data.iterations++;

                // CHECK FOR NOTHING
                if (!messages.size) {
                    data.exhausted = true;
                    return utils.appendEdit(data.statusMessage, ` Finished!`)
                    .then(message => {
                        logger.info(message.cleanContent);
                        data.statusMessage = message;
                        return { data }
                    });
                }

                // GET EARLIEST
                let earliestTimestamp = messages.map(m => m.createdTimestamp).reduce((min, cur) => Math.min(min, cur), Infinity);
                let earliestSnowflake = messages.findKey(m => m.createdTimestamp === earliestTimestamp);

                // FILTER
                let newFiltered = messages.filter(m => m.attachments.size || m.embeds.length ); //make sure at least one attachment or embed
                if (data.scanUser) newFiltered = newFiltered.filter(m => m.author.id === data.scanUser.id);

                // UPDATE DATA
                data.collectedTotal += messages.size;
                let collectedFilteredLast = data.collectedFiltered();
                data.collectionFiltered = data.collectionFiltered.concat(newFiltered);
                data.collectedFilteredDelta = data.collectedFiltered() - collectedFilteredLast;
                data.nextFetchSettings.before = earliestSnowflake;
                
                // REPORT
                return utils.replyOrEdit(data.commandMessage, data.statusMessage, 
                    `I see ${data.collectedFiltered()}/${data.collectedTotal} results here from ${data.iterations}${data.iterationsMax ? "/" + data.iterationsMax : ""} pass${data.iterations != 1 ? "es" : ""}!`)
                .then(message => {
                    data.statusMessage = message;
                return {
                    messages,
                    data
                };
                });
            })
            // .then(sleeper(idata.fetchDelay))
            .then(({ data }) => {
                if (data.exhausted) return data;
                if (data.iterationsMax) if (data.iterations >= data.iterationsMax) return data;
                return utils.sleep(data.fetchDelay)
                .then(() => fetch(data)); // Else lets go for another round
            });

                } 

        
        let results = await fetch(initData).catch(e => logger.error(e.stack));
		
		
        // Prepare for export ====================================================================

        /*
            https://superuser.com/questions/268278/utility-to-download-and-rename-a-bunch-of-files
            https://superuser.com/questions/274276/what-program-can-i-use-to-bulk-download-this-list-of-links
        */

        const { 
            commandMessage, 
            statusMessage, 
            scanChannel, 
            scanUser, 
            collectionFiltered: messages 
        } = results;

        let allAttachments = new Discord.Collection();

        messages.each((m, sfm, allm) => {
            const { attachments, embeds, author, createdAt } = m;

            let username = author.username.replace(/[^\w-]+/g, "") || author.tag;
            const createdString = moment(createdAt).format("YYYYMMDD-HHmmss");

            const ingestAttachmentEmbed = (key, url) => {
                let basename = path.basename( urlLib.parse(url).pathname );
                basename = basename.replace(/^(SPOILER_)/, "");
                const newname = `${username}_${createdString}_${basename}`;

                allAttachments.set(key, {
                    author,
                    url,
                    basename,
                    newname
                })
            };

            attachments.each((a, sfa, alla) => ingestAttachmentEmbed(sfa, a.url));

            embeds.forEach((e, i, alle) => {
                const { type, url } = e;
                const garbageSnowflake = sfm + `-embed-${i}`;
                
                if ((type == 'image' || type == 'video') && url) ingestAttachmentEmbed(garbageSnowflake, url);

                logger.debug(type)
                logger.debug(url)
            });
        })


        // Prepare for export




        // const channel = <client>.channels.cache.get('<id>');
        // channel.send('<content>');

        // const user = <client>.users.cache.get('<id>');
        // user.send('<content>');

        // if (message.mentions.users include me)
	},
};