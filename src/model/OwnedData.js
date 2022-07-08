const {
  gql
} = require('@apollo/client/core')

const BaseGQLModel = require('./BaseGQLModel')

const UPSERT = gql`
  mutation upsert_owned_data($id: Int, $name: String!, $description: String!, $cid: String!, $type: String!, $iv: String!, $mac: String! ){
    upsert_owned_data(req:{
      id: $id,
      name: $name,
      description: $description,
      cid: $cid,
      type: $type,
      iv: $iv,
      mac: $mac
    }){
      id
      name
      description
      cid
      type
      iv
      mac
      started_at
      ended_at
      is_deleted
    }
  }
`

const UPDATE_METADATA = gql`
  mutation update_owned_data_metadata($id: Int!, $name: String!, $description: String!){
    update_owned_data_metadata(req:{
      id: $id,
      name:$name,
      description: $description
    }){
      affected_rows
    }
  }
`
const SOFT_DELETE = gql`
  mutation soft_delete_owned_data($id: Int!){
    soft_delete_owned_data(req:{
      id: $id
    }){
      affected_rows
    }
  }
`

const FIND_BY_ID = gql`
  query find_by_id($id: Int!) {
    owned_data_by_pk(id: $id) {      
      id
      owner_user_id
      name
      description
      type
      cid
      original_cid
      started_at
      ended_at
      iv
      mac
      is_deleted
    }
  }
`

const FIND_BY_CID = gql`
  query owned_data_by_cid($cid: String!){
    owned_data(where:{
      cid:{
        _eq:$cid
      }
    }){
      id
      name
      description
      type
      owner_user{
        id
        address
      }
      cid
      original_cid
      iv
      mac
      started_at
      ended_at
      is_deleted
    }
  }
`

/**
 * Provides the functionality for managing own's user private data
 */
class OwnedData extends BaseGQLModel {
  constructor ({ gql, privacy, ipfs }) {
    super({ gql })
    this._privacy = privacy
    this._ipfs = ipfs
  }

  /**
   * @desc Finds an owned data record by id
   *
   * @param {int} id
   * @return {Object|null} with the following structure
   * {
   *  "id": 69,
   *  "owner_user_id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *  "name": "name",
   *  "description": "desc",
   *  "type": "json",
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "original_cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "started_at": "2022-06-14T13:43:15.108+00:00",
   *  "ended_at": null,
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "is_deleted": false
   * }
   */
  async findById (id) {
    const { owned_data_by_pk: ownedData } = await this.query({
      query: FIND_BY_ID,
      variables: {
        id
      }
    })
    return ownedData
  }

  /**
   * @desc Gets an owned data record by id, throws error if the record is not found or if
   * the current parameter is true and the owned record is not the current version or if
   * it has been soft deleted
   *
   * @param {int} id
   * @param {boolean} current indicates whether the record must be the current version and not soft deleted
   * @return {Object} with the following structure
   * {
   *  "id": 69,
   *  "owner_user_id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *  "name": "name",
   *  "description": "desc",
   *  "type": "json",
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "original_cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "started_at": "2022-06-14T13:43:15.108+00:00",
   *  "ended_at": null,
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "is_deleted": false
   * }
   * @throws error if the record is not found or if the current parameter
   * is true and the owned record is not the current version or if
   * it has been soft deleted
   */
  async getById ({
    id,
    current = true
  }) {
    const ownedData = await this.findById(id)
    this._assertOwnedData({
      ownedData,
      hint: `id: ${id}`,
      current
    })
    return ownedData
  }

  /**
   * @desc Finds an owned data record by cid
   *
   * @param {string} cid
   * @return {Object|null} with the following structure
   * {
   *  "id": 69,
   *  "name": "name",
   *  "description": "desc",
   *  "type": "json",
   *  "owner_user": {
   *    "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *    "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua"
   *  },
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "original_cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "started_at": "2022-06-14T13:43:15.108+00:00",
   *  "ended_at": null,
   *  "is_deleted": false
   * }
   */
  async findByCID (cid) {
    const { owned_data: ownedData } = await this.query({
      query: FIND_BY_CID,
      variables: {
        cid
      }
    })
    return ownedData.length ? ownedData[0] : null
  }

  /**
   * @desc Gets an owned data record by cid, throws error if the record is not found or if
   * the current parameter is true and the owned record is not the current version or if
   * it has been soft deleted
   *
   * @param {string} cid
   * @param {boolean} current indicates whether the record must be the current version and not soft deleted
   * @return {Object} with the following structure
   * {
   *  "id": 69,
   *  "name": "name",
   *  "description": "desc",
   *  "type": "json",
   *  "owner_user": {
   *    "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *    "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua"
   *  },
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "original_cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "started_at": "2022-06-14T13:43:15.108+00:00",
   *  "ended_at": null,
   *  "is_deleted": false
   * }
   * @throws error if the record is not found or if the current parameter
   * is true and the owned record is not the current version or if
   * it has been soft deleted
   */
  async getByCID ({
    cid,
    current = true
  }) {
    const ownedData = await this.findByCID(cid)
    this._assertOwnedData({
      ownedData,
      hint: `cid: ${cid}`,
      current
    })
    return ownedData
  }

