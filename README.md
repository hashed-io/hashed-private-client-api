**Hashed Private Client API**

Enables the usage of the Hashed Private backend services by client applications.

To install the hashed private client api run the following command:

`npm i --save @smontero/hashed-private-client-api`

Access to most of the functionality is done through the HashedPrivate object which enables its configuration and provides access to the dfferent API objects:

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

Once logged in the services provided by the [OwnedData](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L98) and [SharedData](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L120) objects can be accessed.  

**OwnedData services**

* [upsert](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L175): Store a payload(object or File) in the hashed private service

```
const ownedData = await hp.ownedData().upsert({
    name: 'name1',
    description: 'desc1',
    payload: {
      prop1: 1,
      prop2: 'str1'
    }
  })
```

* [viewByID](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L205): View a stored payload by owned data id, returns the deciphered payload(object or File)

```
const ownedData = await hp.ownedData().viewByID({id})
```

* [viewByCID](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L199): View a stored payload by owned data cid, returns the deciphered payload(object or File)

```
const ownedData = await hp.ownedData().viewByCID({id})
```

**SharedData services**

* [shareExisting](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L221): Share the specified existing owned data record with another user

```
let sharedData = await hp.sharedData().shareExisting({
  toUserAddress,
  originalOwnedDataId
})
```

* [shareNew](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L189): Share new payload with another user, it first creates an owned data record for the user

```
let sharedData = await hp.sharedData().shareNew({
  toUserAddress,
  name,
  description,
  payload
})
```

* [viewByID](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/SharedData.js#L294): View a stored payload by shared data id, returns the deciphered payload(object or File)

```
const ownedData = await hp.sharedData().viewByID({id})
```

* [viewByCID](https://github.com/hashed-io/hashed-private-client-api/blob/5511ff36594bda72a17a4361524bd5dff66b52df/src/model/OwnedData.js#L199): View a stored payload by shared data cid, returns the deciphered payload(object or File)

```
const ownedData = await hp.sharedData().viewByCID({id})
```