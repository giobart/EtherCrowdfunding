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

contract("CrowfundingCampaign", accounts => {
  it("Deploy test", async function(){

    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1); //1hour campaign
  })

  it("Deploy with duplicatetest", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    try{
      const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[2]],60*60*1); //1hour campaign
    }
    catch(e){
      return
    }
    assert.fail("No duplicates allowed")
  })

  it("Deploy invalid MINIMUM_CAMPAIGN_DURATION test", async function(){

    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    try{
        const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*59*1); //59 min 
    }catch(e)
    {
        return;
    }
    assert.fail("Started campaign of with duration under MINIMUM_CAMPAIGN_DURATION")
  })

  it("Deploy invalid organizer list test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    try{
        const instance = await CrowfundingCampaign.new([],[accounts[2],accounts[3]],60*60*1); //59 min 
    }catch(e)
    {
        return;
    }
    assert.fail("Started campaign of with 0 organizers")
  })

  it("Deploy invalid beneficiaries list test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    try{
        const instance = await CrowfundingCampaign.new([accounts[1]],[],60*60*1); //59 min 
    }catch(e)
    {
        return;
    }
    assert.fail("Started campaign of with 0 beneficiaries")
  })

  it("Organizers donations test", async function(){

    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1); 

    unique_donations = await instance.organizers_unique_donations()
    assert.equal(unique_donations.toNumber(),0,"We should have 0 donators")
    state = await instance.state()
    assert.equal(state,0,"Contract in STARTED state")

    // account[0] donate
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    unique_donations = await instance.organizers_unique_donations()
    assert.equal(unique_donations.toNumber(),1,"We should have only one unique donator")
    res = await instance.donation_status()
    amount_benef = res[1]
    assert.equal(amount_benef[0].toString(),'25000000000000000',"Each beneficiary should have 0,025 Eth")
    assert.equal(amount_benef[1].toString(),'25000000000000000',"Each beneficiary should have 0,025 Eth")


    //account[0] donate again
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    unique_donations = await instance.organizers_unique_donations()
    assert.equal(unique_donations.toNumber(),1,"We should have only one unique donators")
    state = await instance.state()
    assert.equal(state,0,"Contract still in STARTED state")

    //account[1] donate 
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})
    unique_donations = await instance.organizers_unique_donations()
    assert.equal(unique_donations.toNumber(),2,"We should have 2 unique donators")
    state = await instance.state()
    assert.equal(state,2,"Contract in DONATION state")

    //test contract balance
    let balance = await web3.eth.getBalance(instance.address);
    assert.equal(balance,150000000000000000,"Balance should be 0,15 ETH")

  })

  it("Not authorized organizer try to donate and start the campaign", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1); 

    try{
        await instance.organizers_donation({value: 50000000000000000, from: accounts[2]})
    }catch(e)
    {
        return;
    }
    assert.fail("Fake organizer was able to donate")

  })

  it("Organizer donate less than MINIMUM_DONATION", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1); 

    try{
        await instance.organizers_donation({value: 4000000000000000, from: accounts[1]})
    }catch(e)
    {
        try{
            await instance.unfair_donation(['20000000000000000','20000000000000000'],{value: 20000000000000000, from: accounts[5]})
        }catch(e)
        {
            return
        }
    }
    assert.fail("Fake organizer was able to donate")
  })

  it("Donator try do donate before the campaign actually starts", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1);

    try{
        await instance.fair_donation({value: 50000000000000000, from: accounts[5]})
    }catch(e)
    {
        try{
            await instance.unfair_donation(['25000000000000000','25000000000000000'],{value: 50000000000000000, from: accounts[5]})
        }catch(e)
        {
            return
        }
    }
    assert.fail("donator donated before campaign starts")
  })

  it("Simple fair donation test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await instance.fair_donation({value: 50000000000000000, from: accounts[5]})

    res = await instance.donation_status()
    keys = res[0]
    values = res[1]

    assert.equal(keys.length,2)
    assert.equal(values.length,2)
    assert.equal(values[0].toString(),'75000000000000000',"Initial donation + donator's donation should be 0,075 eth")
    assert.equal(values[1].toString(),'75000000000000000',"Initial donation + donator's donation should be 0,075 eth")
    assert.equal(keys[0],accounts[2])
    assert.equal(keys[1],accounts[3])
  })

  it("Complex fair donation test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4],accounts[5],accounts[6]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    accumulator = 0n
    difference = 0n
    for ( var i=0; i<42; i++ ){
        accumulator = BigInt(accumulator)+(50000000000000000n+BigInt(i))
        await instance.fair_donation({value: (50000000000000000n+BigInt(i)).toString(), from: accounts[7]})
        expected = accumulator/BigInt(5)
        res = await instance.donation_status()
        amount_benef_1 = BigInt(res[1][0])-BigInt(20000000000000000n)
        difference += expected-BigInt(amount_benef_1)
        //test that there is a bit of  change in the transaction due to division error
        assert.equal(difference>=0,true,"Difference must always be positive, in the worst case a bit of change can be left in the balance")
    }

    donations = await instance.get_my_donations({from: accounts[7]});
    addr = donations[0]
    amount = donations[1]

    difference_now = 0n
    for ( var i=0; i<42; i++ ){
        donated = (50000000000000000n+BigInt(i))
        expected = donated/BigInt(5)
        for ( var j = (i*5); j<(i*5)+5; j++){
            amount_benef_1 = amount[j]
            //test that the amount donated and logged corresponds
            assert.equal(amount_benef_1.toString(),expected.toString(),"The amount donated in the log should be equal to the one donated for real to all the beneficiaries")
        }
    }
    assert.equal(amount.length,(42*5),"There should be exactly 42*5 donations")

  })

  it("Unfair donation test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await instance.unfair_donation(['25000000000000000','25000000000000000','0'],{value: 50000000000000000, from: accounts[5]})

    res = await instance.donation_status()
    
    keys = res[0]
    values = res[1]

    assert.equal(values[0].toString(),"58333333333333332","InitialDonations + unfair donation of 0,025 eth should be 58333333333333332 ")
    assert.equal(values[1].toString(),"58333333333333332","InitialDonations + unfair donation of 0,025 eth should be 58333333333333332 ")
    assert.equal(values[2].toString(),"33333333333333332","InitialDonations + unfair donation of 0 eth should be 33333333333333332 ")

    assert.equal(keys[0],accounts[2])
    assert.equal(keys[1],accounts[3])
    assert.equal(keys[2],accounts[4])
  })

  it("Unfair and malicious donation test 1", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    try{
        await instance.unfair_donation(['25000000000000000','50000000000000000','0'],{value: 50000000000000000, from: accounts[5]})
    }catch(e){
        return
    }
    assert.fail("This oepration should be forbidden, total donated amount should be equal to the amount given in the amount array")
  })

  it("Unfair and malicious donation test 2", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    try{
        await instance.unfair_donation(['25000000000000000','50000000000000000'],{value: 50000000000000000, from: accounts[5]})
    }catch(e){
        return
    }
    assert.fail("The size of the amount array should be equal to the number of beneficiaries")
  })

  it("Donation after campaign expired reject test ", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await instance.unfair_donation(['25000000000000000','25000000000000000','0'],{value: 50000000000000000, from: accounts[5]})

    await advanceBlockAtTime(60*60*1) //await 1 hour

    try{
        await instance.unfair_donation(['25000000000000000','25000000000000000','0'],{value: 50000000000000000, from: accounts[5]})
    }catch(e){
        return
    }
    assert.fail("The donation must be performed before the timer expires")
  })

  it("Withdraw test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await instance.unfair_donation(['25000000000000000','25000000000000000','0'],{value: 50000000000000000, from: accounts[5]})

    await advanceBlockAtTime(60*65*1) //await 1 hour and 5 minutes

    //check initial balance
    initialBalance = await web3.eth.getBalance(accounts[4]);
    
    //withdraw
    receipt = await instance.withdraw({from: accounts[4]})

    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = tx.gasPrice;

    actualBalance = await web3.eth.getBalance(accounts[4]);
    
    //check final balance
    assert.equal(actualBalance.toString(),(BigInt(initialBalance)-BigInt(gasPrice)*BigInt(receipt.receipt.gasUsed)+BigInt(33333333333333332)).toString(),"Final balance must be equal to: InitBalance-txCost+withdrawn amount")
  })

  it("Multiple withdraw test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await instance.unfair_donation(['25000000000000000','25000000000000000','0'],{value: 50000000000000000, from: accounts[5]})

    await advanceBlockAtTime(60*65*1) //await 1 hour and 5 minutes
    
    //withdraw
    await instance.withdraw({from: accounts[4]})

    try{
        await instance.withdraw({from: accounts[4]})
    }catch(e)
    {
        return
    }
    assert.fail("Should be impossible to withdraw several times")
  })

  it("Wrong account withdraw test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await instance.unfair_donation(['25000000000000000','25000000000000000','0'],{value: 50000000000000000, from: accounts[5]})

    await advanceBlockAtTime(60*65*1) //await 1 hour and 5 minutes
    
    //withdraw
    try{
        await instance.withdraw({from: accounts[0]})
    }catch(e)
    {
        return
    }
    assert.fail("This account can't withdraw the funds")
  })

  it("Withdraw before the campaign expires", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await instance.unfair_donation(['25000000000000000','25000000000000000','0'],{value: 50000000000000000, from: accounts[5]})

    await advanceBlockAtTime(60*64*1) //await 1 hour and 4 minutes
    
    //withdraw
    try{
        await instance.withdraw({from: accounts[4]})
    }catch(e)
    {
        return
    }
    assert.fail("Should be impossible to withdraw several times")
  })

  it("Close test", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await advanceBlockAtTime(60*65*1) //await 1 hour and 5 minutes

    //beneficiaries withdraw the funds
    await instance.withdraw({from: accounts[2]})
    await instance.withdraw({from: accounts[3]})
    await instance.withdraw({from: accounts[4]})

    //contract close
    await instance.close({from: accounts[1]})
  })

  it("Close test from wrong organizer", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await advanceBlockAtTime(60*65*1) //await 1 hour and 5 minutes

    //beneficiaries withdraw the funds
    await instance.withdraw({from: accounts[2]})
    await instance.withdraw({from: accounts[3]})
    await instance.withdraw({from: accounts[4]})

    //contract close
    try{
        await instance.close({from: accounts[3]})
    }catch(e)
    {
        return
    }
    assert.fail("Contract close can only be invoked from the organizers") 
  })

  it("Close test before all beneficiaries withdrawn", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    await instance.organizers_donation({value: 50000000000000000, from: accounts[0]})
    await instance.organizers_donation({value: 50000000000000000, from: accounts[1]})

    await advanceBlockAtTime(60*65*1) //await 1 hour and 5 minutes

    //beneficiaries withdraw the funds
    await instance.withdraw({from: accounts[2]})
    await instance.withdraw({from: accounts[3]})

    //contract close
    try{
        await instance.close({from: accounts[0]})
    }catch(e)
    {
        return
    }
    assert.fail("Contract close should be possible only after all beneficiaries invocked withdraw")    
  })

});