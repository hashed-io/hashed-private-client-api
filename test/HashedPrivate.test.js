
jest.setTimeout(200000)
require('cross-fetch/polyfill')
const { HashedPrivate } = require('../src')
const { GroupRole } = require('../src/const')
const Util = require('./support/Util')

global.File = class {}

const util = new Util()
let keyPair1 = null
let keyPair2 = null
let keyPairNewUser = null
let hp = null
beforeAll(async () => {
  keyPair1 = util.createKeyPair(Util.MNEMONIC1)
  keyPair2 = util.createKeyPair(Util.MNEMONIC2)
  keyPairNewUser = util.createKeyPair()
  hp = newHashedPrivateInstance()
})

beforeEach(async () => {
  await logout()
})

describe('Group tests', () => {
  test('Create Group and manage members', async () => {
    const kpUser1 = await addUser()
    const kpUser2 = await addUser()
    await hp.login(keyPair1.address)
    const expectedGroup = getGroup()
    const groupId = await hp.group().createGroup(expectedGroup)
    console.log('GroupId: ', groupId)
    let group = await hp.group().findById(groupId)
    expectedGroup.users = [{
      address: keyPair1.address,
      roleId: GroupRole.Admin
    }]
    assertGroup(group, expectedGroup)

    await hp.group().upsertMember({
      userAddress: kpUser1.address,
      groupId,
      roleId: GroupRole.Member
    })
    group = await hp.group().findById(groupId)
    expectedGroup.users.push({
      address: kpUser1.address,
      roleId: GroupRole.Member
    })
    assertGroup(group, expectedGroup)

    await hp.group().upsertMember({
      userAddress: kpUser2.address,
      groupId,
      roleId: GroupRole.Admin
    })
    group = await hp.group().findById(groupId)
    expectedGroup.users.push({
      address: kpUser2.address,
      roleId: GroupRole.Admin
    })
    assertGroup(group, expectedGroup)

    await hp.group().upsertMember({
      userAddress: kpUser1.address,
      groupId,
      roleId: GroupRole.Admin
    })
    group = await hp.group().findById(groupId)
    expectedGroup.users[1].roleId = GroupRole.Admin
    assertGroup(group, expectedGroup)

    await hp.group().deleteMember({
      userAddress: kpUser2.address,
      groupId
    })
    group = await hp.group().findById(groupId)
    expectedGroup.users = expectedGroup.users.slice(0, 2)
    assertGroup(group, expectedGroup)

    await hp.login(kpUser1.address)

    await hp.group().deleteMember({
      userAddress: keyPair1.address,
      groupId
    })
    group = await hp.group().findById(groupId)
    expectedGroup.users = expectedGroup.users.slice(1, 2)
    assertGroup(group, expectedGroup)
  })

  test('Non Group admin should not be able to manage group', async () => {
    expect.assertions(5)
    const {
      member1,
      admin1,
      group: {
        id: groupId
      }
    } = await setupGroup()
    console.log('groupId: ', groupId, 'member1: ', member1.address)
    const nonMember1 = await addUser()
    const nonMember2 = await addUser()
    try {
      await hp.group().upsertMember({
        userAddress: nonMember1.address,
        groupId,
        roleId: GroupRole.Member
      })
    } catch (err) {
      expect(err.message).toContain('User does not have permission to manage members on group')
    }

    try {
      await hp.group().deleteMember({
        userAddress: member1.address,
        groupId
      })
    } catch (err) {
      expect(err.message).toContain('User does not have permission to delete members from group')
    }
    await hp.login(member1.address)
    try {
      await hp.group().upsertMember({
        userAddress: nonMember2.address,
        groupId,
        roleId: GroupRole.Member
      })
    } catch (err) {
      expect(err.message).toContain('User does not have permission to manage members on group')
    }

    try {
      await hp.group().deleteMember({
        userAddress: admin1.address,
        groupId
      })
    } catch (err) {
      expect(err.message).toContain('User does not have permission to delete members from group')
    }
  })
})

