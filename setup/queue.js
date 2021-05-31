const {channelNames} = require('../constants/channelConstants');
const {NotificationTypes} = require('../constants/notificationConstants');

var Queue = function() {
    function Queue(amqpUrl, socket) {
        this.amqp =  require('amqplib-easy')( amqpUrl);
        this.socket = socket;
        this.amqp.consume({exchange: 'cat', queue: channelNames.TRADE},  ({json}) => {
           const {type, data} = json;
           console.log('Found data', type);
           switch(type) {
             case NotificationTypes.GOT_NEW_ORDER:
                this.socket.sendOrderNotification(data);
             break;
             case NotificationTypes.CANCEL_USER_ORDER:
                this.socket.sendCancelledOrderNotification(data);
             break;
             case NotificationTypes.TRADE_UPDATE:
                this.socket.sendNewTradeNotification(data);
             break;
             case NotificationTypes.ACCOUNT_UPDATE:
                this.socket.sendUserAccountNotification(data);
             break;
             case NotificationTypes.MARKET_TICKER:
                this.socket.sendMarketTickerNotification(data);
             break;
             default:
                console.log('Unknown notification type', type);
                // this.socket.sendOrderNotification(data.json);
           }
        });
    }
    Queue.prototype.publish = function (order) { 
      console.log('AMQP');
    //this.amqp.publish({ exchange: 'test' }, 'found.tawny', { name: order });
    };
    Queue.prototype.sendToQueue = function (type, object) {
        console.log('sending to queue');
        try{
            this.amqp.sendToQueue({queue: channelNames.TRADE}, {type: type, data: object});
        } catch(err){
            console.log('Erro in senfing to queue', err);
        }
        
    };
    return Queue;
}();

module.exports = Queue;
