// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.10 <0.7.0;

import {IterableAddressMapping} from './libraries/IterableAddressMapping.sol';
import {SafeMath} from './libraries/SafeMath.sol';

/**
@title CrowdfundingCampaign
@author Giovanni Bartolomeo
@notice This contract can be used for a Crowdfunding campaign, the Organizers start the campaign
and the collected money will be withdrawn from the beneficiaries. Each donator can donate to the contract
to support the beneficiaries directly and transparently.
This contract evolve 3 states: 
STARTED - Contract deployed and waiting for organizers donations
ENDED - Campaign expired, the beneficiaries can withdraw the money
DONATION - Initial organizers' donations collected, contract ready to receive external donations
*/
contract CrowdfundingCampaign {
    using IterableAddressMapping for IterableAddressMapping.itmap;

    ///Campaign state
    enum State {STARTED, ENDED, DONATION}

    ///events
    event started(); //contract started
    event ended(); //contract ended
    event donation(); //contract ready to receive donations
    event donated(address _from, uint _amount, string _type); //donation alert
    event withdrawn(address _from, uint _amount); //money withdrawn from the beneficiary

    ///constants
    uint public constant MINIMUM_CAMPAIGN_DURATION  = 60 * 60 * 1; //1 hour
    uint public constant MINIMUM_DONATION           = 50000000000000000; // 0.05 ether
    uint public constant WITHDRAW_AWAITING_TIME     = 60*5; //5 minutes
    uint public constant TIME_REWARD_MILESTONE      = 60* 60 * 1; //1 hour
    uint public constant MAX_BENEFICIARIES          = 100;
    uint public constant MAX_ORGANIZERS             = 100;

    ///actors addresses data structures
    IterableAddressMapping.itmap public organizers;
    IterableAddressMapping.itmap public beneficiaries;
    mapping(address => Donation[]) public donators;
    struct Donation {address payable destination; uint amount;}

    ///campaign related vars
    uint public campaignCloses;
    State public state;
    uint public organizers_unique_donations;
    uint public beneficiaries_withdraw;
    address public milestone_contract;
    uint public next_milestone;

    modifier is_authorized(IterableAddressMapping.itmap storage authorized_list ) 
    {
        require(IterableAddressMapping.contains(authorized_list,msg.sender));
        _;
    }

    /// @notice Constructor. Stores the addresses of organizers and beneficiaries
    /// @param _organizers The organizers of the Crowdfunding, who open the campaign
    /// @param _beneficiaries The receivers of the funds collected during the campaign
    /// @param duration The address of the penalty function contract
    constructor (
        address payable [] memory _organizers, 
        address payable [] memory _beneficiaries,
        uint duration
    ) public 
    {
        require(_organizers.length >= 1);
        require(_organizers.length <= MAX_ORGANIZERS);
        require(_beneficiaries.length >= 1);
        require(_beneficiaries.length <= MAX_BENEFICIARIES);
        require(duration >= MINIMUM_CAMPAIGN_DURATION);

        IterableAddressMapping.from_array(organizers,_organizers,0);
        IterableAddressMapping.from_array(beneficiaries,_beneficiaries,0);

        campaignCloses = now + duration;
        organizers_unique_donations = 0;
        milestone_contract = address(new CrowdfundingCampaignMilestoneSystem(address(this)));

        state = State.STARTED;
        emit started();
    }

    /// @notice this function can be used to donate ethers to the beneficiaries giving to anyone the same amount
    function fair_donation() public payable
    {
        require(state == State.DONATION);
        require(msg.value >= MINIMUM_DONATION);
        require(campaignCloses > now);
        split_amount_beneficiaries(msg.sender,msg.value);

        withdraw_milestone();

        emit donated(msg.sender,msg.value,"FAIR");
    }

    /// @notice this function can be used to donate ethers to the beneficiaries specifying the amount for each one
    /// @param _amount  is the array containing the amount for each donation. 
    ///                 the amount in position 0 will be donated to the beneficiary in position 0 in the beneficiaries list. 
    ///                 The size of this array must be equal to the size of the beneficiaries.
    ///                 The sum of all amount must be equal to the amount payed to this transaction.
    function unfair_donation(uint [] memory _amount) public payable
    {
        require(state == State.DONATION);
        require(msg.value >= MINIMUM_DONATION);
        require(_amount.length == beneficiaries.size);
        require(sum_members(_amount) == msg.value);
        require(campaignCloses > now);

        //add donated amount in the balance of each beneficiaries
        for (uint i = IterableAddressMapping.iterate_start(beneficiaries); IterableAddressMapping.iterate_valid(beneficiaries, i); i = IterableAddressMapping.iterate_next(beneficiaries, i))
        {
            (address payable key,uint value) = IterableAddressMapping.iterate_get(beneficiaries, i);
            beneficiaries.data[key].value = SafeMath.add(value,_amount[i]);
            //logging the donation
            donators[msg.sender].push(Donation(key,_amount[i]));
        }

        withdraw_milestone();

        emit donated(msg.sender,msg.value,"UNFAIR");
    }

    /// @notice Initial donation from all the organizers, when all the organizers donated, the contract state is updated to DONATION
    function organizers_donation() public is_authorized(organizers) payable 
    {

        require(msg.value >= MINIMUM_DONATION, "Invalid minimum donation amount");
        require(state == State.STARTED);
        require(campaignCloses > now);

        IterableAddressMapping.IndexValue memory organizer = organizers.data[msg.sender];
        uint donated_till_now = organizer.value;

        if(donated_till_now == 0)
        {
            /// if it's the first time he's donating increase the counter
            organizers_unique_donations++;

            /// if every organizer donated then change the contract's state
            if( organizers_unique_donations == organizers.size )
            {
                state = State.DONATION;
                emit donation();
            }
        }

        split_amount_beneficiaries(msg.sender,msg.value);
        organizer.value = SafeMath.add(msg.value,organizer.value);
        organizers.data[msg.sender] = organizer;

        withdraw_milestone();

        emit donated(msg.sender,msg.value,"INITIAL");
    }

    /// @notice it the campaign timer is over from more than 5 minutes, set the camapign state to to ENDED and allow the beneficiary to obtain his part of reward
    function withdraw() public is_authorized(beneficiaries)
    {
        require(campaignCloses+WITHDRAW_AWAITING_TIME<=now);
        require(beneficiaries_withdraw<beneficiaries.size);

        //if this is the first beneficiary, update the campaign state 
        if(state==State.DONATION)
        {
            state=State.ENDED;
            CrowdfundingCampaignMilestoneSystem(milestone_contract).campaign_ended();
        }

        //get beneficiary account from the list
        IterableAddressMapping.IndexValue memory beneficiary = beneficiaries.data[msg.sender];
        address payable addr = payable(beneficiaries.keys[beneficiary.keyIndex].key);
        assert(addr==msg.sender);
        assert(beneficiary.value>0);

        //update beneficiary account and benecifiary counter
        beneficiaries.data[msg.sender].value=0;
        beneficiaries_withdraw++;

        //pay the beneficiary
        emit withdrawn(msg.sender,beneficiary.value);
        addr.transfer(beneficiary.value);
    }

    /// @notice Set a new milestone to the milestone contract. 
    /// the amount given in input to this method is forwarded to the milestone contract and used as a reward.
    function new_milestone(uint _milestone_position) public is_authorized(organizers) payable 
    {
        require(msg.value>=MINIMUM_DONATION);
        require(campaignCloses>now);
        require(_milestone_position>address(this).balance);

        //call set milestone method from the milestone cotnract and forward the amount
        next_milestone = CrowdfundingCampaignMilestoneSystem(milestone_contract).set_milestone{value: msg.value}(_milestone_position,msg.sender);
    }

    /// @dev check if the milestone is reached and ask to the external contract
    function withdraw_milestone() private 
    {
        while(address(this).balance>=next_milestone && next_milestone>0)
        {
            next_milestone = CrowdfundingCampaignMilestoneSystem(milestone_contract).withdraw();
            //did we reached another milestone with this single donation + milestone reward? repeat
        }
    }

    /// @notice used by the milestone contract to pay the reward. after the reward is received the expire date of the contract is updated
    function milestone_reward() public payable
    {
        require(msg.sender==milestone_contract);
        split_amount_beneficiaries(msg.sender,msg.value);
        campaignCloses=campaignCloses+TIME_REWARD_MILESTONE;

        emit donated(msg.sender,msg.value, "MILESTONE");
    }

    /// @notice destroy the contract and give the remaining change (due to decimal divisions errors) to the organizer that invoked the method as a reward.
    ///         is possible to call this method only after all the beneficiaries withdrawn their funds
    function close() public is_authorized(organizers)
    {
        require(state==State.ENDED);
        require(beneficiaries_withdraw==beneficiaries.size);
        selfdestruct(msg.sender);
    }


    ///@notice split an amount of eth among all the beneficiaries
    function split_amount_beneficiaries(address payable from, uint amount) private
    {
        //split the donation amount
        uint donation_amount = SafeMath.div(amount,beneficiaries.size);

        //add donated amount in the balance of each beneficiaries
        for (uint i = IterableAddressMapping.iterate_start(beneficiaries); IterableAddressMapping.iterate_valid(beneficiaries, i); i = IterableAddressMapping.iterate_next(beneficiaries, i))
        {
            (address payable key, uint value) = IterableAddressMapping.iterate_get(beneficiaries, i);
            beneficiaries.data[key].value = SafeMath.add(value,donation_amount);
            //logging the donation
            logger(from,key,donation_amount);
        }
    }

    ///@notice logger of the donations for the contract 
    function logger(address payable from,address payable to,uint value) private
    {
        donators[from].push(Donation(to,value));
    }

    ///@notice sum all the members of an uint array
    function sum_members(uint [] memory _amount) private pure returns (uint result)
    {
        for ( uint i = 0; i<_amount.length; i++)
        {
            result+=_amount[i];
        }
    } 

    /// @notice exposes the status of the beneficiaries
    /// @dev used also for testing purposes
    function donation_status() public view returns (address payable [] memory addresses, uint [] memory amounts)
    {
        addresses = IterableAddressMapping.key_array(beneficiaries);
        amounts = IterableAddressMapping.val_array(beneficiaries);
    }

    /// @notice exposes the list of the beneficiaries
    /// @dev used also for testing purposes
    function beneficiaries_list() public view returns (address payable [] memory addresses)
    {
        addresses = IterableAddressMapping.key_array(beneficiaries);
    }

    /// @notice exposes the list of the organizers
    /// @dev used also for testing purposes
    function organizers_list() public view returns (address payable [] memory addresses, uint [] memory amounts)
    {
        addresses = IterableAddressMapping.key_array(organizers);
        amounts = IterableAddressMapping.val_array(organizers);
    }

    /// @notice used from a donator that wants to get the log of the donated amount
    /// @dev used also for testing purposes
    function get_my_donations() public view returns (address payable [] memory, uint [] memory)
    {
        Donation[] memory donation_list = donators[msg.sender];
        address payable [] memory addresses = new  address payable [](donation_list.length);
        uint [] memory amounts = new uint [](donation_list.length);

        for (uint i = 0; i<donation_list.length; i++)
        {
            addresses[i]=donation_list[i].destination;
            amounts[i]=donation_list[i].amount;
        }

        return (addresses,amounts);
    }

    function is_ended() public view returns (bool)
    {
        return state==State.ENDED;
    }

}

