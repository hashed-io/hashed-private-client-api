const {
  gql
} = require('@apollo/client/core')
const jwtDecode = require('jwt-decode').default
const BaseGQLModel = require('./BaseGQLModel')
const Cipher = require('./Cipher')
const { LocalStorageKey } = require('../const')

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
      token
      user{
        address
        id
        publicKey
        privateKey
      }
    }
  }
`

const REFRESH_TOKEN = gql`
  mutation refresh_token {
    refresh_token{
      token
    }
  }
`

class Auth extends BaseGQLModel {
  constructor () {
    super({ gql: null })
  }

  init ({ gql, user, signFn, crypto }) {
    this._gql = gql
    this._user = user
    this._signFn = signFn
    this._crypto = crypto
    this._context = {}
  }

  async login (address) {
    if (await this.isLoggedIn()) {
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
    // console.log('token: ', token)
    this._context.token = token
    this._setUserInfo(user)
    this._createCipher(user)
  }

  async userInfo () {
    await this._assureIsInitialized()
    return this._context.userInfo
  }

  async cipher () {
    await this._assureIsInitialized()
    return this._context.cipher
  }

  async logout () {
    this._context = {}
    localStorage.removeItem(LocalStorageKey.JWT)
    await this._gql.clearStore()
    this.emit('logout')
  }

  async isLoggedIn () {
    return !!await this._getToken()
  }

  async assertIsLoggedIn () {
    if (!await this.isLoggedIn()) {
      throw new Error('No user is logged in')
    }
  }

  assertHasLocalToken () {
    if (!this.hasLocalToken()) {
      throw new Error('No user is logged in')
    }
  }

  async getToken () {
    await this.assertIsLoggedIn()
    return this._getToken()
  }

  async _getToken () {
    if (!this.hasLocalToken()) {
      return null
    }
    if (hasTokenExpired(this._context.token)) {
      const token = await this._refreshToken()
      if (!token) {
        await this.logout()
      }
      this._context.token = token
    }
    return this._context.token
  }

  hasLocalToken () {
    return !!this.getLocalToken()
  }

  getLocalToken () {
    if (!this._context.token) {
      this._context.token = localStorage.getItem(LocalStorageKey.JWT)
    }
    return this._context.token
  }

  async _refreshToken () {
    try {
      const { refresh_token: { token } } = await this.mutate({
        mutation: REFRESH_TOKEN
      }, 0)
      return token
    } catch (error) {
      return null
    }
  }

  async _getUserId () {
    const { sub } = jwtDecode(await this.getToken())
    return sub
  }

  async _assureIsInitialized () {
    await this.assertIsLoggedIn()
    if (!this._context.userInfo) {
      const user = await this._user.getFullById(await this._getUserId())
      this._setUserInfo(user)
      this._createCipher(user)
    }
  }

  _setUserInfo (user) {
    const {
      id,
      address
    } = user
    this._context.userInfo = {
      id,
      address
    }
  }

  _createCipher (user) {
    this._context.cipher = new Cipher({
      auth: this,
      actor: this._user,
      defaultActor: user,
      crypto: this._crypto
    })
  }
}

module.exports = Auth

function isString (val) {
  return Object.prototype.toString.call(val) === '[object String]'
}

function hasTokenExpired (token) {
  const { exp } = jwtDecode(token)
  return new Date(exp * 1000 - (5 * 60 * 1000)) <= new Date()
}
