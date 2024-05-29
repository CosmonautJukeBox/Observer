import {SigningCosmWasmClient} from '@cosmjs/cosmwasm-stargate'
import {GasPrice} from '@cosmjs/stargate'
import {CosmonautJukeBoxClient} from './contract/CosmonautJukeBox.client'
import {DirectSecp256k1HdWallet, OfflineDirectSigner} from "@cosmjs/proto-signing";

const mnemonic = "";
const rpcUrl = "https://rpc-falcron.pion-1.ntrn.tech" // the sdk when initialised has the squid.chains object which has the rpc's for each chain
let contractAddress = "neutron1fjh9n8ppz2ccc4ytksuv32nkg8qnnaau3q6j3r0xhw83pxc90h0q6n639p";

let deleteItemCmd = "remove_hash"

function handleFilled(response: any){
    console.log(response)
}

function handleRejection(response: any){
    console.log(response)
}

let senderAddress: string = ""

function handleWasmClient(client: SigningCosmWasmClient){
    client.getAccount
    let contractClient = new CosmonautJukeBoxClient(client, senderAddress, contractAddress);

    let deletionPromise = contractClient.client
        .execute(
            senderAddress, contractAddress, 
            deleteItemCmd, "auto"
        );
    deletionPromise.then(handleFilled, handleRejection)
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




