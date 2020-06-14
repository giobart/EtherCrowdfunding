// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.7.0;

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

    ///constants
    uint public constant MINIMUM_CAMPAIGN_DURATION  = 60 * 60 * 1; //1 hours
    uint public constant MINIMUM_DONATION           = 50000000000000000; // 0.05 ether
    //TODO add max beneficiaries
    //TODO add max organizers

    ///actors addresses
    IterableAddressMapping.itmap public organizers;
    IterableAddressMapping.itmap public beneficiaries;
    IterableAddressMapping.itmap public donators;

    ///campaign related vars
    uint public campaignCloses;
    State public state;
    uint public organizers_unique_donations;

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
        require(_beneficiaries.length >= 1);
        require(duration >= MINIMUM_CAMPAIGN_DURATION);

        IterableAddressMapping.from_array(organizers,_organizers,0);
        IterableAddressMapping.from_array(beneficiaries,_beneficiaries,0);

        campaignCloses = now + duration;
        organizers_unique_donations = 0;

        state = State.STARTED;
    }

    /// @notice this function can be used to donate ethers to the beneficiaries giving to anyone the same amount
    function fair_donation() public payable
    {
        require(state == State.DONATION);
        require(msg.value >= MINIMUM_DONATION);

        //split the donation amount
        uint donation_amount = SafeMath.div(msg.value,beneficiaries.size);

        //add donated amount in the balance of each beneficiaries
        for (uint i = IterableAddressMapping.iterate_start(beneficiaries); IterableAddressMapping.iterate_valid(beneficiaries, i); i = IterableAddressMapping.iterate_next(beneficiaries, i))
        {
            (address payable key, uint value) = IterableAddressMapping.iterate_get(beneficiaries, i);
            beneficiaries.data[key].value = SafeMath.add(value,donation_amount);
        }

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

        //add donated amount in the balance of each beneficiaries
        for (uint i = IterableAddressMapping.iterate_start(beneficiaries); IterableAddressMapping.iterate_valid(beneficiaries, i); i = IterableAddressMapping.iterate_next(beneficiaries, i))
        {
            (address payable key,uint value) = IterableAddressMapping.iterate_get(beneficiaries, i);
            beneficiaries.data[key].value = SafeMath.add(value,_amount[i]);
        }
    }

    /// @notice exposes the status of the beneficiaries
    function donation_status() public view returns (address payable [] memory addresses, uint [] memory amounts)
    {
        addresses = IterableAddressMapping.key_array(beneficiaries);
        amounts = IterableAddressMapping.val_array(beneficiaries);
    }

    /// @notice exposes the list of the beneficiaries
    function beneficiaries_list() public view returns (address payable [] memory addresses)
    {
        addresses = IterableAddressMapping.key_array(beneficiaries);
    }

    /// @notice Initial donation from all the organizers, when all the organizers donated, the contract state is updated to DONATION
    function organizers_donation() public is_authorized(organizers) payable 
    {

        require(msg.value >= MINIMUM_DONATION, "Invalid minimum donation amount");
        require(state == State.STARTED);

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
            }

        }

        organizer.value = SafeMath.add(msg.value,organizer.value);
        organizers.data[msg.sender] = organizer;

    }

    function sum_members(uint [] memory _amount) private returns (uint result)
    {
        for ( uint i = 0; i<_amount.length; i++)
        {
            result+=_amount[i];
        }
    } 

}