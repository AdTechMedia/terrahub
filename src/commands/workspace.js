'use strict';

const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const treeify = require('treeify');
const ConfigLoader = require('../config-loader');
const HashTable = require('../helpers/hash-table');
const DistributedCommand = require('../distributed-command');
const { renderTwig, yesNoQuestion } = require('../helpers/util');

class WorkspaceCommand extends DistributedCommand {
  /**
   * Command configuration
   */
  configure() {
    this
      .setName('workspace')
      .setDescription('run `terraform workspace` across multiple terrahub components')
      .addOption('delete', 'D', 'Delete workspace environment (paired with --env)', Boolean, false)
      .addOption('list', 'L', 'Shows list of terrahub components', Boolean, false)
    ;
  }

  /**
   * @returns {Promise}
   */
  async run() {
    const promises = [];
    let filesToRemove = [];
    const kill = this.getOption('delete');
    const configs = this.getFilteredConfig();

    const rootPath = this.getAppPath();
    const rootConfigPath = path.join(rootPath, this.getDefaultFileName());

    const dirPaths = Object.keys(configs).map(hash => path.join(rootPath, configs[hash].root));
    const configsList = dirPaths.map(it => path.join(it, this.getDefaultFileName()));
    const envConfigsList = this.listCurrentEnvConfig();

    const nonIncludedComponents = envConfigsList.slice(1).filter(it => !dirPaths.includes(path.dirname(it)));
    const includeRootConfig = !kill || (kill && !nonIncludedComponents.length);

    const { name: projectName, code } = this.getProjectConfig();

    if (this.getOption('list')) {
      const results = await this._workspace('workspaceList', configs);
      await this._handleWorkspaceList(results);

      return 'Done'; //todo was Promise.resolve('Done')
    }

    if (includeRootConfig) {
      configsList.unshift(rootConfigPath);
    }

    if (this.config.isDefault) {
      await this._workspace('workspaceSelect', configs);

      return 'Done'; //todo was Promise.resolve('Done')
    }

    configsList.forEach((configPath, i) => {
      const dir = path.dirname(configPath);
      const envConfig = path.join(dir, this.getFileName());
      const tfvarsName = path.join('workspace', `${this.config.env}.tfvars`);
      const tfvarsPath = path.join(dir, tfvarsName);

      if (!fs.existsSync(envConfig) && !kill) {
        const creating = new HashTable({});
        const existing = new HashTable(ConfigLoader.readConfig(configPath));
        const template = path.join(this.templates.workspace, 'default.tfvars.twig'); //todo test `this.templates.workspace`

        existing.transform('varFile', (key, value) => {
          value.push(tfvarsName);
          creating.set(key, value);
        });

        ConfigLoader.writeConfig(creating.getRaw(), envConfig);

        if (i !== 0 || !includeRootConfig) { // Skip root path
          promises.push(renderTwig(template, { name: projectName, code, env: this.config.env }, tfvarsPath));
        }
      }

      if (fs.existsSync(envConfig) && kill) {
        filesToRemove.push(envConfig, tfvarsPath);
      }
    });

    this.reloadConfig();
    const cfgObject = this.getFilteredConfig();

    if (!kill) {
      let isUpdate = promises.length !== (configsList.length - 1);
      let message = `TerraHub environment '${this.config.env}' was ${isUpdate ? 'updated' : 'created'}`;

      await Promise.all(promises);
      await this._workspace('workspaceSelect', cfgObject);

      return Promise.resolve(message);
    }

    const confirmed = await yesNoQuestion(`Do you want to delete workspace '${this.config.env}' (y/N)? `);
    if (!confirmed) {
      return Promise.resolve('Canceled');
    }

    filesToRemove = filesToRemove.filter(file => fs.existsSync(file));

    if (!filesToRemove.length) {
      return Promise.resolve('Nothing to remove');
    }

    await Promise.all(filesToRemove.map(file => fse.unlink(file)));
    await this._workspace('workspaceDelete', cfgObject);

    return Promise.resolve(`TerraHub environment '${this.config.env}' was deleted`);
  }

  /**
   * @param {String} action
   * @param {Object} config
   * @return {Promise}
   * @private
   */
  async _workspace(action, config) {
    this.warnExecutionStarted(config);

    return [{ actions: ['prepare', 'init', action], config }];
  }

  /**
   * @param {Object[]} results
   * @private
   */
  _handleWorkspaceList(results) {
    const result = {};

    results.forEach(item => {
      item.workspaces.filter(it => !result[it]).forEach(it => { result[it] = {}; });

      result[item.activeWorkspace][item.component] = null;
    });

    const { name } = this.getProjectConfig();

    this.logger.log(`Project: ${name}`);
    treeify.asLines(result, false, line => {
      this.logger.log(` ${line}`);
    });
  }
}

module.exports = WorkspaceCommand;
