# Changelog

## v0.4.1 - 2020-11-27
### Fixes
- Adjust github link in config to updated repo name


## v0.4.0 - 2020-11-27
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


## v0.3.0 - 2020-11-27
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


## v0.2.0 - 2020-04-05
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