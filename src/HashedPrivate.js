const { Crypto } = require('@smontero/hashed-crypto')
const { AuthLink } = require('./link')
const { Actor, Auth, Document, Group, User } = require('./model')
const { GQL, IPFS } = require('./service')

/**
 * Provides access to all the hashed private server functionality
 */
class HashedPrivate {
  /**
   * @desc Create a hashed private instance
   *
   * @param {Object} opts
   * @param {String} opts.ipfsURL the ipfs endpoint to use
   * @param {String} [opts.ipfsAuthHeader] the ipfs authentication header if required
   * @param {String} opts.privateURI the hashed private server endpoint
   * @param {function} opts.signFn async function that receives an address and message as parameters and returns the signed message
   * @return {Object} instance of hashed private
   */
  constructor (opts) {
    this._opts = opts
    const {
      ipfsURL,
      ipfsAuthHeader,
      privateURI,
      signFn
    } = opts
    const crypto = new Crypto()
    this._ipfs = new IPFS({
      url: ipfsURL,
      authHeader: ipfsAuthHeader
    })
    this._auth = new Auth()
    const gql = new GQL({
      uri: privateURI,
      links: new AuthLink({ auth: this._auth })
    })
    this._actor = new Actor({ gql })
    const user = new User({ gql })
    this._user = user
    this._group = new Group({ gql, crypto, user })
    this._auth.init({
      crypto,
      gql,
      user: this._user,
      signFn
    })
    this._gql = gql
    this._document = null
  }

  /**
   * @desc Logs in the user to the hashed private server
   *
   * @param {String} address of the user account to use
   * @param {String} opts.privateURI the hashed private server endpoint
   * @param {function} opts.signFn async function that receives an address and message as parameters and returns the signed message
   * @throws error in case the login fails
   */
  async login (address) {
    await this._auth.login(address)

    this._document = new Document({
      actor: this._actor,
      gql: this._gql,
      cipher: await this._auth.cipher(),
      ipfs: this._ipfs
    })
  }

  /**
   * @desc Logs the user out of the hashed private server
   *
   * @throws error in case the logout fails
   */
  async logout () {
    await this._auth.logout()
    this._document = null
  }

  /**
   * @desc Indicates whether the user is logged in
   *
   * @return {boolean} whether the user is logged in
   */
  isLoggedIn () {
    return this._auth.isLoggedIn()
  }

  /**
   * @desc Returns the document object
   *
   * @return {Object} document object @see Document
   */
  document () {
    this._auth.assertIsLoggedIn()
    return this._document
  }

  /**
   * @desc Returns the group object
   *
   * @return {Object} group object @see Group
   */
  group () {
    this._auth.assertIsLoggedIn()
    return this._group
  }
}

module.exports = HashedPrivate
