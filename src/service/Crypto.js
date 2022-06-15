const { PrivateKey } = require('eosjs/dist/PrivateKey')
const { PublicKey } = require('eosjs/dist/PublicKey')
const { KeyType } = require('eosjs/dist/eosjs-numeric')

const EC = require('elliptic').ec

const crypto = require('crypto')
const shajs = require('sha.js')

class Crypto {
  static generateKeyPair () {
    const keyPair = new EC('secp256k1').genKeyPair()
    return {
      publicKey: PublicKey.fromElliptic(keyPair, KeyType.k1).toString(),
      privateKey: PrivateKey.fromElliptic(keyPair, KeyType.k1).toString()
    }
  }

  static cipher ({
    payload,
    privateKey,
    forPublicKey
  }) {
    const { cipherKey, macKey } = this._generateSharedPrivateKey({
      privateKey,
      publicKey: forPublicKey
    })

    const iv = crypto.randomBytes(16) // initialization vector

    const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv)
    const firstChunk = cipher.update(payload)
    const secondChunk = cipher.final()
    const cipheredPayload = Buffer.concat([firstChunk, secondChunk])

    const mac = this._generateMAC({
      iv,
      macKey,
      cipheredPayload
    })
    return {
      cipheredPayload: cipheredPayload.toString('hex'),
      iv: iv.toString('hex'),
      mac: mac.toString('hex')
    }
  }

  static decipher ({
    cipheredPayload,
    privateKey,
    publicKey,
    iv,
    mac
  }) {
    const { cipherKey, macKey } = this._generateSharedPrivateKey({
      privateKey,
      publicKey
    })
    iv = Buffer.from(iv, 'hex')
    cipheredPayload = Buffer.from(cipheredPayload, 'hex')
    mac = Buffer.from(mac, 'hex')
    const realMAC = this._generateMAC({
      iv,
      macKey,
      cipheredPayload
    })
    if (!mac.equals(realMAC)) {
      throw new Error(`Invalid MAC ${mac.toString('hex')} != ${realMAC.toString('hex')}`)
    }
    const cipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv)
    const firstChunk = cipher.update(cipheredPayload)
    const secondChunk = cipher.final()
    return Buffer.concat([firstChunk, secondChunk])
  }

  static _generateMAC ({
    iv,
    macKey,
    cipheredPayload
  }) {
    const dataToMac = Buffer.concat([iv, cipheredPayload])
    return crypto.createHmac('sha256', macKey).update(dataToMac).digest()
  }

  static _generateSharedPrivateKey ({
    privateKey,
    publicKey
  }) {
    const prvKey = PrivateKey.fromString(privateKey).toElliptic()
    const pubKey = PublicKey.fromString(publicKey).toElliptic()
    const shared = Buffer.from(prvKey.derive(pubKey.getPublic()).toString('hex'), 'hex')
    // eslint-disable-next-line new-cap
    const hash = new shajs.sha512().update(shared).digest()
    return {
      cipherKey: hash.slice(0, 32),
      macKey: hash.slice(32)
    }
  }
}

module.exports = Crypto
