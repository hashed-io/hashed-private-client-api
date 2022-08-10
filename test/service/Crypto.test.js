require('cross-fetch/polyfill')
const { Crypto } = require('../../src/service')

describe('cipher/decipher', () => {
  test('cipher/decipher for self', async () => {
    const payload = JSON.stringify({
      prop1: 1,
      prop2: 'hola'
    })
    const { publicKey, privateKey } = Crypto.generateKeyPair()
    const {
      cipheredPayload,
      iv,
      mac
    } = Crypto.cipher({
      payload,
      privateKey,
      forPublicKey: publicKey
    })
    const decipheredPayload = Crypto.decipher({
      cipheredPayload,
      privateKey,
      publicKey,
      iv,
      mac
    })
    expect(decipheredPayload.toString()).toBe(payload)
  })

  test('cipher/decipher for other', async () => {
    const payload = JSON.stringify({
      prop1: 2,
      prop2: 'adios'
    })
    const { publicKey: pubKey1, privateKey: prvKey1 } = Crypto.generateKeyPair()
    const { publicKey: pubKey2, privateKey: prvKey2 } = Crypto.generateKeyPair()
    const {
      cipheredPayload,
      iv,
      mac
    } = Crypto.cipher({
      payload,
      privateKey: prvKey1,
      forPublicKey: pubKey2
    })
    let decipheredPayload = Crypto.decipher({
      cipheredPayload,
      privateKey: prvKey1,
      publicKey: pubKey2,
      iv,
      mac
    })
    expect(decipheredPayload.toString()).toBe(payload)

    decipheredPayload = Crypto.decipher({
      cipheredPayload,
      privateKey: prvKey2,
      publicKey: pubKey1,
      iv,
      mac
    })
    expect(decipheredPayload.toString()).toBe(payload)
  })

  test('cipher/decipher should fail for invalid keys', async () => {
    expect.assertions(3)
    const payload = JSON.stringify({
      prop1: 1,
      prop2: 'hola'
    })
    const { publicKey, privateKey } = Crypto.generateKeyPair()
    const {
      cipheredPayload,
      iv,
      mac
    } = Crypto.cipher({
      payload,
      privateKey,
      forPublicKey: publicKey
    })

    const { publicKey: invalidPubKey, privateKey: invalidPrvKey } = Crypto.generateKeyPair()
    try {
      Crypto.decipher({
        cipheredPayload,
        privateKey: invalidPrvKey,
        publicKey: invalidPubKey,
        iv,
        mac
      })
    } catch (err) {
      expect(err.message).toContain('Invalid MAC')
    }

    try {
      Crypto.decipher({
        cipheredPayload,
        privateKey,
        publicKey: invalidPubKey,
        iv,
        mac
      })
    } catch (err) {
      expect(err.message).toContain('Invalid MAC')
    }

    try {
      Crypto.decipher({
        cipheredPayload,
        privateKey: invalidPrvKey,
        publicKey,
        iv,
        mac
      })
    } catch (err) {
      expect(err.message).toContain('Invalid MAC')
    }
  })
})
