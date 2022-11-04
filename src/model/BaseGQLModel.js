const { EventEmitter } = require('events')

class BaseGQLModel extends EventEmitter {
  constructor ({ gql }) {
    super()
    this._gql = gql
  }

  async query (opts, retries = 1) {
    const { data } = await this._gql.query(opts, retries)
    return data
  }

  async mutate (opts, config, retries = 1) {
    const { data } = await this._gql.mutate(opts, config, retries)
    return data
  }
}

module.exports = BaseGQLModel
