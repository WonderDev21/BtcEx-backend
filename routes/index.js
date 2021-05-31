const express = require('express');
const multer = require('multer');

const upload = multer({dest: 'temp/', limits: {fileSize: 20 * 1024 * 1024}}); // 20 MB size limit
const uploadSmall = multer({dest: 'temp/', limits: {fileSize: 3 * 1024 * 1024}}); // 3 MB size limit

const accountController = require('../controllers/account.controller');
const documentController = require('../controllers/document.controller');
const orderController = require('../controllers/order.controller');
const tradeController = require('../controllers/trade.controller');
const userController = require('../controllers/user.controller');
const transactionController = require('../controllers/transaction.controller');
const statementController = require('../controllers/statement.controller');
const requestController = require('../controllers/request.controller');
const jobController = require('../controllers/job.controller');
const tickerController = require('../controllers/ticker.controller');
const chartController = require('../controllers/chart.controller');
const adminController = require('../controllers/admin.controller');
const ieoController = require('../controllers/ieoProject.controller');
const coinGeckoController = require('../controllers/coinGecko.controller');
const coinMarketCapController = require('../controllers/coinmarketcap.controller');
const cashfreeController = require('../controllers/cashfree.controller');

const attachUser = require('../middlewares/auth.middleware');
const attachAdmin = require('../middlewares/auth.admin.middleware');
const verifyJob = require('../middlewares/job.middleware');
const kycVerified = require('../middlewares/kycVerified.middleware');
const emailVerified = require('../middlewares/emailVerified.middleware');
const blockRequest = require('../middlewares/block.middleware');
// const isSameUser = require('../middlewares/user.middleware');
// const isValidRequest = require('../middlewares/proxy.middleware');

// eslint-disable-next-line new-cap
const router = express.Router();

//document
router.post('/user/:userId/kyc', attachUser, emailVerified, upload.any(), documentController.submitKYC);
// router.put('/user/:userid', documentController.submitUserData);

// Order
// router.get('/order/:orderId', orderController.getOrderByOrderId);
router.post('/order/neworder/:userId', attachUser, emailVerified, orderController.placeNewOrder); //ser
router.get('/orders', orderController.getAllOrders);
router.get('/orders/:userId', attachUser, emailVerified, kycVerified, orderController.getOrdersByUserId);
router.get('/orders/pending/:userId', attachUser, emailVerified, kycVerified, orderController.getUserPendingOrders);
router.get('/orders/cancel/:orderId', attachUser, emailVerified, kycVerified, orderController.cancelOrder);

// Trade
router.get('/trades', tradeController.getTrades);
router.get('/alltrades', tradeController.getAllCurrencyTrades);
router.get('/trades/:userId', attachUser, emailVerified, kycVerified, tradeController.getUserTrades);

// User
router.get('/me', attachUser, userController.getUserDetails);
router.get('/announcements', userController.getAnnouncements);
router.get('/fees', userController.getTradeFees);

router.post('/login', userController.requestSignInOTP);
router.post('/loginOTP', userController.SignInOTP);
router.post('/resendOTP', userController.resendOTP);
router.post('/user/updatePassword', userController.resetPassword); //needs token in body
router.post('/user/:userId/updatePassword', attachUser, userController.updatePassword); // middleware required
router.post('/user/:userId/updatePhone', attachUser, userController.updatePhone); // middleware required
router.post('/user/forgotPassword', userController.sendForgotPasswordEmail);

router.get('/user/:userId/get2FA', attachUser, userController.get2FAKeys);
router.post('/user/:userId/enable2FA', attachUser, userController.enable2FA);
router.post('/user/:userId/disable2FA', attachUser, userController.disable2FA);
router.post('/user/:userId/verify2FA', attachUser, userController.verify2FA);

router.post('/register', userController.registerUser);

router.get('/user/:userId', blockRequest, userController.getUser);
router.post('/user/logout', userController.logoutUser);

router.post('/user/verify', userController.verifyUser);
router.post('/user/resendVerificationEmail', userController.resendVerificationEmail);
// router.get('/users/alluser', userController.getAllUser);

