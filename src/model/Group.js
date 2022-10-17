const {
  gql
} = require('@apollo/client/core')

const Actor = require('./Actor')

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
    crypto
  }) {
    super({ gql })
    this._crypto = crypto
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

  async upsertMember ({ groupId, userId, roleId }) {
    return this.mutate({
      mutation: UPSERT_MEMBER,
      variables: {
        groupId,
        userId,
        roleId
      }
    })
  }

  async deleteMember ({ groupId, userId }) {
    return this.mutate({
      mutation: DELETE_MEMBER,
      variables: {
        groupId,
        userId
      }
    })
  }
}

module.exports = Group
