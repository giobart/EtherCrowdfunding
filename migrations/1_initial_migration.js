const Migrations = artifacts.require("Migrations");
const SafeMath = artifacts.require("SafeMath");
const IterableAddressMapping = artifacts.require("IterableAddressMapping");
const AscendingOrderedStack = artifacts.require("AscendingOrderedStack");
const CrowdfundingCampaign = artifacts.require("CrowdfundingCampaign");


const organizers = ["0x21f31D83234ba226D5983920bfA55Ee637F49fDB","0x5b78581Be5D6bE6B46e530ED8df9454da9e57C4e"];
const beneficiaries = ["0xb183b7AD4d85796bE75236530FDad0890c89a711","0x5Ded608621466D150a0BFE31F826B97bFc40cE2E","0x0ce75a7180b27E8A3b0694CD3e0b838Bcd6C3B64"];
const duration = 60*5; //5 minutes

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(SafeMath);
  deployer.deploy(IterableAddressMapping);
  deployer.deploy(AscendingOrderedStack);
  deployer.link(IterableAddressMapping, CrowdfundingCampaign);
  deployer.link(SafeMath,CrowdfundingCampaign)
  deployer.link(AscendingOrderedStack,CrowdfundingCampaign)
  deployer.deploy(CrowdfundingCampaign,organizers,beneficiaries,duration);
};
