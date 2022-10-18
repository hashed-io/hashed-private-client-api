const {
  gql
} = require('@apollo/client/core')

const BaseGQLModel = require('./BaseGQLModel')

const CREATE_DOC = gql`
  mutation create_doc($cid: String!, $ownerActorId: uuid!, $name: String!, $description: String!, $toActorId: uuid) {
    insert_document_one(object: {
      cid: $cid,
      owner_actor_id: $ownerActorId,
      to_actor_id: $toActorId,
      name: $name,
      description: $description
    }){
      cid
      ownerActorId: owner_actor_id
      toActorId: to_actor_id
      name
      description
      createdAt: created_at
      owner{
        name
        address
        publicKey: public_key
      }
      toActor: to_actor{
        name
        address
        publicKey: public_key
      }
    }
  }
`

const UPDATE_METADATA = gql`
  mutation update_doc_metadata($cid: String!, $name: String!, $description: String!) {
    update_document_by_pk(pk_columns:{
      cid: $cid
    },
    _set:{
      name: $name,
      description: $description
    }){
      cid
    }
  }
`
const DELETE = gql`
  mutation delete_doc ($cid: String!) {
    delete_document_by_pk(cid: $cid){
      cid
    }
  }

`
const FIND_BY_CID = gql`
  query doc_by_cid($cid: String!){
    document_by_pk(cid: $cid){
      cid
      ownerActorId: owner_actor_id
      toActorId: to_actor_id
      name
      description
      createdAt: created_at
      owner{
        name
        address
        publicKey: public_key
      }
      toActor: to_actor{
        name
        address
        publicKey: public_key
      }
    }
  }
`

/**
 * Provides the functionality for managing own's user private data
 */
class Document extends BaseGQLModel {
  constructor ({ actor, gql, cipher, ipfs }) {
    super({ gql })
    this._actor = actor
    this._cipher = cipher
    this._ipfs = ipfs
  }

  /**
   * @desc Finds a document data record by cid
   *
   * @param {string} cid
   * @return {Object|null} with the following structure
   * {
   *     "cid": "cid4",
   *     "ownerActorId": "9c960778-6756-4fcb-b151-b1c84d34fbaa",
   *     "toActorId": "d0b2aaac-aad7-4320-b42c-7cc5f3d72df7",
   *     "name": "doc1",
   *     "description": "document 1",
   *     "createdAt": "2022-06-14T21:15:08.013+00:00",
   *     "owner": {
   *       "name": null,
   *       "address": "address1",
   *       "publicKey": null
   *     },
   *     "toActor": {
   *       "name": "group1",
   *       "address": null,
   *       "publicKey": "pubKey1"
   *     }
   *   }
   * }
   */
  async findByCID (cid) {
    const { document_by_pk: doc } = await this.query({
      query: FIND_BY_CID,
      variables: {
        cid
      }
    })
    return doc
  }

  /**
   * @desc Gets a document data record by cid, throws error if the record is not found or
   * the user does not have access to it
   *
   * @param {string} cid
   * @return {Object} with the following structure
   * {
   *     "cid": "cid4",
   *     "ownerActorId": "9c960778-6756-4fcb-b151-b1c84d34fbaa",
   *     "toActorId": "d0b2aaac-aad7-4320-b42c-7cc5f3d72df7",
   *     "name": "doc1",
   *     "description": "document 1",
   *     "createdAt": "2022-06-14T21:15:08.013+00:00",
   *     "owner": {
   *       "name": null,
   *       "address": "address1",
   *       "publicKey": null
   *     },
   *     "toActor": {
   *       "name": "group1",
   *       "address": null,
   *       "publicKey": "pubKey1"
   *     }
   * }
   * @throws error if the record is not found or if the user does not
   * have access to the document
   */
  async getByCID (cid) {
    const doc = await this.findByCID(cid)
    if (!doc) {
      throw new Error(`User does not have access to document with cid: ${cid}`)
    }
    return doc
  }

  /**
   * @desc Deletes a document data record by cid
   *
   * @param {String} cid
   */
  async delete (cid) {
    const { delete_document_by_pk: doc } = await this.mutate({
      mutation: DELETE,
      variables: {
        cid
      }
    }, { evict: { cid } })
    if (!doc) {
      throw new Error(`User does not have permission to delete document with cid: ${cid}`)
    }
    return doc
  }

  /**
   * @desc Updates metadata related to the document record with the specified cid
   *
   * @param {string} cid of the document record to update
   * @param {string} name
   * @param {string} description
   */
  async updateMetadata ({
    cid,
    name,
    description
  }) {
    const { update_document_by_pk: doc } = await this.mutate({
      mutation: UPDATE_METADATA,
      variables: {
        cid,
        name,
        description
      }
    })
    if (!doc) {
      throw new Error(`User does not have permission to update metadata of document with cid: ${cid}`)
    }
    return doc
  }