router.get('/user/:userId/orders', attachUser, emailVerified, kycVerified, userController.getAllUserOrders);
router.get('/user/:userId/getWallet', attachUser, emailVerified, kycVerified, userController.getWalletAddress);
// Transaction
router.post('/transaction/new' , attachUser, emailVerified, kycVerified, transactionController.newTransaction);
router.post('/transaction/:userId/withdraw' , attachUser, emailVerified, kycVerified, transactionController.getWithdrawalOTP);
router.post('/transaction/:userId/withdrawByOTP' , attachUser, emailVerified, kycVerified, transactionController.withdrawByOTP);

router.post('/request/:userId/deposit' , attachUser, emailVerified, upload.any(), requestController.createRequest);
router.get('/requests/:userId' , attachUser, emailVerified, requestController.getUserRequests);
// router.post('/transaction/transfer' ,transactionController.transferEth);
// router.get('/transactions' , transactionController.getAllTransaction); // TODO REMOVE THIS
router.get('/accountStatement/:userId', attachUser, emailVerified, statementController.getAccountStatement);

router.get('/transactions/user/:userId', attachUser, emailVerified, kycVerified, transactionController.getUserTransactions);
router.post('/payment/new', transactionController.hashPayUObjects);
/* For Payment gateway */
router.post('/transaction/retrive', transactionController.retrivePayment);

/* Fixer API */

router.get('/exchange-rates', tickerController.getConversionRates);

router.get('/ieos', ieoController.getAllIEOProjects);
router.get('/ieo/:slug', ieoController.getIEOProject);
router.post('/ieo', attachAdmin, ieoController.addIEOProject);
router.put('/ieo/:slug', attachAdmin, ieoController.updateIEOProject);

router.get('/ieos/balance', attachUser, emailVerified, kycVerified, ieoController.getAllIEOPurchases);
router.post('/ieo/:slug/order', attachUser, emailVerified, kycVerified, ieoController.createNewSale);
router.post('/upload', attachUser, emailVerified, uploadSmall.any(), documentController.uploadDocument);
router.post('/bankInfo/add', attachUser, emailVerified, documentController.submitUserData);

/*
//Ether transaction
router.post('/transaction/ether', etherController.transferEth);
router.post('/transfer/ripple', etherController.transferRipple);
router.post('/transfer/bitcoin', etherController.transferBitcoin);
router.get('/balance/ripple/:address', etherController.getRipples);
router.post('/ethereum/getprivatekey', etherController.getPrivateKey);

//Ethereum Classic transaction
router.post('/transaction/etherclassic', etherController.transferEtherClassic);
router.post('/etherclassic/createwallet/:userId', etherController.createEtherClassicWallet);
router.post('/etherclassic/getprivatekey', etherController.getPrivateKey);
*/

// Ticker
router.get('/ticker', blockRequest, tickerController.getTicker);
router.get('/prices', tickerController.getAllCurrencyPrice);
router.get('/publicTicker', tickerController.getCurrencyPriceList);
router.get('/graph', tickerController.getCurrencyGraph);

router.get('/charts/history', chartController.getGraph);
router.get('/charts/symbol_info', chartController.getCurrencyInfo);
router.get('/charts/symbols', chartController.getCurrencyInfo);
router.get('/charts/config', chartController.getConfig);
router.get('/charts/time', chartController.getTime);
router.get('/charts/marks', chartController.getMarks);

// admin
router.get('/allusers', attachAdmin, userController.getAllUser);
router.get('/allorders', attachAdmin, orderController.getAllOrdersAdmin);
router.get('/allaccounts', attachAdmin, accountController.getAllAccounts);

router.get('/alltransactions', attachAdmin, transactionController.getAllTransaction);
router.get('/admin/alltrades', attachAdmin, tradeController.getAllTradesAdmin);

router.put('/admin/user/:userId/kyc', attachAdmin, adminController.updateKYC); // not yet done
router.put('/admin/user/:userId/verifyKYC', attachAdmin, adminController.verifyKYC); // not yet done
router.get('/admin/trades', adminController.getTradeInvoices); // not yet done

