import {SigningCosmWasmClient} from '@cosmjs/cosmwasm-stargate'
import {GasPrice} from '@cosmjs/stargate'
import {CosmonautJukeBoxClient} from './contract/CosmonautJukeBox.client'
import {DirectSecp256k1HdWallet, OfflineDirectSigner} from "@cosmjs/proto-signing";
import {MerkleTree} from 'merkletreejs';
import sha256 from 'crypto-js/sha256';
import {Uint256} from './contract/CosmonautJukeBox.types'
import { BigNumber } from 'bignumber.js';

const mnemonic = "";
const rpcUrl = "https://rpc-falcron.pion-1.ntrn.tech" // the sdk when initialised has the squid.chains object which has the rpc's for each chain
let contractAddress = "neutron1pymcnpt6n2ewpkt96exjqv9t864lrndf8cmeahyl3t9js5dmew0qt5wtug";

let deleteItemCmd = "remove_hash"

function handleFilled(response: any){
    console.log(response)
}

function handleRejection(response: any){
    console.log(response)
}

let senderAddress: string = ""

let testData = [1, 73, [ [1000, 255, 255, 255], [1000, 255, 200, 150] ]];

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

function handleWasmClient(client: SigningCosmWasmClient){
    //const leaves = [sha256(testData[0].toString()), sha256(testData[1].toString())]
    const leaves = testData.map((elem) => {
        if(typeof elem == 'number'){
            return sha256(elem.toString()).toString();
        }else if(Array.isArray(elem)){
            return elem.map((innerElem) => {
                return sha256((innerElem[0] + innerElem[1] + innerElem[2] + innerElem[3]).toString()).toString()
            })
        }
    }).flat()
    console.log("leaves: ", leaves);

    const tree = new MerkleTree(leaves, sha256);

    const root = tree.getRoot().toString('hex');

    /*
    let toCheck = sha256("70").toString();
    const proof = tree.getProof(toCheck)
    console.log("isValid: ", tree.verify(proof, toCheck, root))
    */

    let contractClient = new CosmonautJukeBoxClient(client, senderAddress, contractAddress);

    const rootBigNumber = new BigNumber(root, 16);
    console.log("root number", rootBigNumber.toFixed(0));

    //contractClient.addLedHash({hash: rootBigNumber.toFixed(0)}, "auto");

    /*
    let getHash = contractClient.client
        .execute(senderAddress, contractAddress, "get_hash_list", "auto");
        */

    /*
    delay(10000).then(() => {
        let getHash = contractClient.client.queryContractSmart(contractAddress, "get_hash_list");

        getHash.then(handleFilled, handleRejection);
    
        console.log("sender addr: ", senderAddress);
        let deletionPromise = contractClient.client
            .execute(
                senderAddress, contractAddress, 
                "remove_hash", "auto"
            );
            
        deletionPromise.then(handleFilled, handleRejection)
    });
    */
    
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

      wasmClientPromise.then(handleWasmClient)
}

init();




