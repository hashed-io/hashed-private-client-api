// import IpfsClient from 'nano-ipfs-store'
const all = require('it-all')
const { concat: uint8ArrayConcat } = require('uint8arrays/concat')
const { create } = require('ipfs-http-client')

class IPFS {
  constructor ({
    url
  }) {
    this.client = create(new URL(url))
  }

  /**
   * @param {String or Uint8Array} data to store
   * @returns {String} cid of the stored data
   */
  async add (data) {
    const { path } = await this.client.add(data)
    return path
  }

  /**
   * @param {String} cid of the data that is wanted
   * @returns {String} data identified by the cid
   */
  async cat (cid) {
    return Buffer.from(uint8ArrayConcat(await all(this.client.cat(cid)))).toString('utf8')
  }

  /**
   * @param {String} cid of the data that is wanted
   * @returns {Uint8Array} data identified by the cid
   */
  async get (cid) {
    return Buffer.from(uint8ArrayConcat(await all(this.client.get(cid)))).toString('hex')
  }
}

module.exports = IPFS