  /**
   * @desc Stores a private document for the logged in user
   *
   * @param {string} name
   * @param {string} description
   * @param {Object|File} payload to be ciphered and stored
   * @param {string} [actorId] to be used as owner of the document this
   * is an optional parameter to be used when storing document for a group
   * @return {Object} representing the document data record with the following structure
   * {
   *   "cid": "cid20",
   *   "ownerActorId": "e43c5a55-46a7-41fb-ae64-b04480d8ab74",
   *   "toActorId": null,
   *   "name": "doc20",
   *   "description": "document20",
   *   "createdAt": "2022-10-16T23:55:42.10213+00:00",
   *   "owner": {
   *     "name": null,
   *     "address": "5Dnk6vQhAVDY9ysZr8jrqWJENDWYHaF3zorFA4dr9Mtbei77",
   *     "publicKey": "pubKey21"
   *   },
   *   "toActor": null
   *  }
   * @throws error if the record is not found or if it is not the current version
   */
  async store ({
    name,
    description,
    payload,
    actorId = null
  }) {
    console.log('Ciphering payload...')
    const {
      ownerActorId,
      cipheredPayload
    } = await this._cipher.cipher({ payload, actorId })
    console.log('Storing in ipfs...', cipheredPayload)
    const cid = await this._ipfs.add(cipheredPayload)
    console.log('Creating doc  ipfs...')
    return this._createDoc({
      name,
      description,
      cid,
      ownerActorId
    })
  }

  /**
   * @desc Shares a private document, the document is shared with the
   * actor specified by the toActorId or toActorAddress parameter
   *
   * @param {string} [toActorId]
   * @param {string} [toActorAddress]
   * @param {string} name
   * @param {string} description
   * @param {string} [actorId] to be used as owner of the document this
   * is an optional parameter to be used when sharing a document from a group
   * @param {Object|File} payload to be ciphered and stored
   * @return {Object} with the following structure containing data related to the
   * shared document
   * {
   *   "cid": "cid21",
   *   "ownerActorId": "e43c5a55-46a7-41fb-ae64-b04480d8ab74",
   *   "toActorId": "d0b2aaac-aad7-4320-b42c-7cc5f3d72df7",
   *   "name": "doc21",
   *   "description": "document21",
   *   "createdAt": "2022-10-17T00:18:09.466009+00:00",
   *   "owner": {
   *     "name": null,
   *     "address": "5Dnk6vQhAVDY9ysZr8jrqWJENDWYHaF3zorFA4dr9Mtbei77",
   *     "publicKey": "pubKey21"
   *   },
   *   "toActor": {
   *     "name": "group1",
   *     "address": null,
   *     "publicKey": "pubKey1"
   *   }
   * }
   */
  async share ({
    toActorId = null,
    toActorAddress = null,
    name,
    description,
    payload,
    actorId = null
  }) {
    const {
      id: forActorId,
      publicKey: forPublicKey
    } = await this._actor.get({
      actorId: toActorId,
      address: toActorAddress
    })

    const {
      cipheredPayload,
      ownerActorId
    } = await this._cipher.cipherShared({
      payload,
      publicKey: forPublicKey,
      actorId
    })
    const cid = await this._ipfs.add(cipheredPayload)

    return this._createDoc({
      name,
      description,
      cid,
      ownerActorId,
      toActorId: forActorId
    })
  }

  /**
   * @desc Returns the deciphered payload specified by the cid
   *
   * @param {string} cid related to the owned data record
   * @return {Object} representing the document data record with the following structure
   * containing the deciphered payload
   * {
   *     "cid": "cid4",
   *     "ownerActorId": "9c960778-6756-4fcb-b151-b1c84d34fbaa",
   *     "toActorId": "d0b2aaac-aad7-4320-b42c-7cc5f3d72df7",
   *     "name": "doc1",
   *     "description": "document 1",
   *     "createdAt": "2022-06-14T21:15:08.013+00:00",
   *     "owner": {
   *       "name": null,
   *       "address": "address1",
   *       "publicKey": null
   *     },
   *     "toActor": {
   *       "name": "group1",
   *       "address": null,
   *       "publicKey": "pubKey1"
   *     },
   *    "payload": { prop1: 1, prop2:"Hi"}
   * }
   * @throws error if the document is not found or if the logged in user is not the owner of the document
   */
  async viewByCID ({
    cid
  }) {
    return this._view(await this.getByCID(cid))
  }

  async _view (document) {
    const {
      cid,
      ownerActorId,
      toActorId,
      owner: {
        publicKey: ownerPublicKey
      }
    } = document
    console.log('Document: ', document)
    const fullCipheredPayload = await this._ipfs.cat(cid)
    let payload = null
    if (!toActorId) {
      payload = await this._cipher.decipher({
        fullCipheredPayload,
        actorId: ownerActorId
      })
    } else {
      payload = await this._cipher.decipherShared({
        fullCipheredPayload,
        ownerPublicKey,
        toPublicKey: document.toActor.publicKey,
        ownerActorId,
        toActorId
      })
    }
    return {
      ...document,
      payload
    }
  }

  async _createDoc ({
    name,
    description,
    cid,
    ownerActorId,
    toActorId
  }) {
    const { insert_document_one: doc } = await this.mutate({
      mutation: CREATE_DOC,
      variables: {
        name,
        description,
        cid,
        ownerActorId,
        toActorId
      }
    })
    return doc
  }
}

module.exports = Document
