import type { Command } from "../types";

import { Collection, AttachmentBuilder, Message, Channel, User, ChannelType, CollectorFilter, MessageCollector } from 'discord.js';

import logger from '../logger';

import path from 'node:path';
import { URL } from 'node:url';
import { promises as fsp } from 'node:fs';

import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);

import * as chrono from 'chrono-node';

import pug from 'pug';
const pugRender = pug.compileFile('src/templates/download.pug');

import { checkPrefix, getChannelFromMention, doNotNotifyReply, getUserFromMention, isRoleFromMention, deleteMessage, appendEdit, replyOrEdit, sleepThenPass, checkAnonymous } from '../utils';
const prefix = checkPrefix();

import {
  fetchIterationsMax,
  fetchPageSize,
  fetchDelay,
  statusMessageDeleteDelay,
  htmlDebugPath,
  cssFilePath,
  botAttribution,
} from '../configuration/config.json';


function downloadChannelCheck(c: Channel | null | undefined ) {
  if (!c || c.isDMBased() || !c.isTextBased() || !c.viewable) return null;
  return c;
}

type DownloadableChannel = Exclude<ReturnType<typeof downloadChannelCheck>, null>;

interface ScanData {
  commandMessage: Message,
  commandMessageArgs: string[],

  scanChannels: Collection<string, DownloadableChannel>,
  allChannels: boolean,
  scanUsers: Collection<string, User>,
  scanDateLimit: Date | null,

  collectionLoadedMessages: Collection<string, Message>,
  collectionMedia: Collection<string, AttachmentData>,
  collectedTotal: number,

  html: string | null,
}

interface FetchData {
  commandMessage: Message,
  commandMessageArgs: string[],
  
  statusMessage?: Message,

  scanChannels: Collection<string, DownloadableChannel>,
  currentChannelId: string,
  scanUsers: Collection<string, User>,
  scanDateLimit: Date | null,

  iterations: number,
  collectedTotal: number,
  collectionFiltered: Collection<string, Message>,
  cancelCollector: MessageCollector,
  earliestSnowflake?: string,
}

interface AttachmentData {
  message: Message,
  basename: string,
  newname: string,
  url: string,
}

const downloadCommand: Command = {

  name: 'download',
  aliases: ['dl', 'save'],
  cancelAliases: ['cancel', 'stop', 'halt'],

  description: `
    Download... something! Takes a channel, then a user, then a time in plain english. 
    Remember you can cancel while this is running.
  `,

  guildOnly: true,

  args: true,
  usage: '[...#channel, here, this, all, any] [@user] [time]',

  async execute(_message, _args) {

    const initData: ScanData = {
      commandMessage: _message,
      commandMessageArgs: _args,

      scanChannels: new Collection(),
      allChannels: false,
      scanUsers: new Collection(),
      scanDateLimit: null,

      collectionLoadedMessages: new Collection(),
      collectionMedia: new Collection(),
      collectedTotal: 0,

      html: null,
    };

    return Promise.resolve(initData)
      .then(steps.parseChannel)
      .then(steps.parseUser)
      .then(steps.parseTime)
      .then(steps.spoutUnderstanding)
      .then(steps.fetchChannelsCombine)
      .then(steps.buildLinkCollection)
      .then(steps.buildDownloadHtml)
      .then(steps.distributeHTMLData);
  },

};

// Parse command arguments ======================================================

