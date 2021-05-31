const mongoose = require('mongoose');
const constants = require('../../constants/common');
const Schema = mongoose.Schema;

const JobSchema = new Schema({
  type: {type: String, required: true},
  cronExpression: {type: String, required: true},
  startDate: {type: Date, required: true},
  endDate: Date,
  args: Object,
  isActive: {type: Boolean, default: true},
  lastAttemptedAt: Date,
  lastAttemptStatus: {type: String, enum: [constants.COMPLETED, constants.FAILED]}
}, {
  timestamps: true,
  toObject: {virtuals: true}
});

module.exports = mongoose.model('Job', JobSchema);
