// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.7.0;

import {IterableAddressMapping} from './libraries/IterableMapping.sol';
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

    ///Campaign state
    enum State {STARTED, ENDED, DONATION}

    ///constants
    uint public constant MINIMUM_CAMPAIGN_DURATION  = 60 * 60 * 1; //1 hours
    uint public constant MINIMUM_DONATION           = 50000000000000000; // 0.05 ether

    ///actors addresses
    IterableAddressMapping.itmap private organizers;
    IterableAddressMapping.itmap private beneficiaries;
    IterableAddressMapping.itmap private donators;

    ///campaign related vars
    uint public campaignCloses;
    State public state;
    uint public organizers_unique_donations;

    modifier is_authorized(IterableAddressMapping.itmap authorized_list ) 
    {
        require(IterableAddressMapping.contains(authorized_list,msg.sender));
        _;
    }

    /// @notice Constructor. Stores the addresses of organizers and beneficiaries
    /// @param _organizers The organizers of the Crowdfunding, who open the campaign
    /// @param _beneficiaries The receivers of the funds collected during the campaign
    /// @param duration The address of the penalty function contract
    constructor (
        address payable [] _organizers, 
        address payable [] _beneficiaries,
        uint duration
    ) public 
    {
        require(_organizers.length >= 1)
        require(_beneficiaries.length >= 1)
        require(duration >= MINIMUM_CAMPAIGN_DURATION)

        IterableAddressMapping.from_array(organizers,_organizers,0)
        IterableAddressMapping.from_array(beneficiaries,_beneficiaries,0)

        campaignCloses = now + duration;
        organizers_unique_donations = 0;

        state = State.STARTED
    }

    /// @notice Initial donation from all the organizers, when all the organizers donated, the contract state is updated to DONATION
    function organizers_donation() public is_authorized(organizers) payable 
    {

        require(msg.value >= MINIMUM_DONATION, "Invalid minimum donation amount");
        require(state == State.STARTED);

        IterableAddressMapping.IndexValue organizer = organizers.data[msg.sender]
        uint donated_till_now = organizer.value

        if(donated_till_now == 0)
        {
            /// if it's the first time he's donating increase the counter
            organizers_unique_donations++;

            /// if every organizer donated then change the contract's state
            if( organizers_unique_donations == organizers.keys.length )
            {
                state = State.DONATION
            }

        }

        organizer.value = SafeMath.add(msg.value,organizer.value);
        organizers.data[msg.sender] = organizer

    }

}