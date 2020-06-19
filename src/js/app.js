App = {
    // Attributes
    contracts: {}, // Store contract abstractions
    web3Provider: null, // Web3 provider
    url: 'http://localhost:8545', // Url for web3
    account: '0x0', // current ehtereum account
    benef_size:0,
    donation_array:[],
    organizers:[],
    tot_donation:0n,
    fair_donation:true,
    state:0,
    is_expired:false,
     
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
                App.notify("Contract started");
                console.log("Event catched"); 
                console.log(event);
                
                // If event has parameters: event.returnValues.*paramName*
            });
            instance.ended().on('data', function (event) { 
                App.notify("Contract now in ended state");
                console.log("Event catched"); 
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            }); 
            instance.donation().on('data', function (event) { 
                App.notify("Contract now in donation state"); 
                console.log("Event catched"); 
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            }); 
            instance.donated().on('data', function (event) { 
                App.notify("Address "+event.returnValues["_from"]+" donated "+ parseFloat(event.returnValues["_amount"])/1000000000000000000+ "ETH - type: "+event.returnValues["_type"]); 
                console.log("Event catched"); 
                console.log(event);
                // If event has parameters: event.returnValues.*paramName*
            });  
            instance.withdrawn().on('data', function (event) { 
                App.notify(event);
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
                App.state=v;
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
                        App.is_expired=true;
                    }
                }, 1000);
            })
            //organizer status list
            instance.organizers_list().then(async(result) => {
                for(i=0; i<result[0].length; i++){
                    App.organizers[i]=result[0][i].toLowerCase();
                    donation = parseFloat(BigInt(result[1][i]).toString())/1000000000000000000;
                    badge = donation>0n?("<span class='badge badge-pill badge-success'>Donated: "+donation+"</span>"):"<span class='badge badge-pill badge-dark'>Pending</span>"
                    $("#orga_list").append("<li class='list-group-item'>"+result[0][i].toString()+" "+badge+"</li>")
                }
            })
            //beneficiaries status list
            instance.donation_status().then(async(result) => {
                this.benef_size=result[0].length;
                for(i=0; i<result[0].length; i++){
                    donation = parseFloat(BigInt(result[1][i]).toString())/1000000000000000000;
                    elem = "<tr>"+
                        "<th scope='row'>"+i+"</th>"+
                        "<td>"+result[0][i].toString()+"</td>"+
                        "<td>"+donation+"</td>"+
                        '<td><input type="text" value="0.0" id="donationbox-'+i+'" class="form-control" aria-label="Amount" oninput="donation_calculator('+i+')"" ></td>'+
                    "</tr>"
                    $("#table_benef").append(elem)
                }
                donation_type_toggle('fair');
            })
        });
    },

    donate: function(){
        App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
            if(App.state==1 || App.is_expired){
                alert("The campaign is finished, you can't donate now");
                return;
            }
            if(App.state==0 && !App.organizers.includes(App.account.toString())){
                alert("During the current state of the campaign only organizers can contribute");
                return;
            }
            if(App.tot_donation<50000000000000000){
                alert("Minimum donation required: 0.05 ETH");
                return;
            }
            transaction_info = {from:App.account, value:App.tot_donation.toString()}
            if(App.fair_donation){
                if(App.state==0){
                    instance.organizers_donation(transaction_info).then(async() => {
                        $('#successModal').modal(); 
                    }).catch(async(err)=> { 
                        console.log(err.stack);
                        $('#error_trace').append(err.stack); 
                        $('#transactionErrorModal').modal(); 
                    });
                }
                else{
                    instance.fair_donation(transaction_info).then(async() => {
                        $('#successModal').modal(); 
                    }).catch(async(err)=> { 
                        console.log(err.stack);
                        $('#error_trace').append(err.stack); 
                        $('#transactionErrorModal').modal(); 
                    });
                }
            }else{
                instance.unfair_donation(App.donation_array,transaction_info).then(async() => {
                    $('#successModal').modal(); 
                }).catch(async(err)=> { 
                    console.log(err.stack);
                    $('#error_trace').append(err.stack);    
                    $('#transactionErrorModal').modal(); });
            }
        });
    },

    notify: function(event){
        $("#notification_box").append('<div class="alert alert-warning alert-dismissible fade show" role="alert">'+event+
                    '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'+
                    '<span aria-hidden="true">&times;</span>'+
                    '</button>'+
                '</div>'); 
    }
}

donation_calculator = function(index){
    tot=0n;
    for(i=0;i<App.benef_size;i++){
        val=$('#donationbox-'+i).val();
        tot+=isInt(val)?BigInt(parseFloat(val)*1000000000000000000):function(){$('#donationbox-'+i).val('0.0');$('#amount_error_modal').modal();return 0n}();
        App.donation_array[i]=BigInt(parseFloat(val)*1000000000000000000).toString();
    }
    App.tot_donation=tot;
    $('#tot_donation').val(parseFloat(tot.toString())/1000000000000000000);
}

fair_donation = function(){
    val=$('#tot_donation').val();
    if (!isInt(val)){
        $('#tot_donation').val('0.0');
        $('#amount_error_modal').modal();
        return;
    }
    App.tot_donation=BigInt(parseFloat(val)*1000000000000000000);
    val = BigInt(parseFloat(val)*1000000000000000000)/BigInt(App.benef_size);
    for(i=0;i<App.benef_size;i++){
        $('#donationbox-'+i).val((parseFloat(val.toString())/1000000000000000000).toFixed(1));
    }
}

donation_type_toggle = function(type){
    if(type=='fair'){
        val=$('#tot_donation').prop('disabled', false);
        for(i=0;i<App.benef_size;i++){
            $('#donationbox-'+i).prop('disabled', true);
        }
        App.fair_donation=true;
        fair_donation()
    }else{
        val=$('#tot_donation').prop('disabled', true);
        for(i=0;i<App.benef_size;i++){
            $('#donationbox-'+i).prop('disabled', false);
        }
        App.fair_donation=false;
    }
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