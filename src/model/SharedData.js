const {
  gql
} = require('@apollo/client/core')

const BaseGQLModel = require('./BaseGQLModel')

const SHARE = gql`
  mutation share($toUserId: uuid!, $originalOwnedDataId: Int!, $cid: String!, $iv: String!, $mac: String! ){
    share(req:{
      to_user_id: $toUserId,
      original_owned_data_id:$originalOwnedDataId,
      cid: $cid,
      iv: $iv,
      mac: $mac
    }){
      id
      from_user{
        id
        address
        public_key
      }
      to_user{
        id
        address
        public_key
      }
      name
      description
      cid
      shared_at
      original_owned_data{
        id
        type
      }
      iv
      mac
    }
  }
`

const UPDATE_METADATA = gql`
  mutation update_shared_data_metadata($id: Int!, $name: String!, $description: String!){
    update_shared_data_metadata(req:{
      id: $id,
      name:$name,
      description: $description
    }){
      affected_rows
    }
  }
`
const DELETE = gql`
  mutation delete_shared_data($id: Int!){
    delete_shared_data_by_pk(id:$id){
      id
    }
  }
`

const FIND_BY_ID = gql`
  query find_by_id($id: Int!) {
    shared_data_by_pk(id: $id) {      
      id
      name
      description
      from_user{
        id
        address
        public_key
      }
      to_user{
        id
        address
        public_key
      }
      original_owned_data{
        id
        type
      }
      cid
      iv
      mac
      shared_at
    }
  }
`

const FIND_BY_CID = gql`
  query shared_data_by_cid($cid: String!){
    shared_data(where:{
      cid:{
        _eq:$cid
      }
    }){
      id
      name
      description
      from_user{
        id
        address
        public_key
      }
      to_user{
        id
        address
        public_key
      }
      original_owned_data{
        id
        type
      }
      cid
      iv
      mac
      shared_at
    }
  }
`
/**
 * Provides the functionality for managing shared private data
 * from the sharer and sharee perspectives
 */
class SharedData extends BaseGQLModel {
  constructor ({ gql, privacy, ipfs, ownedData, user }) {
    super({ gql })
    this._privacy = privacy
    this._ipfs = ipfs
    this._ownedData = ownedData
    this._user = user
  }

  /**
   * @desc Gets a shared data record by id, throws error if the record is not found
   *
   * @param {int} id
   * @return {Object} with the following structure
   * {
   *   "id": 69,
   *   "name": "name1",
   *   "description": "desc1",
   *   "from_user": {
   *     "id": "d76d2baf-a9a9-4980-929c-1d3d467810c7",
   *     "address": "5FWtfhKTuGKm9yWqzApwTfiUL4UPWukJzEcCTGYDiYHsdKaG",
   *     "public_key": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *   },
   *   "to_user": {
   *     "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *     "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua",
   *     "public_key": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
   *   },
   *   "original_owned_data": {
   *     "id": 184,
   *     "type": "json"
   *   },
   *   "cid": "QmPn3obcymCxEfKhSUVhvkLsqPytH16ghcCsthqz9A5YA9",
   *   "iv": "899398d07303510df18c58a804acf5b0",
   *   "mac": "cc82141ac5686c15ce79fa4d3a57eeee1d127db6c1e2302d312c2bc6c90a0c81",
   *   "shared_at": "2022-06-15T00:11:56.611+00:00"
   * }
   * @throws error if the record is not found
   */
  async getById (id) {
    const sharedData = await this.findById(id)
    if (!sharedData) {
      throw new Error(`Shared data with id: ${id} not found`)
    }
    return sharedData
  }

  /**
   * @desc Finds a shared data record by id
   *
   * @param {int} id
   * @return {Object|null} with the following structure
   * {
   *   "id": 69,
   *   "name": "name1",
   *   "description": "desc1",
   *   "from_user": {
   *     "id": "d76d2baf-a9a9-4980-929c-1d3d467810c7",
   *     "address": "5FWtfhKTuGKm9yWqzApwTfiUL4UPWukJzEcCTGYDiYHsdKaG",
   *     "public_key": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *   },
   *   "to_user": {
   *     "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *     "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua",
   *     "public_key": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
   *   },
   *   "original_owned_data": {
   *     "id": 184,
   *     "type": "json"
   *   },
   *   "cid": "QmPn3obcymCxEfKhSUVhvkLsqPytH16ghcCsthqz9A5YA9",
   *   "iv": "899398d07303510df18c58a804acf5b0",
   *   "mac": "cc82141ac5686c15ce79fa4d3a57eeee1d127db6c1e2302d312c2bc6c90a0c81",
   *   "shared_at": "2022-06-15T00:11:56.611+00:00"
   * }
   */
  async findById (id) {
    const { shared_data_by_pk: sharedData } = await this.query({
      query: FIND_BY_ID,
      variables: {
        id
      }
    })
    return this._addFlatProps(sharedData)
  }

