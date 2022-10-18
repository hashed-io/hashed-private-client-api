const {
  gql
} = require('@apollo/client/core')

const Actor = require('./Actor')

const FIND_BY_ID = gql`
  query find_group_by_id($groupId: uuid!) {
  actor_by_pk(id: $groupId){
    id
    name
    publicKey: public_key,
    users {
      user {
        id
        address
        publicKey: public_key
      },
      roleId: role_id
    }
  }
}
`

const CREATE_GROUP = gql`
  mutation create_group($name: String!, $publicKey: String!, $securityData: String!) {
    create_group(req: 
      {
        name: $name,
        public_key: $publicKey,
        security_data: $securityData
      }
    ){
      id
    }
  }
`

const UPSERT_MEMBER = gql`
  mutation upsert_member($groupId: uuid!, $userId: uuid!, $roleId: Int!){
    insert_group_user(objects:[
      {
        group_id: $groupId,
        user_id: $userId,
        role_id: $roleId
      }
    ],
      on_conflict:{
        constraint:group_user_pkey,
        update_columns:[role_id]
      }){
      affected_rows
    }
  }
`

const DELETE_MEMBER = gql`
 mutation delete_member($groupId: uuid!, $userId: uuid!) {
    delete_group_user_by_pk(group_id: $groupId, user_id: $userId){
      group_id
      user_id
      role_id
    }
  }
`

class Group extends Actor {
  constructor ({
    gql,
    crypto,
    user
  }) {
    super({ gql })
    this._crypto = crypto
    this._user = user
  }

  /**
   * @desc Finds a group by id
   *
   * @param {string} groupId
   * @return {Object|null} with the following structure
   * {
   *   "id": "551030f9-6054-4ffa-b02d-a275398ec50d",
   *   "name": "group2",
   *   "publicKey": "pubKey2",
   *   "users": [
   *     {
   *       "user": {
   *         "id": "3e4d4c1e-c0b1-433f-be0a-56cb662ce284",
   *         "address": "address",
   *         "publicKey": "publicKey20"
   *       }
   *     },
   *     {
   *       "user": {
   *         "id": "e43c5a55-46a7-41fb-ae64-b04480d8ab74",
   *         "address": "5Dnk6vQhAVDY9ysZr8jrqWJENDWYHaF3zorFA4dr9Mtbei77",
   *         "publicKey": "pubKey21"
   *       }
   *     }
   *   ]
   * }
   */
  async findById (groupId) {
    const { actor_by_pk: group } = await this.query({
      query: FIND_BY_ID,
      variables: {
        groupId
      }
    })
    return group
  }

  /**
   * @desc Finds a group by id
   *
   * @param {string} groupId
   * @return {Object|null} with the following structure
   * {
   *   "id": "551030f9-6054-4ffa-b02d-a275398ec50d",
   *   "name": "group2",
   *   "publicKey": "pubKey2",
   *   "users": [
   *     {
   *       "user": {
   *         "id": "3e4d4c1e-c0b1-433f-be0a-56cb662ce284",
   *         "address": "address",
   *         "publicKey": "publicKey20"
   *       }
   *     },
   *     {
   *       "user": {
   *         "id": "e43c5a55-46a7-41fb-ae64-b04480d8ab74",
   *         "address": "5Dnk6vQhAVDY9ysZr8jrqWJENDWYHaF3zorFA4dr9Mtbei77",
   *         "publicKey": "pubKey21"
   *       }
   *     }
   *   ]
   * }
   * @throws {Error} If group does not exist
   */
  async getById (groupId) {
    const group = await this.findById(groupId)
    if (!group) {
      throw new Error(`Group: ${groupId} does not exist`)
    }
    return group
  }

  async createGroup ({ name }) {
    const {
      publicKey,
      privateKey: securityData
    } = this._crypto.generateKeyPair()

    const {
      create_group: {
        id
      }
    } = await this.mutate({
      mutation: CREATE_GROUP,
      variables: {
        name,
        publicKey,
        securityData
      }
    })
    return id
  }

  async upsertMember ({
    userId = null,
    userAddress = null,
    groupId,
    roleId
  }) {
    userId = await this._user.getUserId({
      userId,
      userAddress
    })
    try {
      const response = await this.mutate({
        mutation: UPSERT_MEMBER,
        variables: {
          groupId,
          userId,
          roleId
        }
      }, { evict: { actorId: groupId } })
      return response
    } catch (error) {
      if (error.message.includes('check constraint of an insert/update permission has failed')) {
        throw new Error(`User does not have permission to manage members on group:${groupId}`)
      }
      throw error
    }
  }

  async deleteMember ({
    userId = null,
    userAddress = null,
    groupId
  }) {
    userId = await this._user.getUserId({
      userId,
      userAddress
    })
    const { delete_group_user_by_pk: groupUser } = await this.mutate({
      mutation: DELETE_MEMBER,
      variables: {
        groupId,
        userId
      }
    }, { evict: { actorId: groupId } })
    if (!groupUser) {
      throw new Error(`User does not have permission to delete members from group: ${groupId}`)
    }
    return groupUser
  }
}

module.exports = Group
