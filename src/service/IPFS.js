// import IpfsClient from 'nano-ipfs-store'
const sleep = require('await-sleep')
const all = require('it-all')
const { concat: uint8ArrayConcat } = require('uint8arrays/concat')
const { create } = require('ipfs-http-client')

const SLEEP_TIME = 5000
class IPFS {
  constructor ({
    url,
    authHeader = null
  }) {
    const opts = {
      url: new URL(url)
    }
    if (authHeader) {
      opts.headers = {
        authorization: authHeader
      }
    }
    this.client = create(opts)
  }

  /**
   * @param {String or Uint8Array} data to store
   * @returns {String} cid of the stored data
   */
  async add (data, retries = 4) {
    try {
      const { path } = await this.client.add(data)
      return path
    } catch (error) {
      if (retries > 0) {
        await sleep(SLEEP_TIME * (Math.max(5 - retries, 1)))
        return this.add(data, retries - 1)
      }
      throw error
    }
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
