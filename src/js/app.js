App = {
    // Attributes
    contracts: {}, // Store contract abstractions
    web3Provider: null, // Web3 provider
    url: 'http://localhost:8545', // Url for web3
    account: '0x0', // current ehtereum account
     
    init: function() { return App.initWeb3(); },


    // Functions
    initWeb3: function() { 
        /* initialize Web3 */
        // Check whether exists a provider, e.g Metamask
        if(typeof web3 != 'undefined') { 
            App.web3Provider = window.ethereum; 
            web3 = new Web3(App.web3Provider);
            // Permission popup
            try { 
                ethereum.enable().then(async() => { console.log("DApp connected"); }).catch(async()=> { $('#connectionErrorModal').modal(); });
            }
            catch(error) { $('#connectionErrorModal').modal() }
        } else { 
            $('#connectionErrorModal').modal()
        } 
    }, 
    
    initContract: function() { 

        // Store ETH current account
        web3.eth.getCoinbase(function(err, account) { 
            if(err == null) {
                App.account = account; console.log(account); $("#accountId").html("Account:" + account);
            } 
        });

        // Init contracts
        $.getJSON("CrowdfundingCampaign.json").done(function(c) { 
            App.contracts["CrowdfundingCampaign"] = TruffleContract(c); //update
            App.contracts["CrowdfundingCampaign"].setProvider(App.web3Provider); //update
            return App.listenForEvents(); 
        });

    }, 
    
    listenForEvents: function() { 
        App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
            // click is the Solidity event
            instance.click().on('data', function (event) { 
                $("#eventId").html("Event catched!"); 
                console.log("Event catched"); 
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            }); 
        });
        return App.render(); 
    },

   render: function() { 
        // Retrieve contract instance
        App.contracts["CrowdfundingCampaign"].deployed().then(async(instance) =>{
            // Call the value function (value is a public attribute)
            const v = await instance.value(); 
            console.log(v); 
            $("#valueId").html("" + v);
        });
    }
}

    // Call init whenever the window loads
    $(function() {
        $(window).on('load', function () {
            App.init(); 
        });
    });