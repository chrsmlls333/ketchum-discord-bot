/* eslint-disable no-param-reassign */

const Discord = require('discord.js');
const logger = require('winston');
const moment = require('moment');
const path = require('path');
const urlLib = require('url');
const fsp = require('fs').promises;

const pug = require('pug');
const pugRender = pug.compileFile('templates/download.pug');

const utils = require('../utils');
const {
  fetchIterationsMax, 
  fetchPageSize, 
  fetchDelay, 
  htmlDebugPath,
} = require('../configuration/config.json');


module.exports = {

  name: 'download',
  aliases: ['dl', 'save'],

  description: 'Download... something!',

  guildOnly: true,

  args: true,
  usage: '[#channel, here, this] [@user, time]',
  
  async execute(_message, _args) {

    const initData = {
      commandMessage: _message,
      commandMessageArgs: _args,
      statusMessage: null,
    
      scanChannel: null,
      scanUser: null,
    
      iterations: 0,
      iterationsMax: fetchIterationsMax,
      exhausted: false,
    
      collectedTotal: 0,
      collectedFiltered() { return this.collectionFiltered.size; },
      collectedFilteredDelta: 0,
      collectionFiltered: new Discord.Collection(),
      
      fetchDelay,
      nextFetchSettings: {
        before: null,
        limit: fetchPageSize,
      },
      
      html: null,
    };

    // Parse command arguments ======================================================
    
    const parseChannel = async (data) => {
      if (data.scanChannel) return data;

      const { commandMessage: m, commandMessageArgs: a } = data;

      let c = utils.getChannelFromMention(m, a[0]);
      if (!c && a[0].match(/(this|here)/)) c = m.channel;
      if (!c) throw new Error("I don't see a channel mention, sorry!");
      data.scanChannel = c;
      return data;
    };

    const parseUser = async (data) => {
      if (data.scanUser) return data;

      const { commandMessage: m, commandMessageArgs: a } = data;

      if (a.length < 2) return data;

      const u = utils.getUserFromMention(m, a[1]);
      if (!u && utils.isRoleFromMention(a[1])) {
        await m.reply("I don't know what to do with roles and bots. Ignoring that last bit!");
        return data;
      }
      if (!u) {
        await m.reply("I don't see a user mention, but thats fine I guess!");
        return data;
      }
      data.scanUser = u;
      return data;
    };

    const spoutUnderstanding = async (data) => {
      // Reply with plain english understanding of command
      const { commandMessage: m, scanChannel: c, scanUser: u } = data;

      
      /* eslint-disable no-multi-spaces, indent, no-constant-condition */
      let     s =  `I hear you want to scan messages `;
      if (u)  s += `posted by ${u} `;
              s += `on ${c} `;
      if (0)  s += `from the last x days `;
              s += `for any and all attachments. One sec...`;
      /* eslint-enable no-multi-spaces, indent, no-constant-condition */

      logger.info(s);
      await m.reply(s);
      return data;
    };

    // Fetch data from message history! ===================================================

    const fetch = (idata) => {
      logger.debug(`Fetch! ${idata.iterations + 1}`);
      
      return idata.scanChannel.messages.fetch(idata.nextFetchSettings)
        .then(async messages => {
          const data = idata;
          data.iterations++;

          // CHECK FOR NOTHING
          if (!messages.size) {
            data.exhausted = true;
            return utils.appendEdit(data.statusMessage, ` Finished!`)
              .then(message => {
                logger.info(message.cleanContent);
                data.statusMessage = message;
                return { data };
              });
          }

          // GET EARLIEST
          const earliestTimestamp = messages.map(m => m.createdTimestamp)
            .reduce((min, cur) => Math.min(min, cur), Infinity);
          const earliestSnowflake = messages.findKey(m => m.createdTimestamp === earliestTimestamp);

          // FILTER
          let newFiltered = messages.filter(m => { // make sure at least one attachment or embed
            if (m.attachments.size) return true;
            if (m.embeds.length) return m.embeds.some(e => new RegExp('image|video').test(e.type));
            return false;
          }); 
          
          if (data.scanUser)newFiltered = newFiltered.filter(m => m.author.id === data.scanUser.id);

          // UPDATE DATA
          data.collectedTotal += messages.size;
          const collectedFilteredLast = data.collectedFiltered();
          data.collectionFiltered = data.collectionFiltered.concat(newFiltered);
          data.collectedFilteredDelta = data.collectedFiltered() - collectedFilteredLast;
          data.nextFetchSettings.before = earliestSnowflake;
          
          // REPORT
          return utils.replyOrEdit(data.commandMessage, data.statusMessage, 
            `I see ${data.collectedFiltered()}/${data.collectedTotal} results here from ${data.iterations}${data.iterationsMax ? `/${data.iterationsMax}` : ''} pass${data.iterations !== 1 ? 'es' : ''}!`)
            .then(message => {
              data.statusMessage = message;
              return {
                messages,
                data,
              };
            });
        })
        .then(({ data }) => {
          if (data.exhausted) return data;
          if (data.iterationsMax) if (data.iterations >= data.iterationsMax) return data;
          // else lets go for another round
          return utils.sleep(data.fetchDelay).then(() => fetch(data)); 
        });

    };


    // Prepare for export ====================================================================

    const buildLinkCollection = async (data) => {
      if (!data.collectionFiltered) throw new Error('No collection of embeds and attachments to parse!');
      if (!data.collectionFiltered.size) throw new Error('No collection of embeds and attachments to parse!');
      
      const messages = data.collectionFiltered;
  
      const allAttachments = new Discord.Collection();
  
      messages.each((m, sfm) => {
        const { 
          author, 
          createdAt,
          attachments, 
          embeds, 
        } = m;
  
        const username = author.username.replace(/[^\w-]+/g, '') || author.tag;
        const createdString = moment(createdAt).format('YYYYMMDD-HHmmss');
  
        const ingestAttachmentEmbed = (key, url) => {
          let basename = path.basename(urlLib.parse(url).pathname);
          basename = basename.replace(/^(SPOILER_)/, '');
          const newname = `${username}_${createdString}_${basename}`;
  
          allAttachments.set(key, {
            author,
            url,
            createdAt,
            basename,
            newname,
          });
        };
  
        attachments.each((a, sfa) => ingestAttachmentEmbed(sfa, a.url));
  
        embeds.forEach((e, i) => {
          const { type, url } = e;
          const garbageSnowflake = `${sfm}-embed-${i}`;
          if (new RegExp('image|video').test(type) && url) ingestAttachmentEmbed(garbageSnowflake, url);
        });
      });


      if (!allAttachments.size) throw new Error('Our processed collection of embeds and attachments is empty!');
      data.collectionFiltered = allAttachments;
      return data;
    };

    const buildDownloadHtml = (data) => {
      const {
        scanChannel, 
        scanUser, 
        collectionFiltered,
      } = data;
      data.html = pugRender({
        scanChannel,
        scanUser,
        moment,
        attachments: Array.from(collectionFiltered.values()),
      });
      return data;
    };

    const distributeHTMLData = (data) => {
      const {
        html, 
        commandMessage, 
        scanChannel,
      } = data;
      if (!html) throw new Error('There was no html generated.');

      const htmlData = Buffer.from(data.html);
      return fsp.writeFile(htmlDebugPath, htmlData, 'utf8')
        .then(() => logger.debug(`Deliverable HTML saved to ${htmlDebugPath}!`))
        .then(() => {
          const attachment = new Discord.MessageAttachment(htmlData, `${scanChannel.name}-attachments.html`);
          return commandMessage.reply(`here you go!`, attachment);
        })
        .then(() => data);
    };
    
    // RUN ALL =====================================================================================

    return parseChannel(initData)
      .then(parseUser)
      .then(spoutUnderstanding)
      .then(fetch)
      .then(buildLinkCollection)
      .then(buildDownloadHtml)
      .then(distributeHTMLData);
  },
};
