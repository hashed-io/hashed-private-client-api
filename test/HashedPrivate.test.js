const { stringToU8a, u8aToHex } = require('@polkadot/util')
const { Keyring } = require('@polkadot/keyring')
const { mnemonicGenerate } = require('@polkadot/util-crypto')
require('cross-fetch/polyfill')
const { HashedPrivate } = require('../src')

global.File = class {}

const MNEMONIC1 = 'betray enhance climb rain cement trim better brick riot moment thought deny'
const MNEMONIC2 = 'crystal name pizza edit thumb save all fossil comfort fit rule horse'

let keyPair1 = null
let keyPair2 = null
let keyPairNewUser = null
let keyring = null
let hp = null
beforeAll(async () => {
  keyring = new Keyring()
  keyPair1 = createKeyPair(MNEMONIC1)
  keyPair2 = createKeyPair(MNEMONIC2)
  keyPairNewUser = createKeyPair(mnemonicGenerate())
  hp = new HashedPrivate({
    ipfsURL: 'https://ipfs.infura.io:5001',
    privateURI: 'http://localhost:8080/v1/graphql',
    signFn: (address, message) => {
      const keyPair = keyring.getPair(address)
      return u8aToHex(keyPair.sign(stringToU8a(message)))
    }
  })
})

beforeEach(async () => {
  await logout()
})

