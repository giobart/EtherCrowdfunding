const CrowfundingCampaign = artifacts.require("CrowdfundingCampaign");
const IterableAddressMapping = artifacts.require("IterableAddressMapping");
const CrowdfundingCampaignMilestoneSystem = artifacts.require("CrowdfundingCampaignMilestoneSystem");

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

contract("Global Test", accounts => {
  it("Intergalactic Panda Rescue Usecase Test", async function(){
    console.log(logo);


    //Full Deploy with 2 organizers and 3 beneficiaries
    console.log("\t[ Test with 2 organizers and 3 beneficiaries ] \n\n")
    const lib_instance = await IterableAddressMapping.new();
    await CrowfundingCampaign.link("IterableAddressMapping", lib_instance.address);
    const instance = await CrowfundingCampaign.new([accounts[0],accounts[1]],[accounts[2],accounts[3],accounts[4]],60*60*1);
    const milestone_contract_address = await instance.milestone_contract();
    const milestone_contract = await CrowdfundingCampaignMilestoneSystem.at(milestone_contract_address);

    //Organizers make the initial donation
    console.log("___________Organizer make the initial donation_____________") 
    receipt = await instance.organizers_donation({value: 50000000000000000, from: accounts[0]});
    balance_before = await web3.eth.getBalance(accounts[1]);
    receipt = await instance.organizers_donation({value: 50000000000000000, from: accounts[1]});
    balance_after = await web3.eth.getBalance(accounts[1]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Organizer set up a flag
    console.log("___________Organizer set up a flag_____________")  
    balance_before = await web3.eth.getBalance(accounts[1]);           
    receipt = await instance.setup_reward('50000000000000000',{value: 20000000000000000, from: accounts[1]});
    console.log("Gas used: \t"+receipt.receipt.gasUsed);
    console.log("\n\n");

    //Organizer set up a milestone
    console.log("___________Organizer set up a milestone_____________")
    balance_before = await web3.eth.getBalance(accounts[0]);                     
    receipt = await instance.new_milestone('1000000000000000000',{value: 50000000000000000, from: accounts[0]});
    balance_after = await web3.eth.getBalance(accounts[0]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Organizer set up another flag, why not? This will not be collected
    console.log("___________Organizer set up another flag, why not? This will not be collected_____________")
    balance_before = await web3.eth.getBalance(accounts[1]);
    receipt = await instance.setup_reward('50000000000000000000',{value: 20000000000000000, from: accounts[1]});
    balance_after = await web3.eth.getBalance(accounts[1]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Organizer set up another milestone, this time way too high :(
    console.log("___________Organizer set up another milestone, this time way too high :(_____________")
    balance_before = await web3.eth.getBalance(accounts[0]);
    receipt = await instance.new_milestone('10000000000000000000',{value: 50000000000000000, from: accounts[0]});
    balance_after = await web3.eth.getBalance(accounts[0]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Finally a donator makes a fair donation and win a flag
    console.log("___________Finally a donator makes a fair donation and win a flag_____________")
    balance_before = await web3.eth.getBalance(accounts[5]);
    receipt = await instance.fair_donation({value: 500000000000000000, from: accounts[5]});
    balance_after = await web3.eth.getBalance(accounts[5]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Uh another donation from another donator, this time is unfair, but unlock the milestone
    console.log("___________Uh another donation from another donator, this time is unfair, but unlock the milestone_____________")
    balance_before = await web3.eth.getBalance(accounts[6]);
    receipt = await instance.unfair_donation(['250000000000000000','250000000000000000','0'],{value: 500000000000000000, from: accounts[6]});
    balance_after = await web3.eth.getBalance(accounts[6]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Time is over guys, time to collect the cash
    console.log("___________Time is over guys, time to collect the cash_____________\n\n")
    receipt = await advanceBlockAtTime((60*60*2)+(60*5)); //await 2 hour and 5 minutes because the milestone unlocked 1 extra hour

    //Beneficiary1 collect the cash
    console.log("___________Beneficiary1 collect the cash_____________")
    balance_before = await web3.eth.getBalance(accounts[2]);
    receipt = await instance.withdraw({from: accounts[2]});
    balance_after = await web3.eth.getBalance(accounts[2]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Beneficiary2 collect the cash
    console.log("___________Beneficiary2 collect the cash_____________") 
    balance_before = await web3.eth.getBalance(accounts[3]);
    receipt = await instance.withdraw({from: accounts[3]});
    balance_after = await web3.eth.getBalance(accounts[3]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Beneficiary3 collect the cash
    console.log("___________Beneficiary3 collect the cash_____________")
    balance_before = await web3.eth.getBalance(accounts[4]);
    receipt = await instance.withdraw({from: accounts[4]});
    balance_after = await web3.eth.getBalance(accounts[4]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //Milestone not collected unfortunately, the organizer get back the cash.
    console.log("___________Milestone not collected unfortunately, the organizer get back the cash_____________")
    balance_before = await web3.eth.getBalance(accounts[0]);
    receipt = await milestone_contract.refund(1,{from:accounts[0]});
    balance_after = await web3.eth.getBalance(accounts[0]);
    console.log("Gas used:       \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before: \t\t"+balance_before);
    console.log("Balance after:  \t\t"+balance_after);
    console.log("\n\n");

    //The organizer closes both the contracts
    console.log("___________The organizer closes both the contracts_____________")
    balance_before = await web3.eth.getBalance(accounts[1]);
    receipt = await instance.close({from: accounts[1]});
    balance_after = await web3.eth.getBalance(accounts[1]);
    console.log("Close main contract gas used:      \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before:                    \t\t"+balance_before);
    console.log("Balance after:                     \t\t"+balance_after);
    balance_before = await web3.eth.getBalance(accounts[1]);
    receipt = await milestone_contract.close({from: accounts[1]});
    balance_after = await web3.eth.getBalance(accounts[1]);
    console.log("Close milestone contract gas used: \t\t"+receipt.receipt.gasUsed);
    console.log("Balance before:                    \t\t"+balance_before);
    console.log("Balance after:                     \t\t"+balance_after); 
    console.log("\n\n");
  })
});

logo =  " ___                                        \n"+
        "  |  ._ _|_  _  ._ _   _. |  _.  _ _|_ o  _\n"+
        " _|_ | | |_ (/_ | (_| (_| | (_| (_  |_ | (_\n"+
        "                   _|                      \n"+
        "\n"+
        " _                \n"+
        "|_) _. ._   _|  _.\n"+
        "|  (_| | | (_| (_|\n"+
        "\n"+
        " _                    \n"+
        "|_)  _   _  _      _ \n"+
        "| \ (/_ _> (_ |_| (/_\n"+
        "\n";