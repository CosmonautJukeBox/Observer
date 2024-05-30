# Node WoT & Cosmos Chain: Cosmonaut Jukebox

You need a Web of Things compatible device in order to run this code.
Potentially the WoT APIs can also be mocked.

Keep in mind you have to fill in the mnemonic words in order to run all the scripts/apps. 

### Cosmos.ts

Is a simple file to add, remove and query the queue in the smart contract.

`npm run cosmos` runs the scripts and executes whatever is uncomment.

### Server.ts

This file contains an express server. It listens on port 3000, waits for the data in clear text via API end point `/info`.

Payload
```json
{
	"moodId": 1,
	"songId": 73,
	"rootHash": "53998393858863487016871566841978821717505787554140440506639064604198901745032",
	"ledData": [ [1000, 255, 255, 255], [1000, 255, 200, 150] ]
}
```

The root hash has to match the MerkleTree written in the smart contract queue. Otherwise it gets rejected and the Lightshow and song will not be played/showed.

`npm run server` compiles the server app and keeps it running until exited.

### index.ts

Index.ts contains a simple Web of Things example. The target is still the same device, but without the smart contract interactions. The WoT TD is also not resolved, so it only lives on the device itself. In order to make it easier to understand the WoT TD is constructed in the app in Server.ts

`npm run start` compiles the mini app and runs it.

### Codegen.ts

Codegen does, as the name suggests, generate some code. Specifically the smart contract types.

`npm run codegen`