describe('HashedPrivate Integration Tests', () => {
  test('Should not be able to work with owned data and shared data if not logged in', async () => {
    expect.assertions(8)
    expect(hp.isLoggedIn()).toBe(false)
    try {
      await hp.ownedData().upsert(getBaseData(1))
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }

    try {
      await hp.sharedData().viewByID({ id: 1 })
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }
    await hp.login(keyPair1.address)
    expect(hp.isLoggedIn()).toBe(true)
    await hp.logout()
    expect(hp.isLoggedIn()).toBe(false)
    try {
      await hp.ownedData().upsert(getBaseData(1))
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }

    try {
      await hp.sharedData().viewByID({ id: 1 })
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }
  })

  test('New user login', async () => {
    expect(hp.isLoggedIn()).toBe(false)
    await hp.login(keyPairNewUser.address)
    expect(hp.isLoggedIn()).toBe(true)
  })

  test('Cipher and view owned data', async () => {
    await login(keyPair1.address)
    const expectedOwnedData = getBaseData(1)
    let ownedData = await hp.ownedData().upsert(expectedOwnedData)
    assertOwnedData(ownedData, expectedOwnedData)
    const { payload } = await hp.ownedData().view(ownedData)
    expect(payload).toEqual(expectedOwnedData.payload)
    ownedData = await hp.ownedData().viewByID(ownedData)
    assertOwnedData(ownedData, expectedOwnedData)
    expect(ownedData.payload).toEqual(expectedOwnedData.payload)
    ownedData = await hp.ownedData().viewByCID(ownedData)
    assertOwnedData(ownedData, expectedOwnedData)
    expect(ownedData.payload).toEqual(expectedOwnedData.payload)
  })

  test('Update owned data metadata', async () => {
    let {
      ownedData,
      expectedOwnedData
    } = await setupOwnedData(1)
    const id = ownedData.id
    const name = 'name 2'
    const description = 'desc 2'
    await hp.ownedData().updateMetadata({
      id,
      name,
      description
    })
    ownedData = await hp.ownedData().getById({
      id: ownedData.id
    })
    expectedOwnedData.name = name
    expectedOwnedData.description = description
    assertOwnedData(ownedData, expectedOwnedData)
    expect(ownedData.id).toBe(id)
  })

  test('Should fail for non owner trying to view owned data', async () => {
    expect.assertions(18)
    const {
      ownedData
    } = await setupOwnedData(1)
    await logout()
    await login(keyPairNewUser.address)

    try {
      await hp.ownedData().view(ownedData)
    } catch (err) {
      expect(err.message).toContain('Invalid MAC')
    }
  })

  test('Upsert new owned data version', async () => {
    let {
      ownedData: ownedDataV1,
      expectedOwnedData
    } = await setupOwnedData(1)
    expectedOwnedData.id = ownedDataV1.id
    expectedOwnedData.payload.prop1 = 5
    const ownedDataV2 = await hp.ownedData().upsert(expectedOwnedData)
    assertOwnedData(ownedDataV2, expectedOwnedData)
    expect(ownedDataV1.id).not.toBe(ownedDataV2.id)
    const { payload } = await hp.ownedData().view(ownedDataV2)
    expect(payload).toEqual(expectedOwnedData.payload)
    ownedDataV1 = await hp.ownedData().getById({
      id: ownedDataV1.id,
      current: false
    })
    expect(ownedDataV1.ended_at).not.toBeNull()
  })

  test('Soft delete owned data', async () => {
    let { ownedData } = await setupOwnedData(1)
    await hp.ownedData().softDelete(ownedData.id)
    ownedData = await hp.ownedData().getById({
      id: ownedData.id,
      current: false
    })
    expect(ownedData.ended_at).not.toBeNull()
    expect(ownedData.is_deleted).toBe(true)
  })

  test('Share data and view', async () => {
    await login(keyPair1.address)
    await logout()
    await login(keyPair2.address)
    const expectedData = getBaseData(2)
    const ownedData = await hp.ownedData().upsert(expectedData)
    assertOwnedData(ownedData, expectedData)
    expectedData.fromUserAddress = keyPair2.address
    expectedData.toUserAddress = keyPair1.address
    expectedData.originalOwnedDataId = ownedData.id
    let sharedData = await hp.sharedData().shareExisting(expectedData)
    assertSharedData(sharedData, expectedData)

    sharedData = await hp.sharedData().viewByID({
      id: sharedData.id
    })
    assertSharedData(sharedData, expectedData)
    expect(sharedData.payload).toEqual(expectedData.payload)

    await logout()
    await login(keyPair1.address)

    const {
      cid,
      iv,
      mac,
      original_owned_data: {
        type
      },
      from_user: {
        public_key: fromPublicKey
      },
      to_user: {
        public_key: toPublicKey
      }
    } = sharedData
    const { payload } = await hp.sharedData().view({
      cid,
      iv,
      mac,
      type,
      toPublicKey,
      fromPublicKey
    })
    expect(payload).toEqual(expectedData.payload)
    sharedData = await hp.sharedData().viewByID({
      id: sharedData.id
    })
    assertSharedData(sharedData, expectedData)
    expect(sharedData.payload).toEqual(expectedData.payload)
    sharedData = await hp.sharedData().viewByCID({
      cid: sharedData.cid
    })
    assertSharedData(sharedData, expectedData)
    expect(sharedData.payload).toEqual(expectedData.payload)
  })

  test('Share new owned data', async () => {
    await login(keyPair1.address)
    await logout()
    await login(keyPair2.address)
    const expectedData = getBaseData(1)
    expectedData.fromUserAddress = keyPair2.address
    expectedData.toUserAddress = keyPair1.address
    let {
      ownedData,
      sharedData
    } = await hp.sharedData().shareNew(expectedData)
    assertSharedData(sharedData, expectedData)

    ownedData = await hp.ownedData().viewByID(ownedData)
    assertOwnedData(ownedData, expectedData)
    expect(ownedData.payload).toEqual(expectedData.payload)
    sharedData = await hp.sharedData().viewByID({
      id: sharedData.id
    })
    assertSharedData(sharedData, expectedData)
    expect(sharedData.payload).toEqual(expectedData.payload)

    await logout()
    await login(keyPair1.address)

    sharedData = await hp.sharedData().viewByID({
      id: sharedData.id
    })
    assertSharedData(sharedData, expectedData)
    expect(sharedData.payload).toEqual(expectedData.payload)
  })

  test('Update shared data metadata', async () => {
    let { sharedData, expectedData } = await setupSharedData(1)
    await logout()
    await login(keyPair1.address)
    const name = 'Updated name'
    const description = 'Updated description'
    const id = sharedData.id
    await hp.sharedData().updateMetadata({
      id,
      name,
      description
    })
    expectedData.name = name
    expectedData.description = description
    sharedData = await hp.sharedData().getById(id)
    assertSharedData(sharedData, expectedData)
  })

  test('Should fail for non owner trying to view shared data', async () => {
    expect.assertions(21)
    const { sharedData } = await setupSharedData(1)
    await logout()
    await login(keyPairNewUser.address)
    try {
      const {
        cid,
        iv,
        mac,
        original_owned_data: {
          type
        },
        from_user: {
          public_key: fromPublicKey
        },
        to_user: {
          public_key: toPublicKey
        }
      } = sharedData
      await hp.sharedData().view({
        cid,
        iv,
        mac,
        type,
        toPublicKey,
        fromPublicKey
      })
    } catch (err) {
      expect(err.message).toContain('Invalid MAC')
    }
  })

  test('Only "shared to" user can update metadata', async () => {
    expect.assertions(18)
    const { sharedData } = await setupSharedData(1)
    const name = 'Updated name'
    const description = 'Updated description'
    const id = sharedData.id
    try {
      await hp.sharedData().updateMetadata({
        id,
        name,
        description
      })
    } catch (err) {
      expect(err.message).toContain('has not been shared data with id')
    }
  })

  test('Delete shared data', async () => {
    let { sharedData } = await setupSharedData(1)
    await logout()
    await login(keyPair1.address)

    await hp.sharedData().delete(sharedData.id)
    sharedData = await hp.sharedData().findById(sharedData.id)
    expect(sharedData).toBeNull()
  })
  /** *Hasura does not throw error, it just does not delete the record */
  // test('Only "shared to" user can delete share', async () => {
  //   expect.assertions(18)
  //   await login(keyPair1.address)
  //   await logout()
  //   await login(keyPair2.address)
  //   const expectedData = getBaseData(1)
  //   expectedData.fromUserAddress = keyPair2.address
  //   expectedData.toUserAddress = keyPair1.address
  //   const {
  //     sharedData
  //   } = await hp.sharedData().shareNew(expectedData)
  //   assertSharedData(sharedData, expectedData)
  //   try {
  //     console.log('Shared data id: ', sharedData.id)
  //     await hp.sharedData().delete(sharedData.id)
  //   } catch (err) {
  //     expect(err.message).toContain('has not been shared data with id')
  //   }
  // })
})

