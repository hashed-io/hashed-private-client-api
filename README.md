**Hashed Private Client API**

Enables the usage of the Hashed Private backend services by client applications.

To install the hashed private client api run the following command:

`npm i --save @smontero/hashed-private-client-api`

Access to most of the functionality is done through the HashedPrivate object which enables its configuration and provides access to the different API objects:

`import { HashedPrivate } from '@smontero/hashed-private-client-api'`



A new instance of the [HashedPrivate](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/HashedPrivate.js#L6) class has to be created passing in the 
ipfs url, hashed private server endpoint and the sigining function:

```
const hp = new HashedPrivate({
    ipfsURL: 'https://ipfs.infura.io:5001',
    privateURI: 'http://localhost:8080/v1/graphql',
    signFn: async (address, message) => {
      const { signature } = await nbvStorageApi.signMessage(message, address)
      return signature
    }
})
```

Then the user has to be logged in into the hashed private server:

`await hp.login(address)`

Once logged in the services provided by the [Document](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L98) and [Group](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L120) objects can be accessed.  

**Document services**

* [store](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L175): Store a personal private document in the hashed private service

```
const document = await hp.document().store({
    name: 'name1',
    description: 'desc1',
    payload: {
      prop1: 1,
      prop2: 'str1'
    }
  })
```
This method receives an optional actorId parameter that can be used to store a document on behalf of a group

* [share](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L175): Share a private document with another user or group

```
const document = await hp.document().share({
    toActorAddress: '5CBLWNtpdafzuUsq7P5Hn4amrBAd66R183FmHkEC7utB28ni'
    name: 'name1',
    description: 'desc1',
    payload: {
      prop1: 1,
      prop2: 'str1'
    }
  })
```
This method receives an optional actorId parameter that can be used to store a document on behalf of a group


* [viewByCID](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L199): View a stored payload by specifying the cid, returns the deciphered payload(object or File)

```
const document = await hp.document().viewByCID({cid})
```

* [updateMetadata](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L199): Update the metadata for a document

```
const document = await hp.document().updateMetadata({
    cid,
    name,
    description
  })
```

* [delete](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L199): Delete a document by specifying the cid

```
await hp.document().delete(cid)
```

**Group services**

* [getById](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L221): Get the group details by id

```
let group = await hp.group().getById(groupId)
```

* [createGroup](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L189): Create a group

```
let groupId = await hp.group().createGroup({name})
```

* [upsertMember](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L294): Insert a group member or update the role for an existing member 

```
await hp.group().upsertMember({
  userAddress,
  groupId,
  roleId
})
```

* [deleteMember](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L294): Delete a group member 

```
await hp.group().deleteMember({
  userAddress,
  groupId
})
```