const {
  gql
} = require('@apollo/client/core')

const Actor = require('./Actor')

const UPDATE_SECURITY_DATA = gql`
  mutation update_user_security_data($id: uuid!, $publicKey: String!, $securityData: String!){
    update_actor(
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

const FIND_BY_ADDRESS = gql`
  query find_user_by_address($address: String!){
    actor(where:{
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

class User extends Actor {
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

  async findByAddress (address) {
    const { actor: user } = await this.query({
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

  async getUserId ({
    userId = null,
    userAddress = null
  }) {
    if (userId) {
      return userId
    }
    if (userAddress) {
      const { id } = await this.getByAddress(userAddress)
      return id
    }
    throw new Error('User id or address must be specified')
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
    return this.getFullById(id)
  }
}

module.exports = User
