const { ApolloLink } = require('@apollo/client/core')

class AuthLink extends ApolloLink {
  constructor ({
    auth
  }) {
    super()
    this._auth = auth
  }

  request (operation, forward) {
    if (this._auth.isLoggedIn()) {
      operation.setContext(({ headers }) => ({
        headers: {
          ...headers,
          authorization: `Bearer ${this._auth.getToken()}`

        }
      }))
    }
    return forward(operation)
  }
}

module.exports = AuthLink
