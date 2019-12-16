'use strict';

const logger = require('../logger');
const Dictionary = require('../dictionary');
const BuildHelper = require('../build-helper');
const AbstractTerrahub = require('./abstract-terrahub');

class Terrahub extends AbstractTerrahub {
  /**
   * @param {Object} data
   * @param {Error|String} err
   * @return {Promise}
   * @private
   * @override
   */
  on(data, err = null) {
    let error = null;
    let actionPromiseComponent = Promise.resolve();
    let payload = {
      runId: this._runId,
      status: data.status,
      action: this._action,
      projectId: this._project.id,
      componentName: this._config.name,
      componentHash: this._componentHash,
      realtimeCreatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    if (err) {
      error = err instanceof Error ? err : new Error(err || 'Unknown error');
      payload.error = error.message.trim();
    }

    if (payload.action === 'init' && data.status === Dictionary.REALTIME.START) {
      const componentPayload = {
        runId: this._runId,
        name: this._config.name,
        hash: this._componentHash,
        componentStartedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      actionPromiseComponent = !this.parameters.config.token
        ? Promise.resolve()
        : this.parameters.fetch.post('thub/component/create', { body: JSON.stringify(componentPayload) });
    }

    if (payload.action === 'plan' && data.status === Dictionary.REALTIME.SUCCESS) {
      payload.metadata = data.metadata;
    }

    const actionPromise = !this.parameters.config.token
      ? Promise.resolve()
      : this.parameters.fetch.post('thub/realtime/create', { body: JSON.stringify(payload) });

    return actionPromiseComponent.then(() => {
      return actionPromise.then(() => {
        return payload.hasOwnProperty('error') ? Promise.reject(error) : Promise.resolve(data);
      });
    });
  }

  /**
   * @return {Promise}
   * @protected
   * @override
   */
  checkProject() {
    if (!this.parameters.config.token) {
      return Promise.resolve();
    }

    const payload = {
      name: this._project.name,
      hash: this._project.code
    };
    return this.parameters.fetch.post('thub/project/create', { body: JSON.stringify(payload) }).then((json) => {
      this._project.id = json.data.id;

      return Promise.resolve();
    });
  }

  /**
   * @param {Object} data
   * @return {Promise}
   * @private
   * @abstract
   */
  upload(data) {
    if (!this.parameters.config.token || !data || !data.buffer ||
      !['plan', 'apply', 'destroy'].includes(this._action)) {
      return Promise.resolve(data);
    }

    const key = this._getKey();
    const url = `${Terrahub.METADATA_DOMAIN}/${key}`;

    return this._putObject(url, data.buffer)
      .then(() => this._callParseLambda(key))
      .then(() => Promise.resolve(data));
  }

  /**
   * Get destination key
   * @return {String}
   * @private
   */
  _getKey() {
    const dir = this.parameters.config.api.replace('api', 'public');
    const keyName = `${this._componentHash}-terraform-${this._action}.txt`;

    return `${dir}/${this._timestamp}/${keyName}`;
  }

  /**
   * @param {String} key
   * @return {Promise}
   * @private
   */
  _callParseLambda(key) {
    const url = `thub/resource/parse-${this._action}`;

    const options = {
      body: JSON.stringify({
        key: key,
        projectId: this._project.id,
        thubRunId: this._runId
      })
    };
    const promise = this.parameters.fetch.post(url, options).catch((error) => {
      const message = this._addNameToMessage('Failed to trigger parse function');

      logger.error({ ...error, message });

      return Promise.resolve();
    });

    return process.env.DEBUG ? promise : Promise.resolve();
  }

  /**
   * Put object via bucket url
   * @param {String} url
   * @param {Buffer} body
   * @return {Promise}
   * @private
   */
  _putObject(url, body) {
    const options = {
      method: 'PUT',
      body: body,
      headers: { 'Content-Type': 'text/plain', 'x-amz-acl': 'bucket-owner-full-control' }
    };

    return this.parameters.fetch.request(url, options);
  }

  /**
   * @param {Object} config
   * @param {String} thubRunId
   * @param {String[]} actions
   * @return {Function[]}
   */
  getTasks({ config, thubRunId, actions } = {}) {
    const { distributor } = config;

    logger.updateContext({
      runId: thubRunId,
      componentName: config.name
    });

    return actions.map((action) => (options) => {
      logger.updateContext({ action: action });

      return action !== 'build'
        ? this.getTask(action, options)
        : BuildHelper.getComponentBuildTask(config, distributor);
    });
  }

  /**
   * Metadata bucket associated domain
   * @return {String}
   * @constructor
   */
  static get METADATA_DOMAIN() {
    return 'https://data-lake-terrahub-us-east-1.s3.amazonaws.com';
  }
}

module.exports = Terrahub;
