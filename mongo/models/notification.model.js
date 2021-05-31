const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const notificationSchema = new Schema({
  userId: String,
  type: String,
  title: String,
  message: String,
  img: String,
  priority: Number,
  read: Boolean,
  expireAt: Date,
  misc: Object,
}, {
  timestamps: true,
  toObject: {virtuals: true}
});
module.exports = mongoose.model('Notification', notificationSchema);
