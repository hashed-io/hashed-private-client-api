const { ApolloLink } = require('@apollo/client/core')
// const { setContext } = require('apollo-link-context')

class AuthLink extends ApolloLink {
  constructor ({
    auth
  }) {
    super()
    this._auth = auth
  }

  request (operation, forward) {
    if (this._auth.hasLocalToken()) {
      operation.setContext(({ headers }) => ({
        headers: {
          ...headers,
          authorization: `Bearer ${this._auth.getLocalToken()}`

        }
      }))
    }
    return forward(operation)
  }
}

// function createAuthLink (auth) {
//   return setContext(async (req, { headers }) => {
//     let response = { headers }
//     if (await auth.isLoggedIn()) {
//       const token = await auth.getToken()
//       response = {
//         headers: {
//           ...headers,
//           authorization: `Bearer ${token}`

//         }
//       }
//     }
//     return response
//   })
// }

module.exports = AuthLink