/**
@title CrowdfundingCampaignMilestoneSystem
@author Giovanni Bartolomeo
@notice This contract can be used for the milestone system of a CrowdFundingCampaign. 
Once initialized this contract await for the calls of the Crowdfundingcampaign contract in order to send the reward for the milestones
*/
contract CrowdfundingCampaignMilestoneSystem {
    
    address public campaign_contract;
    uint public last_milestone;
    uint public next_milestone_index;
    uint [] public milestones;
    uint [] public milestones_reward;
    address payable [] public milestones_organizer;
    State state;

    ///events
    event milestone_event(uint _amount, uint _payed);
    event refund_event(address _organizer, uint _refund);

    ///state
    enum State {CAMPAIGN_ACTIVE, ENDED}

    constructor (
        address _campaign_contract
    ) public 
    {
        campaign_contract=_campaign_contract;
        last_milestone=0;
        next_milestone_index=0;
        state=State.CAMPAIGN_ACTIVE;
    }

    /// @notice allow the campaign contract to setup a new milestone, the new milestone must be setted up at a bigger amount than the last one setted
    function set_milestone(uint milestone_position, address payable organizer) public payable returns(uint _next_milestone_position)
    {
        require(milestone_position>0);
        require(last_milestone<milestone_position);
        require(msg.value>0);
        require(msg.sender==campaign_contract);
        
        milestones.push(milestone_position);
        milestones_reward.push(msg.value);
        milestones_organizer.push(organizer);
        last_milestone=milestone_position;

        return milestones[next_milestone_index];
    }

    ///@notice allow the campaign contract to withdraw an amount of money in case a milestone is reached
    function withdraw() public returns (uint _next_milestone_position)
    {
        require(msg.sender==campaign_contract);
        require(next_milestone_index<milestones.length);
        uint contract_balance = address(campaign_contract).balance;
        require(contract_balance>=milestones[next_milestone_index]);
        uint reward = milestones_reward[next_milestone_index];
        require(reward>0);

        emit milestone_event(milestones[next_milestone_index],reward);
        next_milestone_index=next_milestone_index+1;

        CrowdfundingCampaign(campaign_contract).milestone_reward{value:reward}();

        if(next_milestone_index>=milestones.length)
        {
            return 0;
        }else
        {
            return milestones[next_milestone_index];
        }
    }

    ///@notice used by the main contract to inform the milestone contract that the campaign is expired 
    function campaign_ended() public
    {
        require(msg.sender==campaign_contract);
        state=State.ENDED;
    }

    ///@notice after the campaign is ended, this method allows the organizer to get a refund of the unreached milestones 
    function refund(uint index) public
    {
        require(index>=next_milestone_index);
        require(index<milestones.length);
        require(msg.sender==milestones_organizer[index]);
        require(milestones_reward[index]>0); //otw the refund was already emitted
        require(state==State.ENDED);
        
        uint refund_amount = milestones_reward[index];
        milestones_reward[index]=0;
        emit refund_event(msg.sender,refund_amount);
        milestones_organizer[index].transfer(refund_amount);
    }

    /// @notice destroy the contract 
    function close() public
    {
        require(state==State.ENDED);
        require(address(this).balance==0);
        selfdestruct(msg.sender);
    }

}