'use strict';

const { EOL } = require('os');
const fs = require('fs-extra');
const { join } = require('path');
const logger = require('js-logger');
// const fetch = require('node-fetch').default;
const { fetch, config: { token } } = require('../parameters');

class Logger {
  /**
   * Constructor
   */
  constructor() {
    const level = (process.env.DEBUG || logger.INFO.name).toUpperCase();

    logger.useDefaults({
      defaultLevel: logger[level],
      formatter: (messages, context) => {}
    });

    const consoleHandler = logger.createDefaultHandler();
    logger.setHandler((messages, context) => {
      consoleHandler(messages, context);

      if (this._isESLogRequired) {
        this._esHandler(messages);
      }
    });

    this._logger = logger;

    this._promises = [];
    this._context = {
      sendLogsToES: false,
      runId: null,
      componentName: null,
      action: null
    };
  }

  /**
   * Raw line output (without auto \n)
   * @param {String} message
   */
  raw(message) {
    process.stdout.write(message);

    if (this._isESLogRequired) {
      this._esHandler([message]);
    }
  }

  /**
   * @param {String|Error} message
   */
  debug(message) {
    this._logger.debug(message);
  }

  /**
   * @param {String} message
   */
  log(message) {
    this._logger.info(message);
  }

  /**
   * @param {String} message
   */
  info(message) {
    this._logger.info('✅', message);
  }

  /**
   * @param {String} message
   */
  warn(message) {
    this._logger.warn('💡', message);
  }

  /**
   * @param {String|Error} message
   */
  error(message) {
    if (message instanceof Error) {
      const { name } = this._logger.getLevel();

      message = (name === logger.DEBUG.name) ?
        message.stack :
        message.message;
    }

    this._logger.error('❌', message);
  }

  /**
   * @return {Promise[]}
   */
  get promises() {
    return this._promises;
  }

  /**
   * @param {String[]} messages
   * @private
   */
  _esHandler(messages) {
    const message = Object.keys(messages).map(key => messages[key]).join('');

    const promise = fetch.post(`https://0kd9q7ufs8.execute-api.us-east-1.amazonaws.com/v1/elasticsearch/document/${this._context.runId}?indexMapping=logs`, {
      body: JSON.stringify({
        terraformRunId: this._context.runId,
        timestamp: Date.now(),
        component: this._context.componentName,
        log: message,
        action: this._context.action
      })
    }).catch(error => console.log(error));

    // const promise = Promise.resolve();

    this._promises.push(promise);
  }

  /**
   * @return {Boolean}
   * @private
   */
  get _isESLogRequired() {
    return token && this._context.sendLogsToES;
  }

  /**
   * @param {{ runId: String?, componentName: String?, action: String?, sendLogsToES: Boolean? }} context
   */
  updateContext(context) {
    Object.assign(this._context, context);
  }
}

module.exports = new Logger();
