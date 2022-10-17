const {
  gql
} = require('@apollo/client/core')
const jwtDecode = require('jwt-decode')
const BaseGQLModel = require('./BaseGQLModel')
const Cipher = require('./Cipher')
const { LocalStorageKey } = require('../const')
const { Crypto } = require('@smontero/hashed-crypto')

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

  init ({ gql, user, signFn, crypto }) {
    this._userInfo = null
    this._gql = gql
    this._user = user
    this._signFn = signFn
    this._crypto = crypto
    this._cipher = null
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
    let signature = await this._signFn(address, message)
    if (!isString(signature)) {
      signature = `0x${Buffer.from(signature).toString('hex')}`
    }
    let { login: { token, user } } = await this.mutate({
      mutation: LOGIN,
      variables: {
        address,
        signature
      }
    })
    localStorage.setItem(LocalStorageKey.JWT, token)
    if (!user.publicKey) {
      const {
        publicKey,
        privateKey: securityData
      } = this._crypto.generateKeyPair()
      user = await this._user.updateSecurityData({
        id: user.id,
        publicKey,
        securityData
      })
    }
    this._setUserInfo(user)
    this._createCipher(user)
  }

  async userInfo () {
    this._assureIsInitialized()
    return this._userInfo
  }

  async cipher () {
    this._assureIsInitialized()
    return this._cipher
  }

  async logout () {
    this._userInfo = null
    this._cipher = null
    localStorage.removeItem(LocalStorageKey.JWT)
    await this._gql.clearStore()
    this.emit('logout')
  }

  isLoggedIn () {
    return !!this._getToken()
  }

  assertIsLoggedIn () {
    if (!this.isLoggedIn()) {
      throw new Error('No user is logged in')
    }
  }

  getToken () {
    this.assertIsLoggedIn()
    return this._getToken()
  }

  _getToken () {
    if (!this._context.token) {
      this._context.token = localStorage.getItem(LocalStorageKey.JWT)
    }
    return this._context.token
  }

  _getUserId () {
    const { sub } = jwtDecode(this.getToken())
    return sub
  }

  async _assureIsInitialized () {
    this.assertIsLoggedIn()
    if (!this._userInfo) {
      const user = await this._user.getFullById(this._getUserId())
      this._setUserInfo(user)
      this._createCipher(user)
    }
  }

  _setUserInfo (user) {
    const {
      id,
      address
    } = user
    this._userInfo = {
      id,
      address
    }
  }

  _createCipher (user) {
    this._cipher = new Cipher({
      auth: this,
      actor: this._user,
      defaultActor: user
    })
  }
}

module.exports = Auth

function isString (val) {
  return Object.prototype.toString.call(val) === '[object String]'
}
