const Discord = require('discord.js');

const logger = require('winston');

const path = require('path');
const urlLib = require('url');
const fsp = require('fs').promises;

const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/advancedFormat'));

const pug = require('pug');
const pugRender = pug.compileFile('templates/download.pug');

const utils = require('../utils');
const {
  prefix,
  anonymous,
  fetchIterationsMax, 
  fetchPageSize, 
  fetchDelay, 
  statusMessageDeleteDelay,
  htmlDebugPath,
  cssFilePath,
} = require('../configuration/config.json');




const dl = {

  name: 'download',
  aliases: ['dl', 'save'],
  cancelAliases: ['cancel', 'stop', 'halt'],

  description: `
    Download... something!
    Remember you can cancel while this is running.
  `,

  guildOnly: true,

  args: true,
  usage: '[...#channel, here, this, all, any] [@user] [time]',
  
  
  // Parse command arguments ======================================================
  
  parseChannel: async (data) => {
    const { scanChannels, commandMessage: m, commandMessageArgs: a } = data;
    let { allChannels } = data;

    if (scanChannels) return data;
    if (!a.length) return data;

    const channelsFound = new Discord.Collection();
    while (a.length) {
      const arg = a[0];
      let c = utils.getChannelFromMention(m, arg);
      if (!c && arg.match(/^(this|here)$/i)) c = m.channel;
      if (!c && arg.match(/^(all|any)$/i)) {
        if (m.channel.type === 'dm') throw new Error("I really can't do this in a DM!");
        if (!m.channel.guild.available) throw new Error("I don't see your server!");
        allChannels = true;
        const textChannels = m.channel.guild.channels.cache.filter(gc => gc.type === 'text' && !gc.deleted && gc.viewable);
        textChannels.each((chan) => channelsFound.set(chan.id, chan));
        c = textChannels.first(); // To appease current if/else structure
      }
      if (!c) break; // Nothing found
      channelsFound.set(c.id, c);
      a.shift(); 
    }

    if (!channelsFound.size) throw new Error("I don't see a channel mention, or all/here/this, sorry!");
    logger.info(channelsFound.size);
    return {
      ...data,
      scanChannels: channelsFound,
      commandMessageArgs: a,
      allChannels,
    };
  },

  parseUser: async (data) => {
    const { scanUsers, commandMessage: m, commandMessageArgs: a } = data;
    if (scanUsers) return data;
    if (!a.length) return data;

    const usersFound = new Discord.Collection();
    while (a.length) {
      const arg = a[0];
      const u = utils.getUserFromMention(m, arg);
      if (!u) {
        if (utils.isRoleFromMention(arg)) m.reply("I don't know what to do with roles and bots. Ignoring that bit!");
        break;
      }
      usersFound.set(u.id, u);
      a.shift();
    }
    
    if (!usersFound.size) {
      await m.reply("I don't see a user mention, but that's fine I guess!");
      return data;
    }

    return {
      ...data,
      scanUsers: usersFound,
      commandMessageArgs: a,
    };
  },

  parseTime: async (data) => {
    // eslint-disable-next-line prefer-const
    let { dataLimit } = data;

    // Insert guts here

    return {
      ...data,
      dataLimit,
    };
  },

  spoutUnderstanding: async (data) => {
    // Reply with plain english understanding of command
    const { 
      commandMessage: m, 
      scanChannels: c, 
      scanUsers: u, 
      allChannels: all,
    } = data;

    /* eslint-disable no-multi-spaces, indent, no-constant-condition */
    let     s =  `I hear you want to scan messages `;
    if (u)  s += `posted by ${[...u.values()].join(' & ')} `;
            s += `on ${all ? 'all channels' : [...c.values()].join(' & ')} `;
    if (0)  s += `from the last x days `;
            s += `for any and all attachments. One sec...`;
    /* eslint-enable no-multi-spaces, indent, no-constant-condition */

    const spoutMessage = await m.reply(s);
    logger.info(spoutMessage.cleanContent);
    return data;
  },

  // Fetch data from message history! ===================================================

  statusMessageExpire: (data) => {
    utils.deleteMessage(data.statusMessage, statusMessageDeleteDelay);
    return data;
  },

  fetch: (fetchData) => fetchData.scanChannels
    .get(fetchData.currentChannelID).messages
    .fetch({ before: fetchData.earliestSnowflake, limit: fetchPageSize })
    .then(async messages => {
      let { 
        iterations,
        earliestSnowflake,
        collectedTotal,
        collectionFiltered,
      } = fetchData;

      const i = ++iterations;
      // logger.debug(`Fetch! ${i}`);

      // CHECK FOR CANCEL
      if (fetchData.cancelCollector.ended) {
        utils.deleteMessage(fetchData.statusMessage);
        throw new Error('I\'m cancelling!');
      }
      
      // CHECK FOR NOTHING / END / MAXLOOP
      if (!messages.size || 
          (fetchIterationsMax && i > fetchIterationsMax)) {
        return utils.appendEdit(fetchData.statusMessage, ` Finished!`)
          .then(message => {
            logger.info(message.cleanContent);
            return { ...fetchData, statusMessage: message };
          })
          .then(dl.statusMessageExpire);
      }

      // GET EARLIEST
      const earliestTStamp = messages.map(m => m.createdTimestamp)
        .reduce((min, cur) => Math.min(min, cur), Infinity);
      // eslint-disable-next-line max-len
      earliestSnowflake = messages.findKey(m => m.createdTimestamp === earliestTStamp);

      // FILTER
      let newFiltered = messages.filter(m => { // make sure at least one attachment or embed
        if (m.attachments.size) return true;
        if (m.embeds.length) return m.embeds.some(e => new RegExp('image|video').test(e.type));
        return false;
      }); 
      
      if (fetchData.scanUsers && fetchData.scanUsers.size) {
        newFiltered = newFiltered.filter(m => fetchData.scanUsers
          .some(u => u.id === m.author.id));
      }

      // UPDATE DATA
      collectedTotal += messages.size;
      collectionFiltered = fetchData.collectionFiltered.concat(newFiltered);
      const { size } = fetchData.collectionFiltered;
      
      // REPORT AND LOOP
      return utils.replyOrEdit(fetchData.commandMessage, fetchData.statusMessage, 
        `for ${fetchData.scanChannels.get(fetchData.currentChannelID)} I see ${size}/${fetchData.collectedTotal} results here from ${i}${fetchIterationsMax ? `/${fetchIterationsMax}` : ''} pass${i !== 1 ? 'es' : ''}!`)
        .then(message => ({
          ...fetchData,
          statusMessage: message,
          iterations,
          earliestSnowflake,
          collectedTotal,
          collectionFiltered,
        }))
        .then(utils.sleepThenPass(fetchDelay))
        .then(dl.fetch);
    }),


  fetchChannelsCombine: (data) => {

    // Setup cancelling by command
    const cancelRegex = new RegExp(`^\\${prefix}(${dl.cancelAliases.join('|')})$`, 'i');
    const filter = m => cancelRegex.test(m.content) && 
                        m.author.id === data.commandMessage.author.id;
    const cancelCollector = (
      data.commandMessage.channel.createMessageCollector(filter, { max: 1 })
    );
    cancelCollector.on('collect', m => logger.debug(`Collected ${m.content}`));
    
    // Start Per-Channel Fetch in Parallel
    const fetches = data.scanChannels.map((c, k) => {
      const fetchInitData = {
        commandMessage: data.commandMessage,
        commandMessageArgs: data.commandMessageArgs,
        statusMessage: null,
        
        scanChannels: data.scanChannels && data.scanChannels.clone(),
        currentChannelID: k,
        scanUsers: data.scanUsers && data.scanUsers,
      
        iterations: 0,
        exhausted: false,
        
        collectedTotal: 0,
        collectionFiltered: new Discord.Collection(),

        cancelCollector,
        
        earliestSnowflake: null,
      };

      return dl.fetch(fetchInitData); // recursive
    });

    return Promise.all(fetches).then(fetchResults => {
      // stop cancel watch
      cancelCollector.stop();

      // delete all statusMessages 
      // const statusMessages = fetchResults.map(f => f.statusMessage);
      // eslint-disable-next-line max-len
      // setTimeout(() => data.commandMessage.channel.bulkDelete(statusMessages), statusMessageDeleteDelay);

      // combine results
      let { collectedTotal, collectionLoadedMessages } = data;
      collectedTotal = fetchResults.reduce((acc, result) => acc + result.collectedTotal, 0);
      const filteredEach = fetchResults.map(f => f.collectionFiltered);
      collectionLoadedMessages = new Discord.Collection().concat(...filteredEach);
      return { ...data, collectedTotal, collectionLoadedMessages };
    });

  },


  // Prepare for export ====================================================================

  buildLinkCollection: (data) => {
    if (!data.collectionLoadedMessages && !data.collectionLoadedMessages.size) throw new Error('No collection of embeds and attachments to parse!');
    
    const messages = data.collectionLoadedMessages;
    const allAttachments = new Discord.Collection();

    messages.each((m, sfm) => {

      const ingestAttachmentEmbed = (key, url) => {
        const username = m.author.username.replace(/[^\w-]+/g, '') || m.author.tag;
        const createdString = dayjs(m.createdAt).format('YYYYMMDD-HHmmss');
        let basename = path.basename(urlLib.parse(url).pathname);
        basename = basename.replace(/^(SPOILER_)/, '');
        const newname = path.join(m.guild.name, m.channel.name, `${username}_${createdString}_${basename}`);

        allAttachments.set(key, {
          message: m,
          basename,
          newname,
          url,
        });
      };

      m.attachments.each((a, sfa) => ingestAttachmentEmbed(sfa, a.url));

      m.embeds.forEach((e, i) => {
        const garbageSnowflake = `${sfm}-embed-${i}`;
        if (new RegExp('image|video').test(e.type) && e.url) ingestAttachmentEmbed(garbageSnowflake, e.url);
      });
    });

    if (!allAttachments.size) throw new Error('Our processed collection of embeds and attachments is empty!');

    return { ...data, collectionMedia: allAttachments };
  },

  buildDownloadHtml: async (data) => {
    const {
      scanChannels,
      allChannels: all,
      scanUsers,
      collectionMedia,
    } = data;

    const css = await fsp.readFile(cssFilePath)
      .then(txt => Buffer.from(txt).toString('base64'));

    const html = pugRender({
      dayjs, // import
      server: scanChannels.first().guild.name,
      iconURL: scanChannels.first().guild.iconURL({ format: 'jpg', dynamic: true, size: 128 }),
      channels: all ? 'all' : scanChannels.map(c => c.name).join('&#'),
      users: (scanUsers && scanUsers.size) ? scanUsers.map(u => u.tag).join(' & ') : null,
      attachments: [...collectionMedia.values()],
      stylesheet: `data:text/css;base64,${css}`,
      anonymous,
    });

    return { ...data, html };
  },

  distributeHTMLData: (data) => {
    const {
      html, 
      commandMessage, 
      scanChannels,
      allChannels: all,
    } = data;

    if (!html) throw new Error('There was no html generated.');
    const htmlData = Buffer.from(html);

    fsp.writeFile(htmlDebugPath, htmlData, 'utf8')
      .then(() => logger.debug(`Deliverable HTML saved to ${htmlDebugPath}!`))
      .catch(error => {
        logger.error('No luck writin\' them files then? Its just the one file, actually...');
        logger.error(error.stack);
      });
    
    let channelstring = null;
    if (all) channelstring = 'all';
    if (!channelstring && scanChannels.size === 1) channelstring = scanChannels.first().name;
    if (!channelstring) channelstring = `${scanChannels.size}channels`;

    const attachment = new Discord.MessageAttachment(htmlData, `${commandMessage.guild.name.replace(' ', '')}_${channelstring}_attachments.html`);
    return commandMessage.reply(`here you go!`, attachment)
      .then(() => data);
  },


  // RUN ALL =====================================================================================

  async execute(_message, _args) {

    const initData = {
      commandMessage: _message,
      commandMessageArgs: _args,
    
      scanChannels: null,
      allChannels: false,
      scanUsers: null,
      dateLimit: null,

      collectionLoadedMessages: null,
      collectionMedia: null,
      collectedTotal: 0,
      
      html: null,
    };
    
    return Promise.resolve(initData)
      .then(dl.parseChannel)
      .then(dl.parseUser)
      .then(dl.parseTime)
      .then(dl.spoutUnderstanding)
      .then(dl.fetchChannelsCombine)
      .then(dl.buildLinkCollection)
      .then(dl.buildDownloadHtml)
      .then(dl.distributeHTMLData);
  },

};

module.exports = dl;
