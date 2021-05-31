const rtm = require('../setup/bot.js');
const config = require('../config');
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
// const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const onEvent = require('./bot_commands.js');

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(event) {
  console.log('Got event', event);
  if ((event.subtype === 'message_changed' || event.subtype === 'message_deleted')) {
    return rtm.sendMessage('Please dont change the message and expect me to correct your past mistakes', event.channel);
  }
  if (event.subtype) {
    return;
  }
  if (event.type === 'message' && event.text && event.text.indexOf('<@U7ST3T2E4>') > -1 && event.channel && event.channel === config.SLACK_CHANNEL) {
    var input = event.text.trim().replace('<@U7ST3T2E4> ', '');
    console.log('Got input', input);
    const arr = input.split(' ');
    const command = arr[0];
    console.log('Got command', command);
    onEvent({command, channel: event.channel, rtm});
  }
});
module.exports = rtm;
