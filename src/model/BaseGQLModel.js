const { EventEmitter } = require('events')

class BaseGQLModel extends EventEmitter {
  constructor ({ gql }) {
    super()
    this._gql = gql
  }

  async query (opts) {
    return this._request('query', opts)
  }

  async mutate (opts, config) {
    return this._request('mutate', opts, config)
  }

  async _request (operation, opts, config) {
    const { data } = await this._gql[operation](opts, config)
    return data
  }
}

module.exports = BaseGQLModel
