const { EventEmitter } = require('events')

class BaseGQLModel extends EventEmitter {
  constructor ({ gql }) {
    super()
    this._gql = gql
  }

  async query (opts) {
    return this._request('query', opts)
  }

  async mutate (opts) {
    return this._request('mutate', opts)
  }

  async _request (operation, opts) {
    const { data } = await this._gql[operation](opts)
    return data
  }
}

module.exports = BaseGQLModel
