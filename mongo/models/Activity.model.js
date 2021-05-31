const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ActivitySchema = new Schema({
  userId: String,
  macAddress: String,
  ipAddress: String,
  location: String,
  machine: String,
  browser: String,
  misc: Object,
}, {
  timestamps: true,
  toObject: {virtuals: true}
});
module.exports = mongoose.model('Activity', ActivitySchema);
