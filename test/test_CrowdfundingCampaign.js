const CrowfundingCampaign = artifacts.require("CrowdfundingCampaign");
const IterableAddressMapping = artifacts.require("IterableAddressMapping")

contract("CrowfundingCampaign", accounts => {
  it("Deploy test", async function(){

    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1); //1hour campaign
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

  it("Simple donation test", async function(){
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
    assert.equal(values[0].toString(),'25000000000000000')
    assert.equal(values[1].toString(),'25000000000000000')
    assert.equal(keys[0],accounts[2])
    assert.equal(keys[1],accounts[3])
  })

  it("Complex simple donation test", async function(){
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
        amount_benef_1 = res[1][0].toString()
        difference += expected-BigInt(amount_benef_1)
        assert.equal(difference>=0,true,"Difference must always be positive, in the worst case a bit of change can be left in the balance")
    }
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

    assert.equal(values[0].toString(),"25000000000000000")
    assert.equal(values[1].toString(),"25000000000000000")
    assert.equal(values[2].toString(),"0")

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

});