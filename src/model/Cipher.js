class Cipher {
  /**
   * @desc Create cipher instance
   *
   * @param {Actor} actor model class
   * @param {Object} defaultActor details of the default actor that will be used
   * in cipher/decipher operations in case an actor is not specified
   */
  constructor ({
    auth,
    actor,
    defaultActor,
    crypto
  }) {
    this._auth = auth
    this._actor = actor
    this._ciphers = {}
    this._crypto = crypto
    this._defaultCipher = this._setCipher(defaultActor)
    auth.once('logout', () => {
      this._defaultCipher = null
      this._ciphers = {}
    })
  }

  async cipher ({
    payload,
    actorId = null
  }) {
    const cipher = await this._getCipher(actorId)
    const cipheredPayload = await cipher.cipher({ payload })
    return {
      ownerActorId: cipher.actorId(),
      cipheredPayload
    }
  }

  async decipher ({
    fullCipheredPayload,
    actorId = null
  }) {
    return (await this._getCipher(actorId)).decipher({ fullCipheredPayload })
  }

  async cipherShared ({
    payload,
    publicKey,
    actorId = null
  }) {
    const cipher = await this._getCipher(actorId)
    const cipheredPayload = await cipher.cipherShared({
      payload,
      publicKey
    })
    return {
      ownerActorId: cipher.actorId(),
      cipheredPayload
    }
  }

  async decipherShared ({
    fullCipheredPayload,
    ownerPublicKey,
    toPublicKey,
    ownerActorId,
    toActorId
  }) {
    await this._addCiphers([ownerActorId, toActorId])
    let actorId = null
    let publicKey = null
    if (this.hasCipher(ownerActorId)) {
      actorId = ownerActorId
      publicKey = toPublicKey
    } else if (this.hasCipher(toActorId)) {
      actorId = toActorId
      publicKey = ownerPublicKey
    } else {
      throw new Error('User does not have permission to view the payload')
    }
    return (await this._getCipher(actorId)).decipherShared({
      fullCipheredPayload,
      publicKey
    })
  }

  async _getCipher (actorId) {
    await this._auth.assertIsLoggedIn()
    if (!actorId) {
      return this._defaultCipher
    }
    if (!this.hasCipher(actorId)) {
      const actor = await this._actor.getFullById(actorId)
      this._setCipher(actor)
    }
    return this._ciphers[actorId]
  }

  async _addCiphers (actorIds) {
    await this._auth.assertIsLoggedIn()
    actorIds = Array.isArray(actorIds) ? actorIds : [actorIds]
    for (const actorId of actorIds) {
      if (this.hasCipher(actorId)) {
        // If a cipher for an actor already exists we return as only one is needed
        // to decipher
        return
      }
    }
    const actors = await this._actor.findFullByIds(actorIds)
    for (const actor of actors) {
      this._setCipher(actor)
    }
  }

  hasCipher (actorId) {
    return !!this._ciphers[actorId]
  }

  _setCipher (actor) {
    const cipher = createCipher(actor, this._crypto)
    this._ciphers[actor.id] = cipher
    return cipher
  }
}

module.exports = Cipher

function createCipher ({
  id,
  name,
  address,
  publicKey,
  privateKey
}, crypto) {
  return {
    actorId () {
      return id
    },

    isUser () {
      return !!address
    },

    name () {
      return name
    },

    address () {
      return address
    },

    publicKey () {
      return publicKey
    },

    async cipher ({
      payload
    }) {
      return crypto.cipher({
        payload,
        privateKey
      })
    },

    decipher ({
      fullCipheredPayload
    }) {
      return crypto.decipher({
        fullCipheredPayload,
        privateKey
      })
    },

    async cipherShared ({
      payload,
      publicKey
    }) {
      return crypto.cipherShared({
        payload,
        publicKey,
        privateKey
      })
    },

    decipherShared ({
      fullCipheredPayload,
      publicKey
    }) {
      return crypto.decipherShared({
        fullCipheredPayload,
        publicKey,
        privateKey
      })
    }

  }
}
