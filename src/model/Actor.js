const {
  gql
} = require('@apollo/client/core')

const BaseGQLModel = require('./BaseGQLModel')

const FIND_ACTOR_BY_ID = gql`
  query find_actor_by_id($actorId: uuid!) {
    actor_by_pk(id: $actorId){
      id
      name
      address
      publicKey: public_key
    }
  }

`

const FIND_ACTOR_BY_ADDRESS = gql`
  query find_actor_by_address($address: String!) {
    actor(where:{
      address:{
        _eq: $address
      }
    }){
      id
      name
      address
      publicKey: public_key
    }
  }

`

const FIND_FULL_ACTORS = gql`
  query find_full_actors($actorIds: [uuid!]!) {
    find_full_actors(req: {
      actorIds: $actorIds
    }){
      id
      address
      name
      publicKey
      privateKey
    }
  }

`

class Actor extends BaseGQLModel {
  /**
   * Retrieves public actor details for the specified actor
   * @param {String} actorId to retrieve details for
   * @returns {Object} with the following structure:
   * {
   *   "id": "d0b2aaac-aad7-4320-b42c-7cc5f3d72df7",
   *   "name": "group1",
   *   "address": null,
   *   "publicKey": "pubKey1"
   * }
   */
  async findById (actorId) {
    const { actor_by_pk: actor } = await this.query({
      query: FIND_ACTOR_BY_ID,
      variables: {
        actorId
      }
    })
    return actor
  }

  /**
   * Retrieves public actor details for the specified actor
   * throws error if actor not found
   * @param {String} actorId to retrieve details for
   * @returns {Object} with the following structure:
   * {
   *   "id": "d0b2aaac-aad7-4320-b42c-7cc5f3d72df7",
   *   "name": "group1",
   *   "address": null,
   *   "publicKey": "pubKey1"
   * }
   * @throws {Error} if actor not found
   */
  async getById (actorId) {
    const actor = await this.findById(actorId)
    if (!actor) {
      throw new Error(`Actor with id: ${actorId} not found`)
    }
    return actor
  }

  /**
   * Retrieves public actor details for the actor with the
   * specified address
   * @param {String} address to retrieve details for
   * @returns {Object} with the following structure:
   * {
   *     "id": "e43c5a55-46a7-41fb-ae64-b04480d8ab74",
   *     "name": null,
   *     "address": "5Dnk6vQhAVDY9ysZr8jrqWJENDWYHaF3zorFA4dr9Mtbei77",
   *     "publicKey": "pubKey21"
   *   }
   */
  async findByAddress (address) {
    const { actor: actors } = await this.query({
      query: FIND_ACTOR_BY_ADDRESS,
      variables: {
        address
      }
    })
    return actors.length ? actors[0] : null
  }

  /**
   * Retrieves public actor details for the actor with the
   * specified address throws error if actor not found
   * @param {String} address to retrieve details for
   * @returns {Object} with the following structure:
   * {
   *     "id": "e43c5a55-46a7-41fb-ae64-b04480d8ab74",
   *     "name": null,
   *     "address": "5Dnk6vQhAVDY9ysZr8jrqWJENDWYHaF3zorFA4dr9Mtbei77",
   *     "publicKey": "pubKey21"
   *   }
   * @throws {Error} if actor not found
   */
  async getByAddress (address) {
    const actor = await this.findByAddress(address)
    if (!actor) {
      throw new Error(`Actor with address: ${address} not found`)
    }
    return actor
  }

  /**
   * Retrieves public actor details for the specified actorId or address
   * throws error if actor not found
   * @param {String} [actorId] to retrieve details for
   * @param {String} [address] to retrieve details for
   * @returns {Object} with the following structure:
   * {
   *   "id": "d0b2aaac-aad7-4320-b42c-7cc5f3d72df7",
   *   "name": "group1",
   *   "address": null,
   *   "publicKey": "pubKey1"
   * }
   * @throws {Error} if actor not found
   */
  async get ({
    actorId = null,
    address = null
  }) {
    if (actorId) {
      return this.getById(actorId)
    } else if (address) {
      return this.getByAddress(address)
    } else {
      throw new Error('An actor id or address has to be provided to for the actor to retrieve')
    }
  }

  /**
   * Retrieves full actor details for the specified actors the user has access to
   * @param {Array<uuid>|uuid} actorIds to retrieve details for
   * @returns {Object} with the following structure:
   * [
   *   {
   *     "id": "551030f9-6054-4ffa-b02d-a275398ec50d",
   *     "address": "",
   *     "name": "group2",
   *     "publicKey": "pubKey2",
   *     "privateKey": "privKey2"
   *   },
   *   {
   *     "id": "c3bd2937-2cc0-4ba5-96c5-f4b7789c69cc",
   *     "address": "",
   *     "name": "group7",
   *     "publicKey": "PUB_K1_6xibRtjDceGuKMCf89idJtX3sCmBZKKt4biwFbsGEz2ju7",
   *     "privateKey": "PVT_K1_eLS9Q18vqubRdqSwpFc2xqNJNrPRPxVXYty1881sE9s7GZoxF"
   *   }
   * ]
   */
  async findFullByIds (actorIds) {
    actorIds = Array.isArray(actorIds) ? actorIds : [actorIds]
    const { find_full_actors: actor } = await this.query({
      query: FIND_FULL_ACTORS,
      variables: {
        actorIds
      }
    })
    return actor
  }

  /**
   * Retrieves full actor details for the specified actor
   * @param {Array<uuid>|uuid} actorIds to retrieve details for
   * @returns {Object} with the following structure:
   *   {
   *     "id": "551030f9-6054-4ffa-b02d-a275398ec50d",
   *     "address": "",
   *     "name": "group2",
   *     "publicKey": "pubKey2",
   *     "privateKey": "privKey2"
   *   }
   */
  async findFullById (actorId) {
    const actors = await this.findFullByIds(actorId)
    return actors.length ? actors[0] : null
  }

  /**
   * Retrieves full actor details for the specified actor
   * @param {Array<uuid>|uuid} actorIds to retrieve details for
   * @returns {Object} with the following structure:
   *   {
   *     "id": "551030f9-6054-4ffa-b02d-a275398ec50d",
   *     "address": "",
   *     "name": "group2",
   *     "publicKey": "pubKey2",
   *     "privateKey": "privKey2"
   *   }
   *  @throws When user does not have access to the actor
   */
  async getFullById (actorId) {
    const actor = await this.findFullById(actorId)
    if (!actor) {
      throw new Error(`User does not have permission to view actor's with id: ${actorId} private info`)
    }
    return actor
  }
}

module.exports = Actor
