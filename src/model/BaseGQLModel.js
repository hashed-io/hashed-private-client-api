const { EventEmitter } = require('events')

class BaseGQLModel extends EventEmitter {
  constructor ({ gql }) {
    super()
    this._gql = gql
  }

  async query (opts, retries = 1) {
    return this._request('query', opts, null, retries)
  }

  async mutate (opts, config, retries = 1) {
    return this._request('mutate', opts, config)
  }

  async _request (operation, opts, config, retries = 1) {
    const { data } = await this._gql[operation](opts, config, retries)
    return data
  }
}

module.exports = BaseGQLModel
