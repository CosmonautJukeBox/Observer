/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {SigningCosmWasmClient} from '@cosmjs/cosmwasm-stargate'
import {GasPrice} from '@cosmjs/stargate'
import {CosmonautJukeBoxClient} from './contract/CosmonautJukeBox.client'
import {DirectSecp256k1HdWallet, OfflineDirectSigner} from "@cosmjs/proto-signing";
import sha256 from 'crypto-js/sha256';
import {MerkleTree} from 'merkletreejs';
import { BigNumber } from 'bignumber.js';
import {Uint256} from './contract/CosmonautJukeBox.types'
import { Servient, Helpers, ConsumedThing } from "@node-wot/core";
import { HttpClientFactory } from "@node-wot/binding-http";
import { CoapClientFactory } from "@node-wot/binding-coap";
import * as WoT from "wot-typescript-definitions";

const app = express();
const PORT = 3000;

app.use(express.json());
let queue: Array<QueueItem> = [];
let MAX_QUEUE_ITEMS = 10;

const mnemonic = "";
const rpcUrl = "https://rpc-falcron.pion-1.ntrn.tech" // the sdk when initialised has the squid.chains object which has the rpc's for each chain
let contractAddress = "neutron1pymcnpt6n2ewpkt96exjqv9t864lrndf8cmeahyl3t9js5dmew0qt5wtug";

let deleteItemCmd = "remove_hash"

const treeValidationRules = [
  body('songId').notEmpty().isNumeric().withMessage('Song ID has not been provided'),
  body('rootHash').notEmpty().isNumeric().withMessage('Root hash of the MerkleTree required'),
  body('moodId').notEmpty().isNumeric().withMessage('Mood ID required'),
  body('ledData').isArray().withMessage('LED Data is required')
  .custom((value) => {
    if (!Array.isArray(value)) {
      throw new Error('Must be an array of arrays');
    }
    value.forEach((subArray) => {
      if (!Array.isArray(subArray)) {
        throw new Error('Each item must be an array');
      }
      subArray.forEach((item) => {
        if (typeof item !== 'number') {
          throw new Error('Each item in the sub-arrays must be a number');
        }
      });
    });
    return true;
  })
];

class InfoResponse {
  inQueue: boolean;

  constructor(inQueue: boolean){
    this.inQueue = inQueue;
  }
}

class RGBValue {
  time: Number;
  r: Number;
  g: Number;
  b: Number;
  constructor(time: Number, r: Number, g: Number, b: Number){
    this.time = time;
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

class QueueItem{
  moodId: Number;
  songId: Number;
  rootHash: BigNumber;
  ledData: Array<RGBValue>;

  constructor(moodId: Number, songId: Number, rootHash: BigNumber, ledData: Array<RGBValue>){
    this.moodId = moodId;
    this.songId = songId;
    this.rootHash = rootHash;
    this.ledData = ledData;
  }
}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

let client: SigningCosmWasmClient;
let senderAddress: string;

interface ContractHashes {
  hashes: Array<string>
}

let curLength: number;
let queueBuffer: QueueItem;


function handleGetHashFilled(response: any){
  let hashes: ContractHashes = response as ContractHashes;
  console.log("HandlgetHash: ", hashes);

  if(hashes.hashes.length > curLength){
    let hashToCheck = hashes.hashes[curLength];
    if(hashToCheck == queueBuffer.rootHash.toFixed(0)){
      console.log("valid hash, yeah");
      queue.push(queueBuffer);
    }
  }else{

  }
}


function handleFilled(response: any){
  console.log(response)
}

function handleRejection(response: any){
  console.log(response)
}

app.post('/info', treeValidationRules, (req: Request, res: Response) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if(queue.length >= MAX_QUEUE_ITEMS){
    res.status(500).json({message: "Queue is full"})
  }

  let moodId: number = req.body.moodId;
  let songId: number = req.body.songId;
  let rootHash: string = req.body.rootHash;
  let ledData: Array<Array<number>> = req.body.ledData;

  delay(6000).then(() => {
    let leaves = 
      [
        sha256(moodId.toString()).toString(),
        sha256(songId.toString()).toString(),
        ledData.map((elem) => {
          return sha256((elem[0] + elem[1] + elem[2] + elem[3]).toString()).toString()
        })
      ].flat()

    const constructedTree = new MerkleTree(leaves, sha256).getRoot().toString('hex');
    const rootFromTreeBigNumber = new BigNumber(constructedTree, 16);

    if(rootFromTreeBigNumber.toFixed(0) == rootHash){
      console.log("VALID");

      let data: Array<RGBValue> = ledData.map((elem) => {
        return new RGBValue(elem[0], elem[1], elem[2], elem[3])
      });

      queueBuffer = new QueueItem(moodId, songId, rootFromTreeBigNumber, data)
      curLength = queue.length;
      let contractClient = new CosmonautJukeBoxClient(client, senderAddress, contractAddress);
      let getHash: Promise<Array<Uint256>> = 
        contractClient.client.queryContractSmart(contractAddress, "get_hash_list");

      getHash.then(handleGetHashFilled, handleRejection);

    }else{
      console.log("INVALID");
    }
  })

  res.status(201).json(new InfoResponse(true));
})

app.get("/", (req: Request, res: Response) => {


  res.send("nodejs - express + typescript");
});

class ThingConfiguration {
  protocol = "";
  address = "";
  ipv6 = true;

