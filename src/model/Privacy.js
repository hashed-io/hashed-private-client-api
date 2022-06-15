const mime = require('mime-types')
const { Crypto } = require('../service')

class Privacy {
  constructor ({ auth }) {
    this._auth = auth
  }

  async cipher ({ payload, forPublicKey = null }) {
    const { public_key: publicKey, private_info: { security_data: privateKey } } = this._auth.getUserInfo()
    forPublicKey = forPublicKey || publicKey

    let type = null
    if (payload instanceof File) {
      type = this._getExtension(payload.type)
      payload = new Uint8Array(await payload.arrayBuffer())
    } else {
      type = 'json'
      payload = JSON.stringify(payload)
    }

    return {
      type,
      ...Crypto.cipher({
        payload,
        privateKey,
        forPublicKey
      })
    }
  }

  decipher ({
    cipheredPayload,
    iv,
    mac,
    type,
    toPublicKey = null,
    fromPublicKey = null
  }) {
    const { public_key: userPublicKey, private_info: { security_data: privateKey } } = this._auth.getUserInfo()
    let publicKey = userPublicKey
    if (toPublicKey && fromPublicKey) {
      publicKey = toPublicKey === userPublicKey ? fromPublicKey : toPublicKey
    } else if (toPublicKey) {
      publicKey = toPublicKey
    } else if (fromPublicKey) {
      publicKey = fromPublicKey
    }
    let payload = Crypto.decipher({
      cipheredPayload,
      privateKey,
      publicKey,
      iv,
      mac
    })
    if (type === 'json') {
      return JSON.parse(new TextDecoder('utf-8').decode(payload))
    } else {
      payload = new Uint8Array(payload)
      return new File([payload], `payload-${iv}.${type}`, { type: mime.lookup(type) })
    }
  }

  _getExtension (extensionType) {
    return extensionType.indexOf('/') > -1 ? mime.extension(extensionType) : extensionType
  }
}

module.exports = Privacy