describe('HashedPrivate Integration Tests', () => {
  test('Should not be able to work with document object if not logged in', async () => {
    expect.assertions(9)
    expect(hp.isLoggedIn()).toBe(false)
    try {
      await hp.document().store(getBaseData(1))
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }

    try {
      await hp.document().viewByCID({ cid: '34asdaasd' })
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }
    await hp.login(keyPair1.address)
    expect(hp.isLoggedIn()).toBe(true)
    const document = hp.document()
    await hp.logout()
    expect(hp.isLoggedIn()).toBe(false)
    try {
      await hp.document().store(getBaseData(1))
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }

    try {
      await document.store(getBaseData(1))
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }

    try {
      await hp.document().viewByCID({ cid: '34asdaasd' })
    } catch (err) {
      expect(err.message).toContain('No user is logged in')
    }
  })

  test('New user login', async () => {
    expect(hp.isLoggedIn()).toBe(false)
    await hp.login(keyPairNewUser.address)
    expect(hp.isLoggedIn()).toBe(true)
  })

  test('Test session persistence', async () => {
    expect(hp.isLoggedIn()).toBe(false)
    await hp.login(keyPairNewUser.address)
    expect(hp.isLoggedIn()).toBe(true)
    const newHP = newHashedPrivateInstance()
    expect(newHP.isLoggedIn()).toBe(true)
    await hp.logout()
    const newHP2 = newHashedPrivateInstance()
    expect(newHP2.isLoggedIn()).toBe(false)
  })

  test('Cipher and view own document', async () => {
    await login(keyPair1.address)
    const expectedDocument = getBaseData(1)
    expectedDocument.ownerActorAddress = keyPair1.address
    let document = await hp.document().store(expectedDocument)
    assertDocument(document, expectedDocument)
    document = await hp.document().viewByCID(document)
    assertDocument(document, expectedDocument)
    expect(document.payload).toEqual(expectedDocument.payload)
  })

  test('Group can cipher and view own document', async () => {
    const {
      member1,
      admin1,
      group: {
        id: groupId
      }
    } = await setupGroup()
    await hp.login(admin1.address)
    const expectedDocument = getBaseData(1)
    expectedDocument.ownerActorId = groupId
    let document = await hp.document().store({
      ...expectedDocument,
      actorId: groupId
    })
    assertDocument(document, expectedDocument)
    document = await hp.document().viewByCID(document)
    assertDocument(document, expectedDocument)
    expect(document.payload).toEqual(expectedDocument.payload)
    await hp.login(member1.address)
    document = await hp.document().viewByCID(document)
    assertDocument(document, expectedDocument)
    expect(document.payload).toEqual(expectedDocument.payload)
  })

  test('Update owned data metadata', async () => {
    let {
      document,
      expectedDocument
    } = await setupOwnDocument(1)
    const cid = document.cid
    const name = 'name 2'
    const description = 'desc 2'
    await hp.document().updateMetadata({
      cid,
      name,
      description
    })
    document = await hp.document().getByCID(cid)
    expectedDocument.name = name
    expectedDocument.description = description
    assertDocument(document, expectedDocument)
    expect(document.cid).toBe(cid)
  })

  test('Group can update owned data metadata', async () => {
    const {
      admin1,
      group: {
        id: groupId
      }
    } = await setupGroup()
    await hp.logout()
    let {
      document,
      expectedDocument
    } = await setupOwnDocument(1, admin1, groupId)
    const cid = document.cid
    const name = 'name 2'
    const description = 'desc 2'
    await hp.document().updateMetadata({
      cid,
      name,
      description
    })
    document = await hp.document().getByCID(cid)
    expectedDocument.name = name
    expectedDocument.description = description
    assertDocument(document, expectedDocument)
    expect(document.cid).toBe(cid)
  })

  test('Should fail for non owner trying to view document', async () => {
    expect.assertions(13)
    const {
      document
    } = await setupOwnDocument(1)
    await logout()
    await login(keyPairNewUser.address)

    try {
      await hp.document().viewByCID(document)
    } catch (err) {
      expect(err.message).toContain('User does not have access to document with cid')
    }
  })

  test('Should fail for non group member trying to view group owned document', async () => {
    expect.assertions(13)
    const {
      admin1,
      group: {
        id: groupId
      }
    } = await setupGroup()
    await hp.logout()
    const {
      document
    } = await setupOwnDocument(1, admin1, groupId)
    await logout()
    await login(keyPairNewUser.address)

    try {
      await hp.document().viewByCID(document)
    } catch (err) {
      expect(err.message).toContain('User does not have access to document with cid')
    }
  })

  test('Delete own document', async () => {
    let { document } = await setupOwnDocument(1)
    const { cid } = document
    document = await hp.document().findByCID(cid)
    expect(document).toBeDefined()
    await hp.document().delete(cid)
    document = await hp.document().findByCID(cid)
    expect(document).toBeNull()
  })

  test('Share data and view', async () => {
    await login(keyPair1.address)
    await logout()
    await login(keyPair2.address)
    const expectedDocument = getBaseData(2)
    expectedDocument.ownerActorAddress = keyPair2.address
    expectedDocument.toActorAddress = keyPair1.address
    let document = await hp.document().share(expectedDocument)
    assertSharedDocument(document, expectedDocument)

    document = await hp.document().viewByCID(document)
    assertSharedDocument(document, expectedDocument)
    expect(document.payload).toEqual(expectedDocument.payload)

    await assertCanViewSharedDocument(keyPair1, document.cid, expectedDocument)
  })

  test('User can share data with group', async () => {
    const {
      admin1,
      member1,
      group: {
        id: groupId
      }
    } = await setupGroup()
    await hp.logout()
    await login(keyPair2.address)
    const expectedDocument = getBaseData(2)
    expectedDocument.ownerActorAddress = keyPair2.address
    expectedDocument.toActorId = groupId
    let document = await hp.document().share(expectedDocument)
    assertSharedDocument(document, expectedDocument)

    document = await hp.document().viewByCID(document)
    assertSharedDocument(document, expectedDocument)
    expect(document.payload).toEqual(expectedDocument.payload)

    await assertCanViewSharedDocument(admin1, document.cid, expectedDocument)
    await assertCanViewSharedDocument(member1, document.cid, expectedDocument)
  })

  test('Group can share data with user', async () => {
    const {
      admin1,
      member1,
      group: {
        id: groupId
      }
    } = await setupGroup()
    await hp.logout()
    await login(admin1.address)
    const expectedDocument = getBaseData(2)
    expectedDocument.ownerActorId = groupId
    expectedDocument.actorId = groupId
    expectedDocument.toActorAddress = keyPair1.address
    let document = await hp.document().share(expectedDocument)
    assertSharedDocument(document, expectedDocument)

    document = await hp.document().viewByCID(document)
    assertSharedDocument(document, expectedDocument)
    expect(document.payload).toEqual(expectedDocument.payload)

    await assertCanViewSharedDocument(keyPair1, document.cid, expectedDocument)
    await assertCanViewSharedDocument(member1, document.cid, expectedDocument)
  })

  test('Group can share data with group', async () => {
    const g1 = await setupGroup()
    const g2 = await setupGroup()
    await hp.logout()
    await login(g1.admin1.address)
    const expectedDocument = getBaseData(2)
    expectedDocument.ownerActorId = g1.group.id
    expectedDocument.actorId = g1.group.id
    expectedDocument.toActorId = g2.group.id
    let document = await hp.document().share(expectedDocument)
    assertSharedDocument(document, expectedDocument)

    document = await hp.document().viewByCID(document)
    assertSharedDocument(document, expectedDocument)
    expect(document.payload).toEqual(expectedDocument.payload)

    await assertCanViewSharedDocument(g1.member1, document.cid, expectedDocument)
    await assertCanViewSharedDocument(g2.member1, document.cid, expectedDocument)
    await assertCanViewSharedDocument(g2.admin1, document.cid, expectedDocument)
  })

  test('Update shared data metadata', async () => {
    let { document, expectedDocument } = await setupSharedDocument(1)
    await logout()
    await login(keyPair1.address)
    const name = 'Updated name'
    const description = 'Updated description'
    const { cid } = document
    await hp.document().updateMetadata({
      cid,
      name,
      description
    })
    expectedDocument.name = name
    expectedDocument.description = description
    document = await hp.document().getByCID(cid)
    assertSharedDocument(document, expectedDocument)
  })

  test('Should fail for non owner trying to view shared data', async () => {
    expect.assertions(18)
    const { document } = await setupSharedDocument(1)
    await logout()
    await login(keyPairNewUser.address)
    try {
      await hp.document().viewByCID(document)
    } catch (err) {
      expect(err.message).toContain('User does not have access to document with cid')
    }
  })

  test('Only "shared to" user can update metadata', async () => {
    expect.assertions(15)
    const { document } = await setupSharedDocument(1)
    const name = 'Updated name'
    const description = 'Updated description'
    const cid = document.cid
    try {
      await hp.document().updateMetadata({
        cid,
        name,
        description
      })
    } catch (err) {
      expect(err.message).toContain('User does not have permission to update metadata of document with cid')
    }
  })

  test('Delete shared document', async () => {
    let { document } = await setupSharedDocument(1)
    await logout()
    await login(keyPair1.address)
    document = await hp.document().findByCID(document.cid)
    expect(document).toBeDefined()
    await hp.document().delete(document.cid)
    document = await hp.document().findByCID(document.cid)
    expect(document).toBeNull()
  })

  test('Only "shared to" user can delete shared document', async () => {
    expect.assertions(15)
    const { document } = await setupSharedDocument(1)
    try {
      await hp.document().delete(document.cid)
    } catch (err) {
      expect(err.message).toContain('User does not have permission to delete document with cid')
    }
  })
})

