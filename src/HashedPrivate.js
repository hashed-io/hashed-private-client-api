const { AuthLink } = require('./link')
const { Auth, OwnedData, SharedData, Privacy, User } = require('./model')
const { GQL, IPFS } = require('./service')

class HashedPrivate {
  constructor (opts) {
    this._opts = opts
    const {
      ipfsURL,
      privateURI,
      signFn
    } = opts
    this._ipfs = new IPFS({
      url: ipfsURL
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

  async logout () {
    await this._auth.logout()
    this._ownedData = null
    this._sharedData = null
  }

  isLoggedIn () {
    return this._auth.isLoggedIn()
  }

  ownedData () {
    this._auth.assertIsLoggedIn()
    return this._ownedData
  }

  sharedData () {
    this._auth.assertIsLoggedIn()
    return this._sharedData
  }
}

module.exports = HashedPrivate
