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

class SharedData extends BaseGQLModel {
  constructor ({ gql, privacy, ipfs, ownedData, user }) {
    super({ gql })
    this._privacy = privacy
    this._ipfs = ipfs
    this._ownedData = ownedData
    this._user = user
  }

  async getById (id) {
    const sharedData = await this.findById(id)
    if (!sharedData) {
      throw new Error(`Shared data with id: ${id} not found`)
    }
    return sharedData
  }

  async findById (id) {
    const { shared_data_by_pk: sharedData } = await this.query({
      query: FIND_BY_ID,
      variables: {
        id
      }
    })
    return this._addFlatProps(sharedData)
  }

  async findByCID (cid) {
    const { shared_data: sharedData } = await this.query({
      query: FIND_BY_CID,
      variables: {
        cid
      }
    })
    return sharedData.length ? this._addFlatProps(sharedData[0]) : null
  }

  async getByCID (cid) {
    const sharedData = await this.findByCID(cid)
    if (!sharedData) {
      throw new Error(`SharedData with cid: ${cid} not found`)
    }
    return sharedData
  }

  async delete (id) {
    await this.mutate({
      mutation: DELETE,
      variables: {
        id
      }
    })
  }

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

  async viewByCID ({
    cid
  }) {
    return this._view(await this.getByCID(cid))
  }

  async viewByID ({
    id
  }) {
    return this._view(await this.getById(id))
  }

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
