const amqp = require('amqplib');
const logger = require('winston');
const config = require('../config');

const exchangeOptions = {
  durable: false,
  autoDelete: false,
};

class Amqp {
  constructor(url = config.messageBrokerURL) {
    this.connection = amqp.connect(url);
    this.channels = {};
  }

  getConnection() {
    return this.connection;
  }

  bindQueue(exchangeName, queueName, routingKey) {
    return this.connection
      .then(async connection => {
        logger.info(`RMQ | ${queueName} Connected`);
        const channel = await connection.createChannel();
        await channel.assertExchange(exchangeName, 'topic', exchangeOptions);
        const queue = await channel.assertQueue(queueName);
        await channel.bindQueue(queue.queue, exchangeName, routingKey);
        this.channels[queueName] = channel;
      })
      .catch(err => {
        logger.error(
          `${exchangeName} ${queueName} Error while queue binding`,
          err
        );
      });
  }

  getChannel(queueName) {
    return this.channels[queueName];
  }

  publish(exchangeName, queueName, data) {
    const channel = this.channels[queueName];
    return channel.publish(exchangeName, '', Buffer.from(JSON.stringify(data)));
  }

  startConsumer(queueName, callback) {
    const channel = this.channels[queueName];
    if (channel) {
      logger.info(`Start ${queueName} consumer`);
      channel.consume(queueName, callback, {
        noAck: true,
      });
    } else {
      const err = new Error(`Error starting queue consumer queue=${queueName}`);
      logger.error(err);
    }
  }
}
module.exports = Amqp;
