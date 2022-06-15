const {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from
} = require('@apollo/client/core')

class GQL {
  constructor ({ uri, links }) {
    links = links || []
    links = Array.isArray(links) ? links : [links]
    links.push(new HttpLink({
      uri
    }))
    this.client = new ApolloClient({
      link: from(links),
      cache: new InMemoryCache()
    })
  }

  async query (opts) {
    return this.client.query(opts)
  }

  async mutate (opts) {
    return this.client.mutate(opts)
  }

  async clearStore () {
    await this.client.clearStore()
  }
}

module.exports = GQL