  /**
   * @desc Soft deletes an owned data record by id
   *
   * @param {int} id
   */
  async softDelete (id) {
    await this.mutate({
      mutation: SOFT_DELETE,
      variables: {
        id
      }
    })
  }

  /**
   * @desc Updates metadata related to the owned data record with the specified id
   *
   * @param {int} id of the owned data record to update
   * @param {string} name
   * @param {string} description
   */
  async updateMetadata ({
    id,
    name,
    description
  }) {
    await this.mutate({
      mutation: UPDATE_METADATA,
      variables: {
        id,
        name,
        description
      }
    })
  }

  /**
   * @desc Inserts a new or updates and owned data record, if an id is specified and the cid
   * is different a new verison of the record is inserted and returned
   *
   * @param {int} [id] of the owned data record to update
   * @param {string} name
   * @param {string} description
   * @param {Object|File} payload to be ciphered and stored
   * @return {Object} representing the owned data record with the following structure
   * {
   *  "id": 69,
   *  "name": "name",
   *  "description": "desc",
   *  "type": "json",
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "original_cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "started_at": "2022-06-14T13:43:15.108+00:00",
   *  "ended_at": null,
   *  "is_deleted": false
   * }
   * @throws error if the record is not found or if it is not the current version
   */
  async upsert ({
    id = null,
    name,
    description,
    payload
  }) {
    const {
      cipheredPayload,
      iv,
      mac,
      type
    } = await this._privacy.cipher({ payload })
    const cid = await this._ipfs.add(cipheredPayload)
    return this._upsert({
      id,
      name,
      description,
      cid,
      type,
      iv,
      mac
    })
  }

  /**
   * @desc Returns the deciphered payload specfied by the cid
   *
   * @param {string} cid related to the owned data record
   * @return {Object} representing the owned data record with the following structure
   * containing the deciphered payload
   * {
   *  "id": 69,
   *  "name": "name",
   *  "description": "desc",
   *  "type": "json",
   *  "owner_user": {
   *    "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *    "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua"
   *  },
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "original_cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "started_at": "2022-06-14T13:43:15.108+00:00",
   *  "ended_at": null,
   *  "is_deleted": false,
   *  "payload": { prop1: 1, prop2:"Hi"}
   * }
   * @throws error if the record is not found or if the logged in user is not the owner of the data
   */
  async viewByCID ({
    cid
  }) {
    return this._view(await this.getByCID({ cid, current: false }))
  }

  /**
   * @desc Returns the deciphered payload specfied by the owned data record id
   *
   * @param {int} id related to the owned data record
   * @return {Object} representing the owned data record with the following structure
   * containing the deciphered payload
   * {
   *  "id": 69,
   *  "name": "name",
   *  "description": "desc",
   *  "type": "json",
   *  "owner_user": {
   *    "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *    "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua"
   *  },
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "original_cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "started_at": "2022-06-14T13:43:15.108+00:00",
   *  "ended_at": null,
   *  "is_deleted": false,
   *  "payload": { prop1: 1, prop2:"Hi"}
   * }
   * @throws error if the record is not found or if the logged in user is not the owner of the data
   */
  async viewByID ({
    id
  }) {
    return this._view(await this.getById({ id, current: false }))
  }

  /**
   * @desc Returns the deciphered payload described by the specified parameters, this method
   * is intended to be used when the client has already retrieved the owned data record details
   * as it does not query the backend again
   *
   * @param {string} cid of the ciphered payload
   * @param {string} iv initialization vector
   * @param {string} mac message authentication code
   * @param {string} type of the payload
   * @return {Object} representing the owned data record with the following structure
   * containing the deciphered payload
   * {
   *  "type": "json",
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "payload": { prop1: 1, prop2:"Hi"}
   * }
   * @throws error if the record is not found or if the logged in user is not the owner of the data
   */
  async view ({
    cid,
    iv,
    mac,
    type
  }) {
    return this._view({
      cid,
      iv,
      mac,
      type
    })
  }

  async _view (ownedData) {
    const {
      cid,
      iv,
      mac,
      type
    } = ownedData
    const cipheredPayload = await this._ipfs.cat(cid)
    const payload = await this._privacy.decipher({
      cipheredPayload,
      iv,
      mac,
      type
    })
    return {
      ...ownedData,
      payload
    }
  }

  async _upsert ({
    id = null,
    name,
    description,
    cid,
    type,
    iv,
    mac
  }) {
    const { upsert_owned_data: ownedData } = await this.mutate({
      mutation: UPSERT,
      variables: {
        id,
        name,
        description,
        cid,
        type,
        iv,
        mac
      }
    })
    return ownedData
  }

  _assertOwnedData ({
    ownedData,
    hint,
    current = true

  }) {
    if (!ownedData) {
      throw new Error(`Owned data with ${hint} not found`)
    }
    if (current) {
      if (ownedData.is_deleted) {
        throw new Error(`Owned data with ${hint} is already deleted`)
      }

      if (ownedData.ended_at) {
        throw new Error(`Owned data with ${hint}  is not the current version`)
      }
    }
  }
}

module.exports = OwnedData
