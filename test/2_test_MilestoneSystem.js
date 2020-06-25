const CrowfundingCampaign = artifacts.require("CrowdfundingCampaign");
const CrowdfundingCampaignMilestoneSystem = artifacts.require("CrowdfundingCampaignMilestoneSystem");
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

contract("CrowfundingCampaign & CrowdfundingCampaignMilestoneSystem", accounts => {

  it("Simple milestone test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.new_milestone('500000000000000000',{value: 50000000000000000, from: accounts[1]});

    milestone_next_index= await milestone_contract.next_milestone_index(); 
    milestones = await milestone_contract.milestones(milestone_next_index.toString());
    milestone_organizer = await milestone_contract.milestones_organizer(milestone_next_index.toString());
    milestone_reward = await milestone_contract.milestones_reward(milestone_next_index.toString());

    assert.equal(parseInt(milestone_next_index),0);
    assert.equal(BigInt(milestones),500000000000000000n);
    assert.equal(milestone_organizer,accounts[1]);
    assert.equal(BigInt(milestone_reward),50000000000000000n);
    assert.equal(BigInt(await web3.eth.getBalance(milestone_contract_address)),50000000000000000n)

    await instance.organizers_donation({value: 450000000000000000, from: accounts[1]});

    milestone_next_index= await milestone_contract.next_milestone_index(); 

    assert.equal(parseInt(milestone_next_index),1);
    assert.equal(BigInt(await web3.eth.getBalance(milestone_contract_address)).toString(),'0');
    assert.equal(BigInt(await web3.eth.getBalance(instance.address)).toString(),'550000000000000000');
  })

  it("Multiple milestone test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.new_milestone('500000000000000000',{value: 50000000000000000, from: accounts[1]});
    await instance.new_milestone('1000000000000000000',{value: 50000000000000000, from: accounts[1]});
    

    await instance.organizers_donation({value: '450000000000000000', from: accounts[1]});

    milestone_next_index= await milestone_contract.next_milestone_index(); 

    assert.equal(parseInt(milestone_next_index).toString(),'1');
    assert.equal(BigInt(await web3.eth.getBalance(milestone_contract_address)).toString(),'50000000000000000');
    assert.equal(BigInt(await web3.eth.getBalance(instance.address)).toString(),'550000000000000000');

    await instance.fair_donation({value: '450000000000000000', from: accounts[1]});

    milestone_next_index= await milestone_contract.next_milestone_index(); 

    assert.equal(parseInt(milestone_next_index),2n);
    assert.equal(BigInt(await web3.eth.getBalance(milestone_contract_address)).toString(),'0');
    assert.equal(BigInt(await web3.eth.getBalance(instance.address)).toString(),'1050000000000000000');

    await instance.new_milestone('1500000000000000000',{value: 50000000000000000, from: accounts[1]});
    await instance.fair_donation({value: '450000000000000000', from: accounts[1]});

    milestone_next_index= await milestone_contract.next_milestone_index(); 

    assert.equal(parseInt(milestone_next_index),3n);
    assert.equal(BigInt(await web3.eth.getBalance(milestone_contract_address)).toString(),'0');
    assert.equal(BigInt(await web3.eth.getBalance(instance.address)).toString(),'1550000000000000000');
  })

  it("Malicious milestone test 1", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.new_milestone('500000000000000000',{value: 50000000000000000, from: accounts[1]});

    try{
        await instance.new_milestone('500000000000000000',{value: 50000000000000000, from: accounts[1]});
    }catch(e)
    {
        return;
    }
    assert.fail("Should be impossible to set 2 identical milestones");

  })

  it("Malicious milestone test 2", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    

    try{
        await instance.new_milestone('500000000000000000',{value: 50000000000000000, from: accounts[5]});
    }catch(e)
    {
        return;
    }
    assert.fail("Should be impossible for a non-organizer to setup a milestone");
  })

  it("Malicious milestone test 3", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    

    try{
        await instance.new_milestone('50000000000000000',{value: 50000000000000000, from: accounts[1]});
    }catch(e)
    {
        return;
    }
    assert.fail("Should be impossible to setup mileston lesser ore equal than current balance");
  })

  it("Milestone with withdraw and refund", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})
    await instance.new_milestone('550000000000000000',{value: 50000000000000000, from: accounts[1]});

    await advanceBlockAtTime((60*60*2)+(60*5)) //await 2 hour and 5 minutes

    //beneficiaries withdraw the funds
    await instance.withdraw({from: accounts[4]})

    //contract close
    await instance.close({from: accounts[1]})

    //refund for the organizer
    balance_before = await web3.eth.getBalance(accounts[1]);

    receipt = await milestone_contract.refund(0,{from:accounts[1]})
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = tx.gasPrice;

    balance_after = await web3.eth.getBalance(accounts[1]);

    real_gain = BigInt(balance_after)-BigInt(balance_before);
    expected_gain = 50000000000000000n-BigInt(gasPrice)*BigInt(receipt.receipt.gasUsed);

    assert.equal(real_gain.toString(),expected_gain.toString(),"The refund must match the original donation");

    await milestone_contract.close();
  })

  it("Milestone with withdraw and malicious refund", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})
    await instance.new_milestone('550000000000000000',{value: 50000000000000000, from: accounts[1]});

    await advanceBlockAtTime((60*60*2)+(60*5)) //await 2 hour and 5 minutes

    //beneficiaries withdraw the funds
    await instance.withdraw({from: accounts[4]})

    //contract close
    await instance.close({from: accounts[1]})

    //refund for the organizer
    try{
        await milestone_contract.refund(0,{form:accounts[2]});
    }catch(e)
    {
        return;
    }
    assert.fail("Only the original submitter can obtain the refund") 
  })

  it("Milestone with withdraw close before contract expiration", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);
    await instance.organizers_donation({value: '50000000000000000', from: accounts[0]});
    await instance.new_milestone('100000000000000001',{value: '50000000000000000', from: accounts[1]});
    await instance.organizers_donation({value: '50000000000000001', from: accounts[1]})

    await advanceBlockAtTime((60*60*2)+(60*4)) //await 2 hour and 4 minutes

    try{
        //beneficiaries withdraw the funds
        await instance.withdraw({from: accounts[4]})
    }catch(e)
    {
        try{
            //organizer try to get the refund
            await milestone_contract.refund(0,{form:accounts[1]});
        }catch(e)
        {
            try{
                //someone try to close the contract
                await milestone_contract.close();
            }catch(e)
            {
                return;
            }
            assert.fail("Close should be impossible now")
        }
        assert.fail("Refund should be impossible now")
    }
    assert.fail("Withdraw should be impossible now")
  })

});