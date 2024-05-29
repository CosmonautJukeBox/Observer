import codegen from '@cosmwasm/ts-codegen';

codegen({
  contracts: [
    {
      name: 'cosmonaut-juke-box',
      dir: './contract/cosmonaut-juke-box/schema/'
    }
  ],
  outPath: './src/contract/',

  // options are completely optional ;)
  options: {
    types: {
      enabled: true
    },
    client: {
      enabled: true
    },
    reactQuery: {
      enabled: false,
      optionalClient: true,
      version: 'v4',
      mutations: true,
      queryKeys: true,
      queryFactory: true,
    },
    recoil: {
      enabled: false
    },
    messageComposer: {
      enabled: false
    },
    messageBuilder: {
      enabled: false
    },
    useContractsHook: {
      enabled: false
    }
  }
}).then(() => {
  console.log('✨ all done!');
});
