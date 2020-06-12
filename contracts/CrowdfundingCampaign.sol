// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.5.16 <0.7.0;

import {IterableAddressMapping} from './libraries/IterableMapping.sol';

/**
 @notice This contract can be used for a Crowdfunding campaign, the Organizers start the campaign
 and the collected money will be withdrawn from the beneficiaries. Each donator can donate to the contract
 to support the beneficiaries directly and transparently.
*/
contract CrowdfundingCampaign {

    // Campaign state
    // STARTED - Contract deployed
    // ENDED - Campaign expired
    // DONATION - Initial organizers' donations collected, contract ready to receive external donations
    enum State {STARTED, ENDED, DONATION}

    //constants
    uint public constant MINIMUM_CAMPAIGN_DURATION = 60 * 60 * 1; //1 hours

    //actors addresses
    IterableAddressMapping.itmap private organizers;
    IterableAddressMapping.itmap private beneficiaries;
    IterableAddressMapping.itmap private donators;

    //campaign related vars
    uint public campaignCloses;
    State public state;

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

        state = State.STARTED
    }

}