function newHashedPrivateInstance () {
  console.log(`Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`)
  return new HashedPrivate({
    ipfsURL: 'https://ipfs.infura.io:5001',
    ipfsAuthHeader: `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`,
    privateURI: 'http://localhost:8080/v1/graphql',
    signFn: (address, message) => {
      const keyPair = util.keyring.getPair(address)
      return keyPair.sign(message)
    }
  })
}

async function setupSharedDocument (num) {
  await login(keyPair1.address)
  await logout()
  await login(keyPair2.address)
  const expectedDocument = getBaseData(num)
  expectedDocument.ownerActorAddress = keyPair2.address
  expectedDocument.toActorAddress = keyPair1.address
  const document = await hp.document().share(expectedDocument)
  assertSharedDocument(document, expectedDocument)
  return {
    document,
    expectedDocument
  }
}

async function setupOwnDocument (num, userKP = null, ownerActorId = null) {
  userKP = userKP || keyPair1
  await login(userKP.address)
  const expectedDocument = getBaseData(num)
  if (ownerActorId) {
    expectedDocument.ownerActorId = ownerActorId
  } else {
    expectedDocument.ownerActorAddress = userKP.address
  }
  const document = await hp.document().store({
    ...expectedDocument,
    actorId: ownerActorId
  })
  assertDocument(document, expectedDocument)
  return {
    expectedDocument,
    document
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

async function addUser () {
  const kp = util.createKeyPair()
  await hp.login(kp.address)
  return kp
}

function getBaseData (num) {
  return {
    name: `name${num}`,
    description: `desc${num}`,
    payload: {
      prop1: num,
      prop2: `str${num}`
    }
  }
}

async function setupGroup () {
  const kpUser1 = await addUser()
  const kpUser2 = await addUser()
  const kpUser3 = await addUser()
  await hp.login(kpUser3.address)
  const groupId = await hp.group().createGroup(getGroup())
  await hp.group().upsertMember({
    userAddress: kpUser1.address,
    groupId,
    roleId: GroupRole.Member
  })
  await hp.group().upsertMember({
    userAddress: kpUser2.address,
    groupId,
    roleId: GroupRole.Admin
  })
  const group = await hp.group().findById(groupId)
  return {
    admin1: kpUser3,
    admin2: kpUser2,
    member1: kpUser1,
    group
  }
}

function getGroup () {
  return {
    name: `g${Date.now()}`
  }
}

function assertDocument (actual, expected) {
  expect(actual.name).toBe(expected.name)
  expect(actual.description).toBe(expected.description)
  expect(actual.cid).not.toBeNull()
  expect(actual.createdAt).not.toBeNull()
  expect(expected.ownerActorId || expected.ownerActorAddress).toBeDefined()
  if (expected.ownerActorId) {
    expect(actual.ownerActorId).toBe(expected.ownerActorId)
  }
  if (expected.ownerActorAddress) {
    expect(actual.owner.address).toBe(expected.ownerActorAddress)
  }
}

async function assertCanViewSharedDocument (userKP, cid, expectedDocument) {
  await logout()
  await login(userKP.address)
  document = await hp.document().viewByCID({ cid })
  assertSharedDocument(document, expectedDocument)
  expect(document.payload).toEqual(expectedDocument.payload)
}

function assertSharedDocument (actual, expected) {
  expect(actual.name).toBe(expected.name)
  expect(actual.description).toBe(expected.description)
  expect(actual.cid).not.toBeNull()
  expect(expected.ownerActorId || expected.ownerActorAddress).toBeDefined()
  if (expected.ownerActorId) {
    expect(actual.ownerActorId).toBe(expected.ownerActorId)
  }
  if (expected.ownerActorAddress) {
    expect(actual.owner.address).toBe(expected.ownerActorAddress)
  }
  expect(expected.toActorId || expected.toActorAddress).toBeDefined()
  if (expected.toActorId) {
    expect(actual.toActorId).toBe(expected.toActorId)
  }
  if (expected.toActorAddress) {
    expect(actual.toActor.address).toBe(expected.toActorAddress)
  }
  expect(actual.createdAt).not.toBeNull()
}

function assertGroup (actual, expected) {
  expect(actual.name).toBe(expected.name)
  expect(actual.users.length).toBe(expected.users.length)
  for (const user of expected.users) {
    assertGroupUser(actual, user)
  }
}

function assertGroupUser (group, user) {
  const {
    name,
    users
  } = group
  for (const u of users) {
    if (user.address === u.user.address) {
      expect(user.roleId).toBe(u.roleId)
      return
    }
  }
  throw new Error(`User with address: ${user.address} is not part of group: ${name}`)
}
