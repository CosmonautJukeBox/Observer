import { Servient, Helpers } from "@node-wot/core";
import { HttpClientFactory } from "@node-wot/binding-http";
import { CoapClientFactory } from "@node-wot/binding-coap";


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

const responses = Promise.all([
  wotHelper.fetch(
    `${thingConfig.protocol}${thingAddress}/.well-known/wot-thing-description`
  ),
  servient.start(),
]);

const consumeThingResponse = responses.then(consumeThing);

consumeThingResponse.catch((err) => {
  console.error("Consumed Thing error:", err);
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

consumeThingResponse
  .then(async ([thing]) => {
    let playData: PlayData[] = [
      [68, 200]
    ];
    let playRequest = new PlayRequest(1, playData)
    setSoundTo(thing, playRequest);

    return getTimeoutPromise([thing], 2000);
  })
  .then(async ([thing]) => {
    let rgbData: RGBData[] = [
      [1000, 255, 0, 0], 
      [1000, 0, 255, 0],
      [1000, 0, 0, 255],
      [1000, 0, 255, 100]
    ];
    let request = new LightChangeRequest(1, rgbData);
    setMoonTo(thing, request);
    return getTimeoutPromise([thing], 2000);
  })