async function setupSharedData (num) {
  await login(keyPair1.address)
  await logout()
  await login(keyPair2.address)
  const expectedData = getBaseData(num)
  expectedData.fromUserAddress = keyPair2.address
  expectedData.toUserAddress = keyPair1.address
  const {
    ownedData,
    sharedData
  } = await hp.sharedData().shareNew(expectedData)
  assertSharedData(sharedData, expectedData)
  return {
    ownedData,
    sharedData,
    expectedData
  }
}

async function setupOwnedData (num) {
  await login(keyPair1.address)
  const expectedOwnedData = getBaseData(num)
  const ownedData = await hp.ownedData().upsert(expectedOwnedData)
  assertOwnedData(ownedData, expectedOwnedData)
  return {
    expectedOwnedData,
    ownedData
  }
}
async function login (address) {
  expect(hp.isLoggedIn()).toBe(false)
  await hp.login(address)
  expect(hp.isLoggedIn()).toBe(true)
}

async function logout () {
  await hp.logout()
  expect(hp.isLoggedIn()).toBe(false)
}

function createKeyPair (mnemonic) {
  return keyring.addFromUri(mnemonic, {}, 'ed25519')
}

function getBaseData (num) {
  return {
    name: `name${num}`,
    description: `desc${num}`,
    payload: {
      prop1: num,
      prop2: `str${num}`
    },
    type: 'json'
  }
}

function assertOwnedData (actual, expected) {
  expect(actual.id).not.toBeNull()
  expect(actual.id).toBeGreaterThan(0)
  expect(actual.name).toBe(expected.name)
  expect(actual.description).toBe(expected.description)
  expect(actual.cid).not.toBeNull()
  expect(actual.iv).not.toBeNull()
  expect(actual.mac).not.toBeNull()
  expect(actual.type).toBe(expected.type)
  expect(actual.started_at).not.toBeNull()
  expect(actual.ended_at).toBeNull()
  expect(actual.is_deleted).toBe(false)
}

function assertSharedData (actual, expected) {
  expect(actual.id).not.toBeNull()
  expect(actual.id).toBeGreaterThan(0)
  expect(actual.name).toBe(expected.name)
  expect(actual.description).toBe(expected.description)
  expect(actual.from_user.address).toBe(expected.fromUserAddress)
  expect(actual.to_user.address).toBe(expected.toUserAddress)
  expect(actual.cid).not.toBeNull()
  expect(actual.iv).not.toBeNull()
  expect(actual.mac).not.toBeNull()
  expect(actual.original_owned_data.type).toBe(expected.type)
  expect(actual.shared_at).not.toBeNull()
  if (expected.originalOwnedDataId) {
    expect(actual.original_owned_data.id).toBe(expected.originalOwnedDataId)
  }
}
