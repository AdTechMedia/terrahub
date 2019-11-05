'use strict';

const WebSocket = require('ws');

class Websocket {

  /**fet
   * @param {String} env
   * @param {String} ticket
   */
  constructor(env, ticket) {
    const environment = env === 'api' ? env : env.split('-')[1];
    this.baseUrl = `wss://apiws-${environment}.terrahub.io/v1`;
    this.ws = new WebSocket(`${this.baseUrl}?ticket_id=${ticket}`);
  }
}

module.exports = Websocket;
