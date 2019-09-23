'use strict';

const Dictionary = require('../helpers/dictionary');
const DistributedCommand = require('../distributed-command');
const { printListAsTree } = require('../helpers/log-helper');

class RunCommand extends DistributedCommand {
  /**
   * Command configuration
   */
  configure() {
    this
      .setName('run')
      .setDescription('execute automated workflow terraform init > workspace > plan > apply > destroy')
      .addOption('apply', 'a', 'Enable apply command as part of automated workflow', Boolean, false)
      .addOption('destroy', 'd', 'Enable destroy command as part of automated workflow', Boolean, false)
      .addOption('auto-approve', 'y', 'Auto approve terraform execution', Boolean, false)
      .addOption('dry-run', 'u', 'Prints the list of components that are included in the action', Boolean, false)
      .addOption('build', 'b', 'Enable build command as part of automated workflow', Boolean, false);
  }

  /**
   * @returns {Promise}
   */
  async run() {
    this._isApply = this.getOption('apply');
    this._isDestroy = this.getOption('destroy');
    this._isBuild = this.getOption('build');

    const config = this.getFilteredConfig();

    this._checkDependencies(config);

    if (this.getOption('dry-run')) {
      printListAsTree(config, this.getProjectConfig().name);

      return Promise.resolve('Done');
    }

    const isConfirmed = await this._getPromise(config);
    if (!isConfirmed) {
      throw new Error('Action aborted');
    }

    //todo discuss if linear actions will work correctly vs `step by step`
    return this._runLocal(config);
  }

  /**
   * @param {Object} config
   * @return {Promise}
   * @private
   */
  async _getPromise(config) {
    if (this._isApprovementRequired) {
      return this.askForApprovement(config, this.getOption('auto-approve'));
    }

    this.warnExecutionStarted(config);
    return true;
  }

  /**
   * @param {Object} config
   * @return {Promise}
   * @private
   */
  _runLocal(config) {
    const actions = ['prepare', 'init', 'workspaceSelect'];

    if (!this._isApply && !this._isDestroy) {
      if (this._isBuild) {
        actions.push('build');
      }

      actions.push('plan');
    }

    const defaultRun = [{ actions, config: config, dependencyDirection: Dictionary.DIRECTION.FORWARD }];

    const applyRun = !this._isApply ? false : [{
      actions: [...actions, ...this._isBuild ? ['build', 'plan', 'apply'] : ['plan', 'apply']],
      config: config,
      dependencyDirection: Dictionary.DIRECTION.FORWARD
    }];

    const destroyRun = !this._isDestroy ? false : [{
      actions: [...actions, ...['plan', 'destroy']],
      config: config,
      dependencyDirection: Dictionary.DIRECTION.REVERSE,
      planDestroy: true
    }];

    return Promise.resolve(destroyRun || applyRun || defaultRun );
  }

  /**
   * @param {Object} config
   * @return {Promise}
   * @private
   */
  _runCloud(config) {
    const actions = ['prepare', 'init', 'workspaceSelect'];

    if (this._isBuild) {
      throw new Error('`build` action is currently not available in AWS lambda.');
    }
    if (this._isDestroy) {
      throw new Error('`destroy` action is currently not available in AWS lambda.');
    }

    const updateActions = !this._isApply ? ['plan'] : ['plan', 'apply'];
    const dependencyDirection =  Dictionary.DIRECTION.FORWARD;

    return Promise.resolve([{ config, actions: [...actions, ...updateActions], dependencyDirection }]);
  }

  /**
   * Checks config dependencies in the corresponding order if check is required
   * @param {Object} config
   * @private
   */
  _checkDependencies(config) {
    let direction;
    switch (+this._isApply + +this._isDestroy * 2) {
      case 0:
        return;

      case 1:
        direction = Dictionary.DIRECTION.FORWARD;
        break;

      case 2:
        direction = Dictionary.DIRECTION.REVERSE;
        break;

      case 3:
        direction = Dictionary.DIRECTION.BIDIRECTIONAL;
        break;
    }

    this.checkDependencies(config, direction);
  }

  /**
   * @return {Boolean}
   * @private
   */
  get _isApprovementRequired() {
    return ['apply', 'destroy'].some(it => this.getOption(it));
  }
}

module.exports = RunCommand;
