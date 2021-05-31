const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UserSchema = new Schema({
  name: String,
  email: {type: String, required: true},
  phone: String,
  notificationInterval: {type: String, default: 'DAILY'}, // WEEKLY/MONTHLY/YEARLY
  currency: [String],
  change: Number,
},{
  timestamps: true,
  toObject: {virtuals: true}
});
module.exports = mongoose.model('User', UserSchema);
