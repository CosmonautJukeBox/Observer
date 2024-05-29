/**
* This file was automatically generated by @cosmwasm/ts-codegen@1.10.0.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

import { CosmWasmClient, SigningCosmWasmClient, ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { Coin, StdFee } from "@cosmjs/amino";
import { InstantiateMsg, ExecuteMsg, QueryMsg, HashListResponse } from "./CosmonautJukeBox.types";
export interface CosmonautJukeBoxReadOnlyInterface {
  contractAddress: string;
}
export class CosmonautJukeBoxQueryClient implements CosmonautJukeBoxReadOnlyInterface {
  client: CosmWasmClient;
  contractAddress: string;
  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client;
    this.contractAddress = contractAddress;
  }
}
export interface CosmonautJukeBoxInterface extends CosmonautJukeBoxReadOnlyInterface {
  contractAddress: string;
  sender: string;
  addLedHash: ({
    hash
  }: {
    hash: number;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
}
export class CosmonautJukeBoxClient extends CosmonautJukeBoxQueryClient implements CosmonautJukeBoxInterface {
  client: SigningCosmWasmClient;
  sender: string;
  contractAddress: string;
  constructor(client: SigningCosmWasmClient, sender: string, contractAddress: string) {
    super(client, contractAddress);
    this.client = client;
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.addLedHash = this.addLedHash.bind(this);
  }
  addLedHash = async ({
    hash
  }: {
    hash: number;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      add_led_hash: {
        hash
      }
    }, fee, memo, _funds);
  };
}