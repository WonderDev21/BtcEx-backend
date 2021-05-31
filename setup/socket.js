const {NotificationTypes} = require('../constants/notificationConstants');
const {filterAccounts} = require('../utils/jsonUtils.js');
const {currencyTypes} = require('../constants/orderConstants');
const redisConstants = require('../constants/redisConstants');
const redisService = require('../services/redis.service');

const Socket = function() {
    function Socket(channelId, io) {
      this.channelId = channelId;
      this.io = io;
      this.socket = {emit: ()=> {}};
      io.on('connection',  (socket) => {
        this.socket = socket;
        console.log(`New User connected on ${channelId}`, socket.id);
        socket.emit(channelId, {msg: 'Hello'});
        socket.on('disconnect', async function() {
            await redisService.deleteValue(socket.userId);
        });
        socket.on('setsession', async function(userId) {
            socket.userId = userId;
            await redisService.setExpire(userId, socket.id, 86400);
        });
        socket.on('orders', async function(currency = currencyTypes.ETH) {
            const orderService = require('../services/order.service');
            const orders = await orderService.getCurrencyOrder(currency);
            socket.emit('orders', orders);
        });
        socket.on('trades', async function(currency = currencyTypes.ETH) {
            const tradeService = require('../services/trade.service');
            const trades = await tradeService.getAllTrades(currency);
            socket.emit('trades', trades);
        });
        socket.on('transactions', async function(userId) {
            const transactionService = require('../services/transaction.service');
            const transactions = userId && await transactionService.getUserTransactions(userId);
            socket.emit('transactions', transactions);
        });
        socket.on('mypendingorders', async function(userId, currency = currencyTypes.ETH) {
            const orderService = require('../services/order.service');
            const orders = await orderService.getUserPendingOrders(userId, currency);
            socket.emit('mypendingorders', orders);
        });
        socket.on('myorders', async function(userId, currency = currencyTypes.ETH) {
            const orderService = require('../services/order.service');
            const orders = await orderService.getOrdersByUserId(userId, currency);
            socket.emit('myorders', orders);
        });
        socket.on('myaccounts', async function(userId) {
            const accountService = require('../services/account.service');
            const accounts = await accountService.getBalanceByUserId({userId: userId});
            socket.emit('myaccounts', filterAccounts(accounts));
        });
        socket.on('prices', async function() {
            const rates = await redisService.getValue('MARKET_PRICE');
            if(rates) {
                socket.emit('prices', JSON.parse(rates));
                return;
            }
            const orderService = require('../services/order.service');
            const prices = await orderService.getCurrencyBestSellers();
            await redisService.setExpire('MARKET_PRICE', JSON.stringify(prices), 20);
            socket.emit('prices', prices);
        });
        socket.on('announcement', async function() {
            const announcement = await redisService.getValue(redisConstants.ANNOUNCEMENT);
            socket.emit('announcement', announcement);
        });
        socket.on('ieo-stats', async function(token) {
            const sold = await redisService.getValue(`IEO_SALE_${token}`);
            if(!sold) {
                const ieoService = require('../services/ieo.service');
                const saleCount = await ieoService.getAllIEOPurchases(token);
                await redisService.setValue(`IEO_SALE_${token}`, saleCount);
                socket.emit('ieo-stats', {token, sold: saleCount});
                return;
            }
            socket.emit('ieo-stats', {token, sold});
        });
      });
    }
    Socket.prototype.sendNewAnnouncement = async function() {
        const announcement = await redisService.getValue(redisConstants.ANNOUNCEMENT);
        this.io.sockets.emit('announcement', announcement);
    };
    Socket.prototype.sendIEOPurchaseNotification = async function(tokenStats) {
        this.io.sockets.emit('ieo-stats', tokenStats);
    };
    Socket.prototype.sendOrderNotification = async function (order) {
        const orderService = require('../services/order.service');
        const accountService = require('../services/account.service');
        const orders = await orderService.getCurrencyOrder(order.currency);
        this.io.sockets.emit(this.channelId, {type: NotificationTypes.GOT_NEW_ORDER, data: orders});
        const sockId = await redisService.getValue(order.userId);
        if (sockId) {
            const userPendingOrders = await orderService.getUserPendingOrders(order.userId, order.currency);
            const userOrders = await orderService.getOrdersByUserId(order.userId, order.currency);
            const accounts = await accountService.getBalanceByUserId({userId: order.userId});
            this.io.to(sockId).emit('mypendingorders', userPendingOrders);
            this.io.to(sockId).emit('myorders', userOrders);
            this.io.to(sockId).emit('myaccounts', filterAccounts(accounts));
        }
    };
    Socket.prototype.sendNewTradeNotification = async function (trades) {
        this.io.sockets.emit(this.channelId, {type: NotificationTypes.TRADE_UPDATE, data: trades});
        const orderService = require('../services/order.service');
        const accountService = require('../services/account.service');
        const currency = trades[0].currency;
        const orders = await orderService.getCurrencyOrder(currency);
        this.io.sockets.emit(this.channelId, {type: NotificationTypes.GOT_NEW_ORDER, data: orders});
        for(let i=0;i<trades.length;i+=1) {
            const {sellUserId, buyUserId} = trades[i];
            const buyerSockId = await redisService.getValue(buyUserId);
            const sellerSockId = await redisService.getValue(sellUserId);
            const buyUserPendingOrders = await orderService.getUserPendingOrders(buyUserId, currency);
            const sellUserPendingOrders = await orderService.getUserPendingOrders(sellUserId, currency);
            const buyUserOrders = await orderService.getOrdersByUserId(buyUserId, currency);
            const sellUserOrders = await orderService.getOrdersByUserId(sellUserId, currency);

            const buyUserAccounts = await accountService.getBalanceByUserId({userId: buyUserId});
            const sellUserAccounts = await accountService.getBalanceByUserId({userId: sellUserId});

            this.io.to(buyerSockId).emit('mypendingorders', buyUserPendingOrders);
            this.io.to(buyerSockId).emit('myorders', buyUserOrders);
            this.io.to(buyerSockId).emit('myaccounts', filterAccounts(buyUserAccounts));

            this.io.to(sellerSockId).emit('mypendingorders', sellUserPendingOrders);
            this.io.to(sellerSockId).emit('myorders', sellUserOrders);
            this.io.to(sellerSockId).emit('myaccounts', filterAccounts(sellUserAccounts));
        }
    };
    Socket.prototype.sendCancelledOrderNotification = async function (order) {
        const orderService = require('../services/order.service');
        const accountService = require('../services/account.service');
        const orders = await orderService.getCurrencyOrder(order.currency);
        this.io.sockets.emit(this.channelId, {type: NotificationTypes.CANCEL_USER_ORDER, data: orders});
        const sockId = await redisService.getValue(order.userId);
        if (sockId) {
            const userPendingOrders = await orderService.getUserPendingOrders(order.userId, order.currency);
            const userOrders = await orderService.getOrdersByUserId(order.userId, order.currency);
            const accounts = await accountService.getBalanceByUserId({userId: order.userId});
            this.io.to(sockId).emit('mypendingorders', userPendingOrders);
            this.io.to(sockId).emit('myorders', userOrders);
            this.io.to(sockId).emit('myaccounts', filterAccounts(accounts));
        }
    };
    Socket.prototype.sendUserAccountNotification = function (account) {
        this.socket.emit(this.channelId, {type: NotificationTypes.ACCOUNT_UPDATE, data: account});
    };
    Socket.prototype.sendMarketTickerNotification = function (tickerData) {
        this.io.sockets.emit(this.channelId, {type: NotificationTypes.MARKET_TICKER, data: tickerData});
    };
    return Socket;
}();
module.exports = Socket;