const steps = {

  parseChannel: async (data: ScanData) => {
    const { scanChannels, commandMessage: m, commandMessageArgs: a } = data;
    let { allChannels } = data;

    if (scanChannels.size) return data;
    if (!a.length) return data;

    const channelsFound: typeof scanChannels = new Collection();
    while (a.length) {
      const arg = a[0];
      let c = downloadChannelCheck(getChannelFromMention(m, arg));
      if (!c) {
        if (arg.match(/^(this|here)$/i)) {
          c = downloadChannelCheck(m.channel);
        }
        if (arg.match(/^(all|any)$/i)) {
          if (m.channel.type === ChannelType.DM) throw new Error("I really can't do this in a DM!");
          if (!m.channel.guild.available) throw new Error("I don't see your server!");
          allChannels = true;
          const textChannels = m.channel.guild.channels.cache.filter((gc: Channel) => (
            !gc.isDMBased() && 
            gc.isTextBased() && 
            gc.viewable
          ));
          textChannels.each((chan) => {
            const checkedChan = downloadChannelCheck(chan);
            if (checkedChan) channelsFound.set(chan.id, checkedChan);
          });
          a.shift();
          break;
        }
      }
      if (!c) break;
      channelsFound.set(c.id, c);
      a.shift();
    }

    if (!channelsFound.size) throw new Error("I don't see a channel mention, or all/here/this, sorry!");
    logger.debug(`Channels found: ${channelsFound.size}`);
    return {
      ...data,
      scanChannels: channelsFound,
      commandMessageArgs: a,
      allChannels,
    };
  },

  parseUser: async (data: ScanData) => {
    const { scanUsers, commandMessage: m, commandMessageArgs: a } = data;
    if (scanUsers.size) return data;
    if (!a.length) return data;

    const usersFound: typeof scanUsers = new Collection();
    while (a.length) {
      const arg = a[0];
      const u = getUserFromMention(m, arg);
      if (!u) {
        if (isRoleFromMention(arg)) {
          m.reply({
            content: "I don't know what to do with roles and bots. Ignoring that bit!",
            ...doNotNotifyReply,
          });
        }
        break;
      }
      usersFound.set(u.id, u);
      a.shift();
    }

    if (!usersFound.size) {
      // await m.reply("I don't see a user mention, but that's fine I guess!");
      return data;
    }

    logger.debug(`Users found: ${usersFound.size}`);
    return {
      ...data,
      scanUsers: usersFound,
      commandMessageArgs: a,
    };
  },

  parseTime: async (data: ScanData) => {
    const { commandMessageArgs: a, scanDateLimit } = data;
    if (scanDateLimit) return data;
    if (!a.length) return data;

    const s = a.join(' ');
    logger.debug(`Time string to interpret: ${s}`);
    const date = chrono.parseDate(s);

    if (!dayjs(date).isValid()) return data;
    if (!dayjs(date).isBefore()) return data;

    return {
      ...data,
      scanDateLimit: date,
      commandMessageArgs: [],
    };
  },

  spoutUnderstanding: async (data: ScanData) => {
    // Reply with plain english understanding of command
    const {
      commandMessage: m,
      scanChannels: c,
      scanUsers: u,
      allChannels: all,
      scanDateLimit: d,
    } = data;

    /* eslint-disable no-multi-spaces, indent, no-constant-condition */
    let     s =  `I hear you want to scan messages `;
    if (u)  s += `posted by ${[...u.values()].join(' & ')} `;
            s += `in ${all ? 'all channels' : [...c.values()].join(' & ')} `;
    if (d)  s += `since ${dayjs(d).fromNow()} (${dayjs(d).format('MMMM Do YYYY')}) `;
            s += `for any direct attachments. One sec...`;
    /* eslint-enable no-multi-spaces, indent, no-constant-condition */

    const spoutMessage = await m.reply({ content: s, ...doNotNotifyReply });
    logger.info(spoutMessage.cleanContent);
    return data;
  },

  // Fetch data from message history! ===================================================

  statusMessageExpire: (data: FetchData) => {
    if (data.statusMessage)
      deleteMessage(data.statusMessage, statusMessageDeleteDelay);
    return data;
  },

  fetch: (fetchData: FetchData): Promise<FetchData> => {
    const { scanChannels, currentChannelId, earliestSnowflake } = fetchData;

    const currentChannel = scanChannels.get(currentChannelId)
    const downloadableChannel = downloadChannelCheck(currentChannel);
    if (downloadableChannel === null ) 
      throw new Error(`That channel isn't available to me right now. It may not be a text channel, or a DM, or I may not have permission to see it.`);

    return downloadableChannel.messages
      .fetch({ before: earliestSnowflake, limit: fetchPageSize })
      .then(async (messages) => {
        const {
          commandMessage,
          statusMessage,
          scanChannels,
          currentChannelId,
          scanUsers,
          scanDateLimit,
        } = fetchData;
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
          if (statusMessage)
            deleteMessage(statusMessage);
          throw new Error('I\'m cancelling!');
        }

        // CHECK FOR NOTHING / END / MAXLOOP / TIME
        const noMessages = !messages.size;
        const reachedDebugMax = fetchIterationsMax && i > fetchIterationsMax;
        let pastTimeLimit = false;
        if (!noMessages && scanDateLimit) {
          const timestamps = messages.map(m => m.createdTimestamp);
          const newestTimestamp = timestamps.reduce((a, b) => Math.max(a, b), -Infinity);
          const newestDate = messages.find(m => m.createdTimestamp === newestTimestamp)?.createdAt ?? null;
          if (dayjs(newestDate).isValid()) {
            pastTimeLimit = dayjs(newestDate).isBefore(scanDateLimit);
          }
        }
        if (noMessages || reachedDebugMax || pastTimeLimit) {
          if (statusMessage) {
            return appendEdit(statusMessage, ` Finished!`)
              .then(message => {
                logger.info(message.cleanContent);
                return { ...fetchData, statusMessage: message };
              })
              .then(steps.statusMessageExpire);
          }
          // Simple return if no status to report
          return fetchData;
        }

        // GET EARLIEST
        const timestamps = messages.map(m => m.createdTimestamp);
        const earliestTimestamp = timestamps.reduce((a, b) => Math.min(a, b), Infinity);
        earliestSnowflake = messages.findKey(m => m.createdTimestamp === earliestTimestamp);

        // FILTER /////////////////////////////////////////////////////////////////////////

        // Filter attachments, make sure at least one attachment or embed
        let creme = messages.filter(m => { 
          if (m.attachments.size) return true;
          // Embed property 'type' is deprecated
          // if (m.embeds.length) return m.embeds.some(e => new RegExp('image|video').test(e.type));
          return false;
        });

        // Filter for specced users
        if (scanUsers && scanUsers.size) {
          creme = creme.filter(m => scanUsers.some(u => u.id === m.author.id));
        }

        // Filter for date
        if (scanDateLimit) {
          creme = creme.filter(m => dayjs(m.createdAt).isSameOrAfter(scanDateLimit));
        }

        // UPDATE DATA /////////////////////////////////////////////////////////////
        collectedTotal += messages.size;
        collectionFiltered = collectionFiltered.concat(creme);

        // REPORT AND LOOP
        return replyOrEdit(commandMessage, statusMessage,
          `for ${scanChannels.get(currentChannelId)} I see ${collectionFiltered.size}/${collectedTotal} results here from ${i}${fetchIterationsMax ? `/${fetchIterationsMax}` : ''} pass${i !== 1 ? 'es' : ''}!`)
          .then(message => ({
            ...fetchData,
            statusMessage: message,
            iterations,
            earliestSnowflake,
            collectedTotal,
            collectionFiltered,
          }))
          .then(sleepThenPass(fetchDelay))
          .then(steps.fetch);
        }   
      );
  },


  fetchChannelsCombine: (data: ScanData) => {

    // Setup cancelling by command
    const cancelRegex = new RegExp(`^\\${prefix}(${downloadCommand.cancelAliases?.join('|')})$`, 'i');
    const filter: CollectorFilter<[Message<boolean>, Collection<string, Message<boolean>>]> = 
      m => typeof downloadCommand.cancelAliases !== 'undefined' &&
           cancelRegex.test(m.content) &&
           m.author.id === data.commandMessage.author.id;
    const cancelCollector = data.commandMessage.channel.createMessageCollector({ filter, max: 1 });
    cancelCollector.on('collect', m => { logger.debug(`Collected ${m.content}`) });

    // Start Per-Channel Fetch in Parallel
    const fetches = data.scanChannels.map((c, k) => {
      const fetchInitData: FetchData = {
        commandMessage: data.commandMessage,
        commandMessageArgs: data.commandMessageArgs,
        statusMessage: undefined,

        scanChannels: data.scanChannels && data.scanChannels.clone(),
        currentChannelId: k,
        scanUsers: data.scanUsers && data.scanUsers.clone(),
        scanDateLimit: data.scanDateLimit,

        iterations: 0,

        collectedTotal: 0,
        collectionFiltered: new Collection(),

        cancelCollector,

        earliestSnowflake: undefined,
      };

      return steps.fetch(fetchInitData); // recursive
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
      collectionLoadedMessages = new Collection<string, Message<boolean>>()
        .concat(...filteredEach);
      return { ...data, collectedTotal, collectionLoadedMessages };
    });

  },


  // Prepare for export ====================================================================

  buildLinkCollection: (data: ScanData) => {
    if (!data.collectionLoadedMessages || !data.collectionLoadedMessages.size) throw new Error('No messages, no attachments! Simple as that!');

    const { collectionMedia, collectionLoadedMessages } = data;

    const messages = collectionLoadedMessages;
    const allAttachments: typeof collectionMedia = new Collection();

    messages.each((m, sfm) => {

      const ingestAttachmentEmbed = (key: string, url: string) => {
        const username = m.author.username.replace(/[^\w-]+/g, '') || m.author.tag;
        const createdString = dayjs(m.createdAt).format('YYYYMMDD-HHmmss');
        let basename = path.basename(new URL(url).pathname);
        basename = basename.replace(/^(SPOILER_)/, '');
        const guildName = m.guild?.name || 'GUILD';
        const channelName = (
          m.channel.isTextBased() && 
          !m.channel.isDMBased() && 
          m.channel?.name
        ) || 'CHANNEL';

        const newname = path.join(guildName, channelName, `${username}_${createdString}_${basename}`);

        allAttachments.set(key, {
          message: m,
          basename,
          newname,
          url,
        });
      };

      m.attachments.each((a, sfa) => ingestAttachmentEmbed(sfa, a.url));

      // TODO embeds
      // m.embeds.forEach((e, i) => {
      //   const garbageSnowflake = `${sfm}-embed-${i}`;
      //   if (new RegExp('image|video').test(e.type) && e.url) ingestAttachmentEmbed(garbageSnowflake, e.url);
      // });
    });

    if (!allAttachments.size) throw new Error('Seems there weren\'t any attachments in your search results!');

    return { ...data, collectionMedia: allAttachments };
  },

  buildDownloadHtml: async (data: ScanData) => {
    const {
      scanChannels,
      allChannels: all,
      scanUsers,
      scanDateLimit,
      collectionMedia,
    } = data;

    // Last Check
    if (!scanChannels.size) throw new Error('No channels to scan!');

    const css = await fsp.readFile(cssFilePath)
      .then(txt => Buffer.from(txt).toString('base64'));

    const html = pugRender({
      dayjs, // import
      server: scanChannels.first()?.guild?.name ?? 'SERVER',
      iconURL: scanChannels.first()?.guild?.iconURL({ forceStatic: true }) ?? '',
      channels: all ? 'all' : scanChannels.map(c => c.name).join('&#'),
      users: (scanUsers && scanUsers.size) ? scanUsers.map(u => u.tag).join(' & ') : null,
      attachments: [...collectionMedia.values()],
      stylesheet: `data:text/css;base64,${css}`,
      dateLimit: dayjs(scanDateLimit).isValid() ? scanDateLimit : null,
      botAttribution: checkAnonymous() ? null : botAttribution,
    });

    return { ...data, html };
  },

  distributeHTMLData: (data: ScanData) => {
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

    let server = scanChannels.first()?.guild?.name ?? 'SERVER';
    let channel = null;
    if (all) channel = 'all';
    if (!channel && scanChannels.size === 1) channel = scanChannels.first()?.name ?? 'CHANNEL';
    if (!channel) channel = `${scanChannels.size}channels`;

    const attachment = new AttachmentBuilder(htmlData, {
      name: `${server.replace(' ', '')}_${channel}_attachments.html`,
    });
    return commandMessage.reply({ content: `Here you go!`, files: [attachment] })
      .then(() => data);
  },
};

export default downloadCommand;