  /**
   * @desc Finds a shared data record by cid
   *
   * @param {string} cid
   * @return {Object|null} with the following structure
   * {
   *   "id": 69,
   *   "name": "name1",
   *   "description": "desc1",
   *   "from_user": {
   *     "id": "d76d2baf-a9a9-4980-929c-1d3d467810c7",
   *     "address": "5FWtfhKTuGKm9yWqzApwTfiUL4UPWukJzEcCTGYDiYHsdKaG",
   *     "public_key": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *   },
   *   "to_user": {
   *     "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *     "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua",
   *     "public_key": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
   *   },
   *   "original_owned_data": {
   *     "id": 184,
   *     "type": "json"
   *   },
   *   "cid": "QmPn3obcymCxEfKhSUVhvkLsqPytH16ghcCsthqz9A5YA9",
   *   "iv": "899398d07303510df18c58a804acf5b0",
   *   "mac": "cc82141ac5686c15ce79fa4d3a57eeee1d127db6c1e2302d312c2bc6c90a0c81",
   *   "shared_at": "2022-06-15T00:11:56.611+00:00"
   * }
   */
  async findByCID (cid) {
    const { shared_data: sharedData } = await this.query({
      query: FIND_BY_CID,
      variables: {
        cid
      }
    })
    return sharedData.length ? this._addFlatProps(sharedData[0]) : null
  }

  /**
   * @desc Gets a shared data record by cid, throws error if the record is not found
   *
   * @param {string} cid
   * @return {Object} with the following structure
   * {
   *   "id": 69,
   *   "name": "name1",
   *   "description": "desc1",
   *   "from_user": {
   *     "id": "d76d2baf-a9a9-4980-929c-1d3d467810c7",
   *     "address": "5FWtfhKTuGKm9yWqzApwTfiUL4UPWukJzEcCTGYDiYHsdKaG",
   *     "public_key": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *   },
   *   "to_user": {
   *     "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *     "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua",
   *     "public_key": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
   *   },
   *   "original_owned_data": {
   *     "id": 184,
   *     "type": "json"
   *   },
   *   "cid": "QmPn3obcymCxEfKhSUVhvkLsqPytH16ghcCsthqz9A5YA9",
   *   "iv": "899398d07303510df18c58a804acf5b0",
   *   "mac": "cc82141ac5686c15ce79fa4d3a57eeee1d127db6c1e2302d312c2bc6c90a0c81",
   *   "shared_at": "2022-06-15T00:11:56.611+00:00"
   * }
   * @throws error if the record is not found
   */
  async getByCID (cid) {
    const sharedData = await this.findByCID(cid)
    if (!sharedData) {
      throw new Error(`SharedData with cid: ${cid} not found`)
    }
    return sharedData
  }

  /**
   * @desc Deletes a shared data record by id
   *
   * @param {int} id
   */
  async delete (id) {
    await this.mutate({
      mutation: DELETE,
      variables: {
        id
      }
    })
  }

  /**
   * @desc Updates metadata related to the shared data record with the specified id
   *
   * @param {int} id of the shared data record to update
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
   * @desc Creates a new shared data record for the specified payload, the data is shared with the
   * user specified by the toUserId or toUserAddress parameter this method first creates a new
   * owned data record and then creates the shared data record
   *
   * @param {string} [toUserId]
   * @param {string} [toUserAddress]
   * @param {string} name
   * @param {string} description
   * @param {Object|File} payload to be ciphered and stored
   * @return {Object} with the following structure containing data related to the
   * newly created owned data and shared data records
   * {
   *  ownedData : {
   *    "id": 69,
   *    "name": "name",
   *    "description": "desc",
   *    "type": "json",
   *    "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *    "original_cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *    "iv": "d232f60b340d7235beafed405b08b811",
   *    "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *    "started_at": "2022-06-14T13:43:15.108+00:00",
   *    "ended_at": null,
   *    "is_deleted": false
   *  },
   *  sharedData: {
   *    "id": 69,
   *    "name": "name1",
   *    "description": "desc1",
   *    "from_user": {
   *      "id": "d76d2baf-a9a9-4980-929c-1d3d467810c7",
   *      "address": "5FWtfhKTuGKm9yWqzApwTfiUL4UPWukJzEcCTGYDiYHsdKaG",
   *      "public_key": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *    },
   *    "to_user": {
   *      "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *      "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua",
   *      "public_key": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
   *    },
   *    "original_owned_data": {
   *      "id": 184,
   *      "type": "json"
   *    },
   *    "cid": "QmPn3obcymCxEfKhSUVhvkLsqPytH16ghcCsthqz9A5YA9",
   *    "iv": "899398d07303510df18c58a804acf5b0",
   *    "mac": "cc82141ac5686c15ce79fa4d3a57eeee1d127db6c1e2302d312c2bc6c90a0c81",
   *    "shared_at": "2022-06-15T00:11:56.611+00:00"
   *  }
   * }
   */
  async shareNew ({
    toUserId = null,
    toUserAddress = null,
    name,
    description,
    payload
  }) {
    const {
      id: forUserId,
      public_key: forPublicKey
    } = await this._user.get({
      id: toUserId,
      address: toUserAddress
    })
    const ownedData = await this._ownedData.upsert({
      name,
      description,
      payload
    })

    const sharedData = await this._share({
      toUserId: forUserId,
      forPublicKey,
      originalOwnedDataId: ownedData.id,
      payload
    })
    return {
      ownedData,
      sharedData
    }
  }

