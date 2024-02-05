# ketchum-discord-bot ✨
![Version](https://img.shields.io/badge/version-0.5.0-blue.svg?cacheSeconds=2592000)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

> Simple Discord bot to download all images and files with attribution (hopefully). Supports specifying channels, users, and time ranges (time in natural language).

## Note

Requires the Message Contents Privileged Intent on the Discord Developer Portal!
Slash Commands are not yet implemented.

## Install

0. Install NVM, then
   - `npx nvm-auto`
0. `npm install -g ts-node typescript '@types/node'`
0. ``
1. Build `npm install`
2. Optional but recommended: `npm install pm2 -g`
3. Prepare your environment variable or `.env`
   1. Enter your Discord `BOT_TOKEN`
   2. Set `ANONYMOUS` mode
   3. Set your `PREFIX`
4. List our tasks: `npx ntl`
5. Run `npm run start` or `npm run start:basic`

TODO: Document tasks/debug processes

- https://pm2.keymetrics.io/docs/usage/docker-pm2-nodejs/

## Update

`npx npm-check-updates [-u]`

## Using the Lists

Downloading the provided link lists is done with [DownThemAll](https://www.downthemall.net/), mostly for its ability to collate the links and save them with preset titles stored in the title attribute. If you have alternative tools to scrape these linkpages, please get in touch!

## Author

👤 **Chris Mills**

* Website: http://www.chriseugenemills.com/
* Github: [@chrsmlls333](https://github.com/chrsmlls333)

## Show your support

Give a ⭐️ if this project helped you!


***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_