const {
  gql
} = require('@apollo/client/core')

const BaseGQLModel = require('./BaseGQLModel')

const UPDATE_SECURITY_DATA = gql`
  mutation update_user_security_data($id: uuid!, $publicKey: String!, $securityData: String!){
    update_user(
      _set:{
        public_key: $publicKey,
        security_data: $securityData
      },
      where:{
        id: {
          _eq: $id
        },
        public_key:{
          _is_null: true
        }
      }
    ){
      affected_rows
    }
  }
`

const FIND_BY_ID = gql`
  query find_user_by_id($id: uuid!){
    user_by_pk(id:$id){
      id
      address
      public_key
      private_info{
        security_data
      }
    }
  }
`

const FIND_BY_ADDRESS = gql`
  query find_user_by_address($address: String!){
    user(where:{
      address:{
        _eq: $address
      }
    }){
      id,
      address,
      public_key
    }
  }
`

class User extends BaseGQLModel {
  constructor ({ gql }) {
    super({ gql })
  }

  async find ({
    id = null,
    address = null
  }) {
    if (id) {
      return this.findById(id)
    } else if (address) {
      return this.findByAddress(address)
    } else {
      throw new Error('A user id or address has to be provided to the User find method')
    }
  }

  async get ({
    id = null,
    address = null
  }) {
    if (id) {
      return this.getById(id)
    } else if (address) {
      return this.getByAddress(address)
    } else {
      throw new Error('A user id or address has to be provided to the User find method')
    }
  }

  async findById (id) {
    const { user_by_pk: user } = await this.query({
      query: FIND_BY_ID,
      variables: {
        id
      }
    })
    return user
  }

  async getById (id) {
    const user = await this.findById(id)
    if (!user) {
      throw new Error(`User with id: ${id} not found`)
    }
    return user
  }

  async findByAddress (address) {
    const { user } = await this.query({
      query: FIND_BY_ADDRESS,
      variables: {
        address
      }
    })
    return user.length ? user[0] : null
  }

  async getByAddress (address) {
    const user = await this.findByAddress(address)
    if (!user) {
      throw new Error(`User with address: ${address} not found`)
    }
    return user
  }

  async updateSecurityData ({ id, publicKey, securityData }) {
    await this.mutate({
      mutation: UPDATE_SECURITY_DATA,
      variables: {
        id,
        publicKey,
        securityData
      }
    })
    return this.getById(id)
  }
}

module.exports = User