  /**
   * @desc Creates a new shared data record for the specified existing owned data record, the data is shared with the
   * user specified by the toUserId or toUserAddress parameter
   *
   * @param {string} [toUserId]
   * @param {string} [toUserAddress]
   * @param {int} originalOwnedDataId id of the owned data record describing the payload to share
   * @return {Object} with the following structure containing data related to the
   * newly created shared data record
   * {
   *   "id": 69,
   *   "name": "name1",
   *   "description": "desc1",
   *   "from_user": {
   *     "id": "d76d2baf-a9a9-4980-929c-1d3d467810c7",
   *     "address": "5FWtfhKTuGKm9yWqzApwTfiUL4UPWukJzEcCTGYDiYHsdKaG",
   *     "public_key": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *   },
   *   "to_user": {
   *     "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *     "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua",
   *     "public_key": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
   *   },
   *   "original_owned_data": {
   *     "id": 184,
   *     "type": "json"
   *   },
   *   "cid": "QmPn3obcymCxEfKhSUVhvkLsqPytH16ghcCsthqz9A5YA9",
   *   "iv": "899398d07303510df18c58a804acf5b0",
   *   "mac": "cc82141ac5686c15ce79fa4d3a57eeee1d127db6c1e2302d312c2bc6c90a0c81",
   *   "shared_at": "2022-06-15T00:11:56.611+00:00"
   * }
   */
  async shareExisting ({
    toUserId = null,
    toUserAddress = null,
    originalOwnedDataId
  }) {
    const {
      id: forUserId,
      public_key: forPublicKey
    } = await this._user.get({
      id: toUserId,
      address: toUserAddress
    })

    const {
      payload
    } = await this._ownedData.viewByID({
      id: originalOwnedDataId
    })
    return this._share({
      toUserId: forUserId,
      forPublicKey,
      originalOwnedDataId,
      payload
    })
  }

  /**
   * @desc Returns the deciphered payload specfied by the cid
   *
   * @param {string} cid related to the shared data record
   * @return {Object} representing the shared data record with the following structure
   * containing the deciphered payload
   * {
   *   "id": 69,
   *   "name": "name1",
   *   "description": "desc1",
   *   "from_user": {
   *     "id": "d76d2baf-a9a9-4980-929c-1d3d467810c7",
   *     "address": "5FWtfhKTuGKm9yWqzApwTfiUL4UPWukJzEcCTGYDiYHsdKaG",
   *     "public_key": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *   },
   *   "to_user": {
   *     "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *     "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua",
   *     "public_key": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
   *   },
   *   "original_owned_data": {
   *     "id": 184,
   *     "type": "json"
   *   },
   *   "cid": "QmPn3obcymCxEfKhSUVhvkLsqPytH16ghcCsthqz9A5YA9",
   *   "iv": "899398d07303510df18c58a804acf5b0",
   *   "mac": "cc82141ac5686c15ce79fa4d3a57eeee1d127db6c1e2302d312c2bc6c90a0c81",
   *   "shared_at": "2022-06-15T00:11:56.611+00:00"
   *   "payload": { prop1: 1, prop2:"Hi"}
   * }
   * @throws error if the record is not found or if the logged in user is not the sharer/sharee of the data
   */
  async viewByCID ({
    cid
  }) {
    return this._view(await this.getByCID(cid))
  }

