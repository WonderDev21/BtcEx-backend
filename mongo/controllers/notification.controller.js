const notificationService = require('../services/notification.service');
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;
    const notifications = notificationService.getAllNotification(userId);
    res.status(200).send(notifications);
  } catch(err) {
    res.status(404).send({message: 'No Notifications Found', error: err});
  }
};
