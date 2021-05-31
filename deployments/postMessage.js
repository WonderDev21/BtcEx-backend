const rtm = require('../setup/bot.js');
const config = require('../config');
const {MessageTypes} = require('../constants/slackConstants.js');

const orderChannel = config.ORDER_SLACK_CHANNEL;
const generalChannel = config.SLACK_CHANNEL;
const sendAdminNotification = (type, data) => {
  if(MessageTypes[type]) {
    // send message;
    try {
      if (rtm && rtm.ws) {
        let channel = generalChannel;
        if(MessageTypes[type].indexOf('ORDER') > -1) {
          channel = orderChannel;
        };
        rtm.send({
          text: '```'+ MessageTypes[type] + '\n'+ JSON.stringify(data) + '```',
          channel: channel,
          type: 'message'
        });
      } else {
        console.log('Slackbot not Active');
      }
    } catch(error) {
      console.log('Some error while posting to slack channel', error);
    }
  }
};
module.exports = sendAdminNotification;