  constructor(protocol: string, address: string, ipv6: boolean) {
    this.protocol = protocol;
    this.address = address;
    this.ipv6 = ipv6;
  }
}

const thingConfig: ThingConfiguration = new ThingConfiguration(
  "http://",
  "192.168.1.159",
  false
);

async function getTimeoutPromise(
  data: [WoT.ConsumedThing],
  timeout: number
): Promise<[WoT.ConsumedThing]> {
  return await new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, timeout);
  });
}

const servient = new Servient();
if (thingConfig.protocol == "http://") {
  servient.addClientFactory(new HttpClientFactory());
} else if (thingConfig.protocol == "coap://") {
  servient.addClientFactory(new CoapClientFactory());
}

const wotHelper = new Helpers(servient);

async function consumeThing([td, wot]: [
  WoT.ThingDescription,
  WoT.WoT
]): Promise<[WoT.ConsumedThing]> {
  return [await wot.consume(td)];
}


const thingAddress: string = thingConfig.ipv6
  ? `[${thingConfig.address}]`
  : thingConfig.address;

const td = {
	"id": "uri:bit_block",
	"title": "bind.systems bit.block",
	"@context": [
		"https://www.w3.org/2019/wot/td/v1"
	],
	"description": "bind.systems bit.block web of things development kit",
	"base": "http://192.168.1.159/",
	"securityDefinitions": {
		"nosec_sc": {
			"scheme": "nosec"
		}
	},
	"security": [
		"nosec_sc"
	],
	"@type": [
		"BindBitBlock"
	],
	"actions": {
		"stop_sound": {
			"title": "stop playing",
			"description": "stop playing a sound",
			"@type": "stopSoundAction",
			"input": {},
			"forms": [
				{
					"href": "/things/bit_block/actions/stop_sound"
				}
			]
		},
		"sound": {
			"title": "play a sound",
			"description": "Sound playing",
			"@type": "soundAction",
			"input": {
				"type": "object",
				"properties": {
					"repeat": {
						"type": "integer"
					},
					"data": {
						"type": "array",
						"items": {
							"type": "array",
							"items": [
								{
									"type": "integer",
									"title": "index",
									"maximum": 40
								},
								{
									"type": "integer",
									"title": "time",
									"maximum": 10000
								}
							]
						}
					}
				}
			},
			"forms": [
				{
					"href": "/things/bit_block/actions/sound"
				}
			]
		},
		"moon_light": {
			"title": "Light up the moon",
			"description": "RGB light",
			"@type": "moonLightAction",
			"input": {
				"type": "object",
				"properties": {
					"repeat": {
						"type": "integer"
					},
					"data": {
						"type": "array",
						"items": {
							"type": "array",
							"items": [
								{
									"type": "integer",
									"title": "time",
									"maximum": 10000
								},
								{
									"type": "integer",
									"title": "red",
									"maximum": 255
								},
								{
									"type": "integer",
									"title": "green",
									"maximum": 255
								},
								{
									"type": "integer",
									"title": "blue",
									"maximum": 255
								}
							]
						}
					}
				}
			},
			"forms": [
				{
					"href": "/things/bit_block/actions/moon_light"
				}
			]
		},
		"head_light": {
			"title": "Light up the head",
			"description": "RGB light",
			"@type": "headLightAction",
			"input": {
				"type": "object",
				"properties": {
					"repeat": {
						"type": "integer"
					},
					"data": {
						"type": "array",
						"items": {
							"type": "array",
							"items": [
								{
									"type": "integer",
									"title": "time",
									"maximum": 10000
								},
								{
									"type": "integer",
									"title": "red"
								}
							]
						}
					}
				}
			},
      "forms": [
				{
					"href": "/things/bit_block/actions/head_light"
				}
			]
		}
	}
}

