const CrowfundingCampaign = artifacts.require("CrowdfundingCampaign");
const IterableAddressMapping = artifacts.require("IterableAddressMapping")

const advanceBlockAtTime = (time) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [time],
          id: new Date().getTime(),
        },
        (err, _) => {
          if (err) {
            return reject(err);
          }
          const newBlockHash = web3.eth.getBlock("latest").hash;
  
          return resolve(newBlockHash);
        },
      );
    });
  };

contract("CrowfundingCampaign & CrowdfundingCampaignRewardSystem", accounts => {

  it("Test setup some flags", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[4]],60*60*1);

    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]});
    await instance.setup_reward('50000000000000000',{value: 20000000000000000, from: accounts[1]});
    await instance.setup_reward('60000000000000000',{value: 20000000000000000, from: accounts[1]});
    await instance.setup_reward('55000000000000000',{value: 20000000000000000, from: accounts[1]});

    rewards = await instance.flag_list();
    assert.equal(BigInt(rewards[0][0]).toString(),'50000000000000000');
    assert.equal(BigInt(rewards[1][0]).toString(),'20000000000000000');
    assert.equal(BigInt(rewards[0][1]).toString(),'55000000000000000');
    assert.equal(BigInt(rewards[0][2]).toString(),'60000000000000000');

  })

  it("Test win some flags", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[4]],60*60*1);

    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]});
    await instance.setup_reward('50000000000000000',{value: 20000000000000000, from: accounts[1]});
    await instance.setup_reward('60000000000000000',{value: 20000000000000000, from: accounts[1]});
    await instance.setup_reward('55000000000000000',{value: 20000000000000000, from: accounts[1]});

    balance_before = await web3.eth.getBalance(accounts[4]);
    receipt = await instance.fair_donation({value: '60000000000000000', from: accounts[4]});
    balance_after = await web3.eth.getBalance(accounts[4]);
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = tx.gasPrice;

    real_lose = BigInt(balance_before)-BigInt(balance_after);
    expected_lose = BigInt(gasPrice)*BigInt(receipt.receipt.gasUsed);

    assert.equal(real_lose.toString(),expected_lose.toString());
  })

  it("Test camapgin end with some un-taken rewards", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[4],accounts[5]],60*60*1);

    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]});
    await instance.setup_reward('50000000000000000',{value: 20000000000000000, from: accounts[1]});
    await instance.setup_reward('100000000000000000',{value: 10000000000000000, from: accounts[1]});
    await instance.setup_reward('55000000000000000',{value: 20000000000000000, from: accounts[1]});

    receipt = await instance.fair_donation({value: '60000000000000000', from: accounts[3]});

    await instance.setup_reward('100000000000000001',{value: 10000000000000000, from: accounts[1]});

    await advanceBlockAtTime((60*65*2)) //await 1 hour and 5 minutes

    balance_before = await web3.eth.getBalance(accounts[4]);
    receipt = await instance.withdraw({from: accounts[4]});
    balance_after = await web3.eth.getBalance(accounts[4]);
    tx = await web3.eth.getTransaction(receipt.tx);
    gasPrice = tx.gasPrice;
    real_gain = BigInt(balance_before)-BigInt(balance_after);
    expected_gain = 60000000000000000n-BigInt(gasPrice)*BigInt(receipt.receipt.gasUsed);
    assert.equal(real_lose.toString(),expected_lose.toString());

    balance_before = await web3.eth.getBalance(accounts[5]);
    receipt = await instance.withdraw({from: accounts[5]});
    balance_after = await web3.eth.getBalance(accounts[5]);
    tx = await web3.eth.getTransaction(receipt.tx);
    gasPrice = tx.gasPrice;
    real_gain = BigInt(balance_before)-BigInt(balance_after);
    expected_gain = 60000000000000000n-BigInt(gasPrice)*BigInt(receipt.receipt.gasUsed);
    assert.equal(real_lose.toString(),expected_lose.toString());

    rewards = await instance.flag_list();
    assert.equal(BigInt(rewards[0][0]).toString(),'100000000000000000');
    assert.equal(BigInt(rewards[1][0]).toString(),'10000000000000000');
    assert.equal(BigInt(rewards[0][1]).toString(),'100000000000000001');
    assert.equal(BigInt(rewards[1][1]).toString(),'10000000000000000');

  })

  it("Flag set win set win test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[4]],60*60*1);

    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]});

    //setup flgas
    await instance.setup_reward('50000000000000000',{value: 20000000000000000, from: accounts[1]});
    await instance.setup_reward('60000000000000000',{value: 20000000000000000, from: accounts[1]});
    await instance.setup_reward('55000000000000000',{value: 20000000000000000, from: accounts[1]});

    //win all flgas
    balance_before = await web3.eth.getBalance(accounts[4]);
    receipt = await instance.fair_donation({value: '60000000000000000', from: accounts[4]});
    balance_after = await web3.eth.getBalance(accounts[4]);
    tx = await web3.eth.getTransaction(receipt.tx);
    gasPrice = tx.gasPrice;
    real_lose = BigInt(balance_before)-BigInt(balance_after);
    expected_lose = BigInt(gasPrice)*BigInt(receipt.receipt.gasUsed);
    assert.equal(real_lose.toString(),expected_lose.toString());

    //setup 2 more flags
    await instance.setup_reward('60000000000000000',{value: 20000000000000000, from: accounts[1]});
    await instance.setup_reward('80000000000000000',{value: 20000000000000000, from: accounts[1]});

    //win one flag
    balance_before = await web3.eth.getBalance(accounts[4]);
    receipt = await instance.fair_donation({value: '60000000000000000', from: accounts[4]});
    balance_after = await web3.eth.getBalance(accounts[4]);
    tx = await web3.eth.getTransaction(receipt.tx);
    gasPrice = tx.gasPrice;
    real_lose = BigInt(balance_before)-BigInt(balance_after);
    expected_lose = 40000000000000000n+BigInt(gasPrice)*BigInt(receipt.receipt.gasUsed);
    assert.equal(real_lose.toString(),expected_lose.toString());

    contract_reward_remaining = await instance.total_donators_rewards();
    assert.equal(BigInt(contract_reward_remaining).toString(),'20000000000000000');

    //win the second one
    balance_before = await web3.eth.getBalance(accounts[4]);
    receipt = await instance.fair_donation({value: '80000000000000000', from: accounts[4]});
    balance_after = await web3.eth.getBalance(accounts[4]);
    tx = await web3.eth.getTransaction(receipt.tx);
    gasPrice = tx.gasPrice;
    real_lose = BigInt(balance_before)-BigInt(balance_after);
    expected_lose = 60000000000000000n+BigInt(gasPrice)*BigInt(receipt.receipt.gasUsed);
    assert.equal(real_lose.toString(),expected_lose.toString());

    contract_reward_remaining = await instance.total_donators_rewards();
    assert.equal(BigInt(contract_reward_remaining).toString(),'0');
  })

});