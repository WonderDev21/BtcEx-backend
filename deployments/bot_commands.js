const _ = require('lodash');
const userService = require('../services/user.service');
const {filterUserObj} = require('../utils/jsonUtils');
let inProgress = false;
let counter = 0;
const definedCommands = ['users', 'history', 'buyorders', 'sellorders'];

const commandsMap = {
  'users': 'users',
  'history': 'history',
  'buyorders': 'buyorders',
  'sellorders': 'sellorders',
};
const onEvent = async ({command, channel, rtm}) => {
  if(commandsMap[command]) {
    switch(commandsMap[command]) {
      case 'users':
        // const users = await userService.getAllUser();
        // const usersList = users.map(x => ([x.fullName, x.email, x.phone, x.isVerified, x.kycVerified]));
        // return rtm.send({text: getUserTable(usersList), channel: channel, type: 'message'});
        return rtm.sendMessage('no commands to execute', channel);
      default:
        return rtm.sendMessage('no commands to execute', channel);
    }
  } else {
    rtm.sendMessage(`command '${command}' not found. You need to specify one of these commands [${Object.keys(commandsMap).join(', ')}]`, channel);
  }
};
const getUserTable = (data) => {
  const padSize = 12;
  const header = ['Name', 'Email', 'Contact', 'Verified', 'KYCStatus'];
  const paddedHeader = '|'+header.map(h => _.pad(h, padSize)).join('|')+'|\n';
  const lists = data.map(item => {
    const paddedItem = item.map(i => _.pad(String(i).substr(0, 12), padSize));
    return '|'+ paddedItem.join('|') +'|';
  });
  const users = lists.join('\n');
  return '```'+paddedHeader+users + '```';
};
module.exports = onEvent;
