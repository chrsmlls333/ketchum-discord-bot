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
            fetchDelay: 500, //HARDCODED

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
                let newFiltered = messages.filter(m => { //make sure at least one attachment or embed
                    if (m.attachments.size) return true;
                    if (m.embeds.length) return m.embeds.some(e => new RegExp("image|video").test(e.type));
                    return false;
                }); 
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
                if (new RegExp("image|video").test(type) && url) ingestAttachmentEmbed(garbageSnowflake, url);
            });
        })

        let html = "<!DOCTYPE html>\n<html>\n<body>\n"
        html += `<img src="${scanChannel.guild.iconURL({ format: "jpg", dynamic: true, size: 64 })}" >`
        html += `<h1>Images/Files posted in ${scanChannel.guild.name}#${scanChannel.name}${scanUser ? " by " + scanUser.tag: ""}</h1>\n`
        html += `<h3>Scanned ${moment().format("MMMM Do YYYY, h:mm:ss a")}</h3>\n`
        let dtaLink = false;
        html += `<p>To download all files here, I recommend using ${dtaLink ? "<a href='https://www.downthemall.net/'>" : ""}DownThemAll${dtaLink ? "</a>" : ""} on Firefox to pull all the links at once.</p>
        <p>On the 'Select your Downloads' dialog, use <code>*text*</code> as your Mask to rename the file with the user and posting date like it's listed here.</p>
        <p>✨</p>`
        html += "<ul>\n"
        allAttachments.each((a) => {
            html += `<li><a href="${a.url}" target="_blank">${a.newname}</a></li>\n`
        })
        html += "</ul>\n"
        html += "</body>\n</html>\n"



        //return

        const htmlData = Buffer.from(html);

        // fsp.writeFile("debug_message.json", jsonData, 'utf8')
        // .then(() => console.log("Message data saved!"))
        // .catch(error => console.log(error));

        const attachment = new Discord.MessageAttachment(htmlData, `${scanChannel.name}-attachments.html`);

        commandMessage.channel.send(`${commandMessage.author}, here you go!`, attachment);


        // if (message.mentions.users include me)
	},
};


