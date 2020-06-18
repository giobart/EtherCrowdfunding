App = {
    // Attributes
    contracts: {}, // Store contract abstractions
    web3Provider: null, // Web3 provider
    url: 'http://localhost:8545', // Url for web3
    account: '0x0', // current ehtereum account
    benef_size:0,
    donation_array:[],
    tot_donation:0n,
     
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
                ethereum.enable().then(async() => {}).catch(async()=> { $('#connectionErrorModal').modal(); });
            }
            catch(error) { $('#connectionErrorModal').modal() }
        } else { 
            $('#connectionErrorModal').modal()
        } 
        return App.initContract()
    }, 
    
    initContract: function() { 

        // Store ETH current account
        web3.eth.getCoinbase(function(err, account) { 
            if(err == null) {
                App.account = account; 
                //$("#accountId").html("Account:" + account);
            } 
        });

        // Init contracts
        $.getJSON("CrowdfundingCampaign.json").done(function(c) { 
            App.contracts["CrowdfundingCampaign"] = TruffleContract(c); 
            App.contracts["CrowdfundingCampaign"].setProvider(App.web3Provider); 
            //set contract address
            $("#contr_addr").attr("placeholder",c.networks[Object.keys(c.networks)[0]].address)
            $("#bytecode").append(sha256.update(c.deployedBytecode).hex())
            return App.listenForEvents(); 
        });

    }, 
    
    listenForEvents: function() { 
        App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
            instance.started().on('data', function (event) { 
                $("#eventId").html("Event catched!"); 
                console.log("Event catched"); 
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            });
            instance.ended().on('data', function (event) { 
                $("#eventId").html("Event catched!"); 
                console.log("Event catched"); 
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            }); 
            instance.donation().on('data', function (event) { 
                $("#eventId").html("Event catched!"); 
                console.log("Event catched"); 
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            }); 
            instance.donated().on('data', function (event) { 
                $("#eventId").html("Event catched!"); 
                console.log("Event catched"); 
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            });  
            instance.withdrawn().on('data', function (event) { 
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
            //Set campaing state
            instance.state().then(async(v) => {
                LABEL="STARTED";
                if(v==1n) LABEL="ENDED"
                if(v==2n) LABEL="DONATION"
                $("#state").attr("placeholder",LABEL);
            }); 
            //Set campaign timer
            instance.campaignCloses().then(async(sec) => {
                var countDownDate = new Date(parseInt(sec)*1000).getTime();

                // Update the count down every 1 second
                var countdown = setInterval(function() {

                    // Get today's date and time
                    var now = new Date().getTime();
                
                    // Find the distance between now and the count down date
                    var distance = countDownDate - now;

                    // Time calculations for days, hours, minutes and seconds
                    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
                    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

                    // Display the result in the element with id="demo"
                    $("#expire-date").attr("placeholder",days + "d " + hours + "h "
                    + minutes + "m " + seconds + "s ");
                
                    // If the count down is finished, write some text
                    if (distance < 0) {
                        clearInterval(countdown);
                        $("#expire-date").attr("placeholder","EXPIRED");
                    }
                }, 1000);
            })
            //organizer status list
            instance.organizers_list().then(async(result) => {

                for(i=0; i<result[0].length; i++){
                    donation = BigInt(result[1][i]);
                    badge = donation>0n?("<span class='badge badge-pill badge-success'>Donated: "+donation+"</span>"):"<span class='badge badge-pill badge-dark'>Pending</span>"
                    $("#orga_list").append("<li class='list-group-item'>"+result[0][i].toString()+" "+badge+"</li>")
                }
            })
            //donation status list
            instance.donation_status().then(async(result) => {
                this.benef_size=result[0].length;
                for(i=0; i<result[0].length; i++){
                    donation = BigInt(result[1][i]);
                    elem = "<tr>"+
                        "<th scope='row'>"+i+"</th>"+
                        "<td>"+result[0][i].toString()+"</td>"+
                        "<td>"+donation+"</td>"+
                        "<td><input type='text' id='donationbox-"+i+"' class='form-control' aria-describedby='basic-addon1' oninput='donation_calculator("+i+")' value='0.0'></td>"+
                    "</tr>"
                    $("#table_benef").append(elem)
                }
            })
        });
    }
}

donation_calculator = function(index){
    tot=0n;
    for(i=0;i<App.benef_size;i++){
        val=$('#donationbox-'+i).val();
        tot+=isInt(val)?BigInt(parseFloat(val)*1000000000000000000):function(){$('#donationbox-'+i).val('0.0');$('#amount_error_modal').modal();return 0n}();
        App.donation_array[i]=BigInt(parseFloat(val)*1000000000000000000);
    }
    App.tot_donation=tot;
    $('#tot_donation').val(parseFloat(tot.toString())/1000000000000000000);
    console.log(App.donation_array);
}

function isInt(value) {
    return parseFloat(value)>=0.0 && !isNaN(value);
}

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {
        App.init(); 
    });
});