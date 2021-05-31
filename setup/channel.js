var channels = {};
module.exports = {
    setChannel: (channelId, channelInstance) => {
        if(!channels[channelId]) {
            channels[channelId] = channelInstance;
        } else {
            console.error('Channel instance already exists for', channelId);
        }
    },
    getChannel: (channelId) => {
        return channels[channelId];
    }
};
