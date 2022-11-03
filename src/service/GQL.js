const {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from
} = require('@apollo/client/core')

class GQL {
  constructor ({ uri, links, auth }) {
    links = links || []
    links = Array.isArray(links) ? links : [links]
    links.push(new HttpLink({
      uri,
      credentials: 'include'
    }))
    this._auth = auth
    this.client = new ApolloClient({
      link: from(links),
      cache: new InMemoryCache()
    })
  }

  async query (opts, retries = 1) {
    try {
      const response = await this.client.query(opts)
      return response
    } catch (error) {
      if (retries > 0 && this._shouldRetry(error)) {
        await this._auth.assertIsLoggedIn()
        return this.query(opts, 0)
      }
      throw error
    }
  }

  async mutate (opts, config, retries = 1) {
    try {
      config = config || {}
      const response = await this.client.mutate(opts)
      const { evict } = config
      if (evict) {
        const cache = this.client.cache
        cache.evict(evict)
        cache.gc()
      }
      return response
    } catch (error) {
      if (retries > 0 && this._shouldRetry(error)) {
        await this._auth.assertIsLoggedIn()
        return this.mutate(opts, config, 0)
      }
      throw error
    }
  }

  async clearStore () {
    await this.client.clearStore()
  }

  _shouldRetry (error) {
    console.log('In GQL should retry error: ', error.message)
    return error.message.toLowerCase().includes('jwtexpired')
  }
}

module.exports = GQL