router.put('/admin/user/update', attachAdmin, userController.updateUser);
router.get('/admin/accountStatement/:userId', attachAdmin, statementController.getAccountStatement);
router.get('/admin/requests' , attachAdmin, requestController.getAllRequests);
router.put('/admin/request/:requestId/update' , attachAdmin, requestController.updateRequest);
// router.post('/admin/user/creditBalance', attachAdmin, accountController.creditBalance);
// router.post('/admin/user/debitBalance', attachAdmin, accountController.debitBalance);

router.delete('/admin/order/cancel/:orderId', attachAdmin, orderController.cancelOrder);
router.get('/document/user/:userId', attachAdmin, documentController.getDocumentByUserId);

router.get('/admin/transaction/:transactionId' , attachAdmin, adminController.getTransaction);
router.post('/admin/transaction/add' , attachAdmin, transactionController.addTransaction);
router.put('/admin/transaction/update' , attachAdmin, transactionController.updateUserTransaction);

router.post('/admin/orders/restart' , attachAdmin, orderController.restartTrading);

router.put('/admin/update/order', attachAdmin, orderController.updateOrder);

router.post('/admin/announce', attachAdmin, adminController.announceUsers);
router.delete('/admin/announce', attachAdmin, adminController.clearAnnouncement);

router.post('/admin/remind/kyc', attachAdmin, adminController.sendKYCReminder);
router.put('/admin/account/:accountId/address', attachAdmin, adminController.updateWalletAddress);

router.post('/admin/withdraw/:transactionId/process', attachAdmin, jobController.withdrawCoinsByUser);
router.post('/admin/withdrawINR/:transactionId/process', attachAdmin, jobController.withdrawINRByUser);
// router.post('/job/transaction/addCoins', verifyJob, jobController.depositCoinsByUser);
router.post('/job/deposit', verifyJob, jobController.depositCoinsByUser); // Coins deposited by user
router.post('/job/depositINR', verifyJob, jobController.depositINRByUser); // INR deposited by user
router.post('/job/withdrawalStatus', verifyJob, jobController.updateWithdrawalStatus);

router.post('/save/user-kyc', documentController.saveKYC);

// Endpoints of CoinGecko
router.get('/pairs', coinGeckoController.getPairs);
router.get('/tickers', coinGeckoController.getTickers);
router.get('/orderbook', coinGeckoController.getOrderbook);
router.get('/historical_trades', coinGeckoController.getTradeHistory);

// Endpoints of CoinMarketCap
router.get('/api/v1/summary', coinMarketCapController.getSummary);
router.get('/api/v1/asset', coinMarketCapController.getAssets);
router.get('/api/v1/ticker', coinMarketCapController.getTickers);
router.get('/api/v1/orderbook/:market_pair', coinMarketCapController.getOrderbook);
router.get('/api/v1/trades/:market_pair', coinMarketCapController.getTrades);

// endPoint to convert source currency to destination currency.
router.post('/convert-currency', attachUser, emailVerified, kycVerified, accountController.convertCurrency);

// cashfree payment gateway routes.
router.post('/pg/order/create', cashfreeController.createOrder);
router.get('/pg/order/info/link', cashfreeController.orderInfoLink);
router.get('/pg/order/info/', cashfreeController.orderInfo);
router.get('/pg/order/info/status', cashfreeController.orderStatus);
router.get('/pg/order/email', cashfreeController.orderPaymentEmail);
router.post('/pg/order/refund', cashfreeController.orderRefund);
router.get('/pg/refunds', cashfreeController.getRefunds);
router.get('/pg/refundStatus', cashfreeController.getRefund);
router.get('/pg/settlements', cashfreeController.getSettlements);
router.get('/pg/settlement', cashfreeController.getSettlement);

// cashfree auto collect routes.
router.post('/ac/create-va', cashfreeController.createVA);
router.get('/ac/all-va', cashfreeController.getAllVA);
router.post('/cashfree-payout-webhook', cashfreeController.payoutWebhook);
router.post('/cashfree-autocollect-webhook', cashfreeController.autoCollectWebhook);



module.exports = router;
