const { AuthLink } = require('./link')
const { Auth, OwnedData, SharedData, Privacy, User } = require('./model')
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
    this._ipfs = new IPFS({
      url: ipfsURL,
      authHeader: ipfsAuthHeader
    })
    this._auth = new Auth()
    const gql = new GQL({
      uri: privateURI,
      links: new AuthLink({ auth: this._auth })
    })
    this._user = new User({ gql })
    this._auth.init({
      gql,
      user: this._user,
      signFn
    })
    this._gql = gql
    this._ownedData = null
    this._sharedData = null
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
    const privacy = new Privacy({
      auth: this._auth
    })
    this._ownedData = new OwnedData({
      gql: this._gql,
      privacy,
      ipfs: this._ipfs
    })
    this._sharedData = new SharedData({
      gql: this._gql,
      privacy,
      ipfs: this._ipfs,
      ownedData: this._ownedData,
      user: this._user
    })
  }

  /**
   * @desc Logs the user out of the hashed private server
   *
   * @throws error in case the logout fails
   */
  async logout () {
    await this._auth.logout()
    this._ownedData = null
    this._sharedData = null
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
   * @desc Returns the ownedData object
   *
   * @return {Object} ownedData object @see OwnedData
   */
  ownedData () {
    this._auth.assertIsLoggedIn()
    return this._ownedData
  }

  /**
   * @desc Returns the sharedData object
   *
   * @return {Object} sharedData object @see SharedData
   */
  sharedData () {
    this._auth.assertIsLoggedIn()
    return this._sharedData
  }
}

module.exports = HashedPrivate
