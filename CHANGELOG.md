# Changelog

## [v0.5.0](https://github.com/chrsmlls333/ketchum-discord-bot/compare/v0.4.3...v0.5.0) - 2021-10-11
### Additions
- Added `PREFIX` environment variable
  - Allows to override the config variable for setting command prefix
### Changes
- Upgrade to Node 16.11, with >=16.6 being a requirement.
- Upgrade to discord.js v13, which had a lot of changes.
### Fixes
- Fixed #21 during upgrade, not verified or tested so leaving issue open.
- Fix changelog dates.


## [v0.4.3](https://github.com/chrsmlls333/ketchum-discord-bot/compare/v0.4.2...v0.4.3) - 2021-10-10
### Fixes
- Versions updated according to npm audit


## [v0.4.2](https://github.com/chrsmlls333/ketchum-discord-bot/compare/v0.4.1...v0.4.2) - 2021-10-10
### Changes
- Minor additions to error reporting
- Organize source files, should be no noticeable difference
### Fixes
- Version stepping inconsistencies
  - TODO need a script to auto-update version and add tag
- Heroku node & npm versions were floating


## [v0.4.1](https://github.com/chrsmlls333/ketchum-discord-bot/compare/v0.4.0...v0.4.1) - 2020-11-27
### Fixes
- Adjust github link in config to updated repo name


## [v0.4.0](https://github.com/chrsmlls333/ketchum-discord-bot/compare/v0.3.0...v0.4.0) - 2020-11-27
### Additions
- Added download#parsetime natural language parameter using `chrono-node`
  - Interpretation
  - Reporting/feedback/notification
  - Filtering
  - Fetch cutoff
- Added `ANONYMOUS` environment variable
  - Removes all attribution to source code in deliverables and help replies
- Polish readmes and descriptions a bit

### Changes
- download#parseUser no longer notifies when it doesn't detect anything
- Bot info is now handled in config, including name and social links for easy adjustment.
### Fixes
- download#buildLinkCollection: Fixed attachment parsing not detecting when its not provided with messages to parse
- Refactors to make parameter object diving clear


## [v0.3.0](https://github.com/chrsmlls333/ketchum-discord-bot/compare/v0.2.0...v0.3.0) - 2020-11-27
### Additions
- Add MIT License
- Local asset injection for Bootstrap v4.4.1 CSS, 
  - Base64 inline
  - Larger deliverable HTML files
  - Reducing reliance on external CDN server
- Help command 
  - Now lists cancel commands/aliases
  - Added alias 'h'
### Changes
- Dependency update
- Replace Moment.js with Day.js
### Fixes
- Patch deprecation (Discord.js generateInvite client method)
- Download command cancelling prefix was hardcoded
- Refactors to avoid modifying function parameter objects
### Other
- Prepare for natural language time interpretation in next version


## [v0.2.0](https://github.com/chrsmlls333/ketchum-discord-bot/compare/v0.1.0...v0.2.0) - 2020-04-05
### Additions
- Add `invite` Command
### Changes
- Altered the Rich Embed templating to remove the image and highlight the author
- Change formatting of Help dialogs
- Remove all pounds/hashes from suggested filepath in attachments.html
### Fixes
- Fix eslint errors 
- Refactor more functionality to utils
- Add basic write premission check ([#1](https://github.com/chrsmlls333/Ketchum-Bot-for-Discord/issues/1))
- Make deliverables seperate, not reliant on one possibly failing.


## v0.1.0 - 2020-04-03
### First Working Draft
Includes basic Heroku integration and on-demand processing of channel/all downloading, with filtering for usernames.