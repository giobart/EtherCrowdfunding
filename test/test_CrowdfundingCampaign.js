const CrowfundingCampaign = artifacts.require("CrowdfundingCampaign");
const IterableAddressMapping = artifacts.require("IterableAddressMapping")

contract("CrowfundingCampaign", accounts => {
  it("deploy test", async function(){

    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1); //1hour campaign
  })

  it("organizers donations test", async function(){

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

  it("not authorized organizer try to donate and start the campaign", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1); 

    try{
        await instance.organizers_donation({value: 50000000000000000, from: accounts[2]})
    }catch(e){
        return;
    }
    assert.fail("Fake organizer was able to donate")

  })

  it("organizer donate less than MINIMUM_DONATION", async function(){
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3]],60*60*1); 

    try{
        await instance.organizers_donation({value: 4000000000000000, from: accounts[1]})
    }catch(e){
        return;
    }
    assert.fail("Fake organizer was able to donate")

  })

});