const {
  gql
} = require('@apollo/client/core')

const BaseGQLModel = require('./BaseGQLModel')
const { Crypto } = require('../service')

const GENERATE_LOGIN_CHALLENGE = gql`
  mutation generate_login_challenge($address: String!){
    generate_login_challenge(req:{
      address: $address
    }){
      message
    }
  }
`

const LOGIN = gql`
  mutation login($address: String!, $signature: String!){
    login(req:{
      address: $address,
      signature: $signature
    }){
      refresh_token
      token
      user{
        address
        id
        public_key
        security_data
      }
    }
  }
`

class Auth extends BaseGQLModel {
  constructor () {
    super({ gql: null })
  }

  init ({ gql, user, signFn }) {
    this._gql = gql
    this._user = user
    this._signFn = signFn
    this._context = {}
  }

  async login (address) {
    if (this.isLoggedIn()) {
      await this.logout()
    }
    const { generate_login_challenge: { message } } = await this.mutate({
      mutation: GENERATE_LOGIN_CHALLENGE,
      variables: {
        address
      }
    })
    const signature = await this._signFn(address, message)
    let { login: { token, user } } = await this.mutate({
      mutation: LOGIN,
      variables: {
        address,
        signature
      }
    })

    this._context = {
      token
    }
    if (!user.publicKey) {
      const {
        publicKey,
        privateKey: securityData
      } = Crypto.generateKeyPair()
      user = await this._user.updateSecurityData({
        id: user.id,
        publicKey,
        securityData
      })
    }
    this._context.user = user
    return user
  }

  async logout () {
    this._context = {}
    await this._gql.clearStore()
  }

  isLoggedIn () {
    return !!this._context.token
  }

  assertIsLoggedIn () {
    if (!this.isLoggedIn()) {
      throw new Error('No user is logged in')
    }
  }

  getToken () {
    this.assertIsLoggedIn()
    return this._context.token
  }

  getUserInfo () {
    this.assertIsLoggedIn()
    return this._context.user
  }
}

module.exports = Auth
