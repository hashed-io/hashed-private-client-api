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

class OwnedData extends BaseGQLModel {
  constructor ({ gql, privacy, ipfs }) {
    super({ gql })
    this._privacy = privacy
    this._ipfs = ipfs
  }

  async findById (id) {
    const { owned_data_by_pk: ownedData } = await this.query({
      query: FIND_BY_ID,
      variables: {
        id
      }
    })
    return ownedData
  }

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

  async findByCID (cid) {
    const { owned_data: ownedData } = await this.query({
      query: FIND_BY_CID,
      variables: {
        cid
      }
    })
    return ownedData.length ? ownedData[0] : null
  }

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

  async softDelete (id) {
    await this.mutate({
      mutation: SOFT_DELETE,
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

  async viewByCID ({
    cid
  }) {
    return this._view(await this.getByCID({ cid, current: false }))
  }

  async viewByID ({
    id
  }) {
    return this._view(await this.getById({ id, current: false }))
  }

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
    const payload = this._privacy.decipher({
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