  /**
   * @desc Returns the deciphered payload specfied by the shared data id
   *
   * @param {int} cid related to the shared data record
   * @return {Object} representing the shared data record with the following structure
   * containing the deciphered payload
   * {
   *   "id": 69,
   *   "name": "name1",
   *   "description": "desc1",
   *   "from_user": {
   *     "id": "d76d2baf-a9a9-4980-929c-1d3d467810c7",
   *     "address": "5FWtfhKTuGKm9yWqzApwTfiUL4UPWukJzEcCTGYDiYHsdKaG",
   *     "public_key": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *   },
   *   "to_user": {
   *     "id": "a917e2b7-596e-4bc0-be79-9828b0b3ea78",
   *     "address": "5FSuxe2q7qCYKie8yqmM56U4ovD1YtBb3DoPzGKjwZ98vxua",
   *     "public_key": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
   *   },
   *   "original_owned_data": {
   *     "id": 184,
   *     "type": "json"
   *   },
   *   "cid": "QmPn3obcymCxEfKhSUVhvkLsqPytH16ghcCsthqz9A5YA9",
   *   "iv": "899398d07303510df18c58a804acf5b0",
   *   "mac": "cc82141ac5686c15ce79fa4d3a57eeee1d127db6c1e2302d312c2bc6c90a0c81",
   *   "shared_at": "2022-06-15T00:11:56.611+00:00"
   *   "payload": { prop1: 1, prop2:"Hi"}
   * }
   * @throws error if the record is not found or if the logged in user is not the sharer/sharee of the data
   */
  async viewByID ({
    id
  }) {
    return this._view(await this.getById(id))
  }

  /**
   * @desc Returns the deciphered payload described by the specified parameters, this method
   * is intended to be used when the client has already retrieved the shared data record details
   * as it does not query the backend again
   *
   * @param {string} cid of the ciphered payload
   * @param {string} iv initialization vector
   * @param {string} mac message authentication code
   * @param {string} type of the payload
   * @param {string} toPublicKey the public key of the user with whom the data was shared
   * @param {string} fromPublicKey the public key of the user who shared the data
   * @return {Object} representing the owned data record with the following structure
   * containing the deciphered payload
   * {
   *  "type": "json",
   *  "cid": "QmeHEb5TF4zkP2H6Mg5TcrvDs5egPCJgWFBB7YZaLmK7jr",
   *  "iv": "d232f60b340d7235beafed405b08b811",
   *  "mac": "6da9ce5375af9cdadf762e0910674c8b10b0c2c87500ce5c36fe0d2c8ea9fa5d",
   *  "toPublicKey": "PUB_K1_6m2Gq41FwDoeY1z5SNssjx8wYgLc4UbAKtvNDrdDhVCx8CU2B8"
  *   "fromPublicKey": "PUB_K1_7afYoQhA8aSMLGtGiKiBqrwfVAGNoxbcPcredSvZ3rkny9QoyG"
   *  "payload": { prop1: 1, prop2:"Hi"}
   * }
   * @throws error if the record is not found or if the logged in user is not the owner of the data
   */
  async view ({
    cid,
    iv,
    mac,
    type,
    toPublicKey,
    fromPublicKey
  }) {
    return this._view({
      cid,
      iv,
      mac,
      type,
      toPublicKey,
      fromPublicKey
    })
  }

  async _share ({
    toUserId,
    forPublicKey,
    originalOwnedDataId,
    payload
  }) {
    const {
      cipheredPayload,
      iv,
      mac
    } = await this._privacy.cipher({ payload, forPublicKey })
    const cid = await this._ipfs.add(cipheredPayload)
    return this._insertShare({
      toUserId,
      originalOwnedDataId,
      cid,
      iv,
      mac
    })
  }

  async _insertShare ({
    toUserId,
    originalOwnedDataId,
    cid,
    iv,
    mac
  }) {
    const { share: sharedData } = await this.mutate({
      mutation: SHARE,
      variables: {
        toUserId,
        originalOwnedDataId,
        cid,
        iv,
        mac
      }
    })
    return sharedData
  }

  async _view (sharedData) {
    const {
      cid,
      iv,
      mac,
      type,
      toPublicKey,
      fromPublicKey
    } = sharedData
    const cipheredPayload = await this._ipfs.cat(cid)
    const payload = this._privacy.decipher({
      cipheredPayload,
      iv,
      mac,
      type,
      toPublicKey,
      fromPublicKey
    })
    return {
      ...sharedData,
      payload
    }
  }

  _addFlatProps (sharedData) {
    if (!sharedData) {
      return sharedData
    }
    const {
      from_user: {
        public_key: fromPublicKey
      },
      to_user: {
        public_key: toPublicKey
      },
      original_owned_data: {
        type
      }
    } = sharedData
    return {
      ...sharedData,
      fromPublicKey,
      toPublicKey,
      type
    }
  }
}

module.exports = SharedData
