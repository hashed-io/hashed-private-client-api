const { Keyring } = require('@polkadot/keyring')
const { mnemonicGenerate } = require('@polkadot/util-crypto')

class Util {
  constructor () {
    this.keyring = new Keyring()
  }

  createKeyPair (mnemonic) {
    mnemonic = mnemonic || mnemonicGenerate()
    return this.keyring.addFromUri(mnemonic, {}, 'ed25519')
  }
}

Util.MNEMONIC1 = 'betray enhance climb rain cement trim better brick riot moment thought deny'
Util.MNEMONIC2 = 'crystal name pizza edit thumb save all fossil comfort fit rule horse'

module.exports = Util