servient.start().then((WoT) => {
  WoT.consume(td).then((elems) => {
    thing = elems;
  });
});

interface ActionStatus {
  action: string
}

class LightChangeRequest {
  repeat: Number;
  data: Array<RGBData>;

  constructor(repeat: Number, data: Array<RGBData>){
    this.data = data;
    this.repeat = repeat;
  }
}

//[Time in ms, r, g, b]
type RGBData = [Number, Number, Number, Number];

function setMoonTo(thing: WoT.ConsumedThing, request: LightChangeRequest) {
  const result: Promise<ActionStatus> = thing.invokeAction("moon_light", request,
  ) as Promise<ActionStatus>;

  result
    .then((result) => {
      if (result.action == "successful") {
        console.log(`setMoon was successful`);
      } else {
        console.warn(`setMoon  has failed`);
      }
    })
    .catch((err) => {
      console.error("setMoon error:", err);
    });
}

//[Sound Index, Time to play]
type PlayData = [Number, Number]

class PlayRequest {
  repeat: Number;
  data: PlayData[];

  constructor(repeat: Number, data: PlayData[]){
    this.repeat = repeat;
    this.data = data;
  }
}

function setSoundTo(thing: WoT.ConsumedThing, request: PlayRequest) {
  console.log("request: ", request);
  const result: Promise<ActionStatus> = thing.invokeAction("sound", request,
  ) as Promise<ActionStatus>;

  result
    .then((result) => {
      if (result.action == "successful") {
        console.log(`play sound was successful`);
      } else {
        console.warn(`play sound  has failed`);
      }
    })
    .catch((err) => {
      console.error("play sound error:", err);
    });
}

let thing: WoT.ConsumedThing;


function checkQueue(){
  if(queue.length > 0){
    let elem = queue[0];
    let playData: PlayData[] = [
      [elem.songId, 300]
    ];
    let playRequest = new PlayRequest(1, playData)
    setSoundTo(thing, playRequest);
  }
}

function asignClient(signingClient: SigningCosmWasmClient){
  client = signingClient;
}

async function init(){
  const getSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
      return await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "neutron",
      });
    };
    const offlineSigner: OfflineDirectSigner = await getSignerFromMnemonic();
    senderAddress = (await offlineSigner.getAccounts())[0].address;

    let wasmClientPromise = SigningCosmWasmClient
      .connectWithSigner(
          rpcUrl,
          offlineSigner,
          {
              gasPrice: GasPrice.fromString("0.02untrn")
          }
      );

    wasmClientPromise.then(asignClient)
    setInterval(checkQueue, 1000);
}

init();

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
