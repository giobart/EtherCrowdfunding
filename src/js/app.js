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
    is_withdrawable:false,
    web3: null ,
    contract_address: null,
    contract_curr_balance: 0,
    milestone_addr:'0x0',
    last_milestone:0,
    organizer_reward_indexes:[],
     
    init: function() { return App.initWeb3(); },


    // Functions
    initWeb3: function() { 
        /* initialize Web3 */
        // Check whether exists a provider, e.g Metamask
        if(typeof web3 != 'undefined') { 
            App.web3Provider = window.ethereum; 
            App.web3 = new Web3(App.web3Provider);
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
        App.web3.eth.getCoinbase(function(err, account) { 
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
            App.contract_address = c.networks[Object.keys(c.networks)[0]].address;
            $("#contr_addr").attr("placeholder",App.contract_address);
            $("#bytecode").append(sha256.update(c.deployedBytecode).hex());

            $.getJSON("CrowdfundingCampaignMilestoneSystem.json").done(function(c) { 
                App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
                    instance.milestone_contract().then(async(addr)=>{
                        App.milestone_addr=addr;
                        App.contracts["CrowdfundingCampaignMilestoneSystem"] = TruffleContract(c);//new App.web3.eth.Contract(c.abi,addr);
                        App.contracts["CrowdfundingCampaignMilestoneSystem"].setProvider(App.web3Provider); 
                        return App.listenForEventsMilestone();
                    }).catch(async()=> { $('#connectionErrorModal').modal(); });  
                }); 
            });

            return App.listenForEventsCrowdfunding(); 
        });

    }, 

    listenForEventsMilestone: function() { 
        App.contracts["CrowdfundingCampaignMilestoneSystem"].at(App.milestone_addr).then(async (instance) => {
            instance.milestone_event().on('data', function (event) { 
                App.notify("Milestone "+ parseFloat(event.returnValues["_amount"])/1000000000000000000+ "ETH" + " reached! amount won: "+ parseFloat(event.returnValues["_payed"])/1000000000000000000+ "ETH");
                console.log("Event catched"); 
                console.log(event);                       
            });
            instance.new_milestone_event().on('data', function (event) { 
                App.notify("New milestone set at: "+ parseFloat(event.returnValues["_goal"])/1000000000000000000+ "ETH" + " with value: "+ parseFloat(event.returnValues["_prize"])/1000000000000000000+ "ETH");
                console.log("Event catched"); 
                console.log(event);          
            });
            instance.refund_event().on('data', function (event) { 
                App.notify("Claimed refund for"+ event.returnValues["_organizer"] + " of amount "+ parseFloat(event.returnValues["_refund"])/1000000000000000000+ "ETH");
                console.log("Event catched"); 
                console.log(event);
            }); 
            return App.renderMilestone();
        });     
    },
    
    listenForEventsCrowdfunding: function() { 
        App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
            instance.started().on('data', function (event) { 
                App.notify("Contract started");
                console.log("Event catched"); 
                console.log(event);             
            })
            instance.ended().on('data', function (event) { 
                App.notify("Contract now in ended state");
                console.log("Event catched"); 
                console.log(event);
            }); 
            instance.donation().on('data', function (event) { 
                App.notify("Contract now in donation state"); 
                console.log("Event catched"); 
                console.log(event.id);
            }); 
            instance.donated().on('data', function (event) { 
                App.notify("Address "+event.returnValues["_from"]+" donated "+ parseFloat(event.returnValues["_amount"])/1000000000000000000+ "ETH - type: "+event.returnValues["_type"],event.id); 
                console.log("Event catched"); 
            });  
            instance.withdrawn().on('data', function (event) { 
                App.notify("Beneficiary "+event.returnValues["_from"]+" has withdrawn: "+ parseFloat(event.returnValues["_amount"])/1000000000000000000+ "ETH");
                console.log("Event catched"); 
                console.log(event);
            }); 
            instance.flag_set().on('data', function (event) { 
                App.notify("New flag from "+event.returnValues["_from"]+" set at: "+ parseFloat(event.returnValues["_amount"])/1000000000000000000+ "ETH" + " with value: "+ parseFloat(event.returnValues["_value"])/1000000000000000000+ "ETH");
                console.log("Event catched"); 
                console.log(event);
                App.flag_list();
            });
        }).catch(async()=> { $('#connectionErrorModal').modal(); });
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
            //organizer status list
            instance.organizers_list().then(async(result) => {
                for(i=0; i<result[0].length; i++){
                    App.organizers[i]=result[0][i].toLowerCase();
                    donation = parseFloat(BigInt(result[1][i]).toString())/1000000000000000000;
                    badge = donation>0n?("<span class='badge badge-pill badge-success'>Donated: "+donation+"</span>"):"<span class='badge badge-pill badge-dark'>Pending</span>"
                    $("#orga_list").append("<li class='list-group-item'>"+result[0][i].toString()+" "+badge+"</li>")
                }
            })
            //Get contract expire-date and finish the render
            instance.campaignCloses().then(async(sec) => {
                var countDownDate = new Date(parseInt(sec)*1000).getTime();
                // Update the count down every 1 second
                var countdown = countDownInterval(countDownDate,$("#expire-date"),() => {App.is_expired=true},countdown)
                
                //after contract information ready, render the final part of the page
                if(window.location.pathname=="/contribute.html"){
                    App.renderContribute(instance);
                }
                if(window.location.pathname=="/withdraw.html"){
                    App.renderWithdraw(instance,countDownDate);
                }
            })       
        });
    },

    renderContribute : function(instance){
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
                $("#table_benef").append(elem);
            }
            donation_type_toggle('fair');
        })
        //donation list history
        instance.get_my_donations({from:App.account}).then(async(result) => {
            if(result[0].length>0){
                $('#contrib_history').append("<h4>Your contribution history:</h4>");
                $('#contrib_history').append('<table class="table table-hover table-responsive" >'+
                '<thead><tr>'+
                    '<th scope="col">#</th>'+
                    '<th scope="col">Address</th>'+
                    '<th scope="col">Donated ETH</th>'+
                  '</tr></thead>'+
                '<tbody id="table_contrib">'+
                '</tbody>'+
                '</table>');
                for(i=0; i<result[0].length; i++){
                    donation = parseFloat(BigInt(result[1][i]).toString())/1000000000000000000;
                    elem = "<tr>"+
                        "<th scope='row'>"+i+"</th>"+
                        "<td>"+result[0][i].toString()+"</td>"+
                        "<td>"+donation+"</td>"+
                    "</tr>"
                    $("#table_contrib").append(elem);
                }
            }
        })

        //render organizer tools
        if(App.organizers.includes(App.account.toString())){
            console.log("organizer mode activated")
            $("#organizer-tools").toggleClass('d-none');
        }

        //show milestones
        instance.next_milestone().then(async(milestone)=>{
            instance.get_balance().then(async(balance)=>{
                milestone=parseFloat(BigInt(milestone).toString());
                App.contract_curr_balance=parseFloat(BigInt(balance).toString());
                balance_eth=App.contract_curr_balance.toString()/1000000000000000000;
                $("#balance").attr('placeholder',balance_eth);
                if(BigInt(milestone)>0n){
                    $("#milesone-banner-div").toggleClass("d-none");
                    milestone_eth=milestone.toString()/1000000000000000000;
                    percentage=parseInt(balance_eth*100/milestone_eth);
                    $('#milestone-bar').text(percentage+"%");
                    $('#milestone-bar').width(percentage>5?percentage+"%":"5%");
                    $('#milestone-amount').text(milestone_eth+"ETH");
                }
            })  
        })

        //obtain flag list
        App.flag_list();
    },

    renderWithdraw : function(instance,campaign_closes){
        instance.donation_status({from:App.account}).then(async(result) => {
            this.benef_size=result[0].length;
            donation = 0;
            beneficiary = false;
            organizer = false;
            for(i=0; i<result[0].length; i++){
                if(result[0][i].toLowerCase()==App.account.toString()){
                    donation = parseFloat(BigInt(result[1][i]).toString())/1000000000000000000;
                    beneficiary=true;
                }
            }
            var withdrawcountdown = countDownInterval(
                (campaign_closes+60*5*1000),
                $("#withdraw-btn"),
                () => {App.is_withdrawable=true},
                withdrawcountdown,
                "Withdraw now!",
                "text"
            )
            if(beneficiary){
                $('#earnings').text(donation+" ETH")
                //withdraw contract call
                $("#withdraw-btn").click(function(){
                    console.log(App.is_withdrawable)
                    if(App.is_withdrawable && donation>0){
                        instance.withdraw({from:App.account}).then(async() => {
                            $('#successModal').modal(); 
                        }).catch(async(err)=> { 
                            console.log(err.stack);
                            $('#error_trace').append(err.stack); 
                            $('#transactionErrorModal').modal(); 
                        });
                    }else{
                        alert("You can withdraw only if you have more than 0 ETH of donations and if the withdraw timer is expired")
                    }
                })
            }else{
                //check if it is an organizer
                App.organizers.forEach(element => {
                    if(element.toString()==App.account.toString()) organizer=true;
                });
                if(organizer){
                    //check if there are some funds to be collected from the milestone contract
                    App.contracts["CrowdfundingCampaignMilestoneSystem"].at(App.milestone_addr).then(async (instanceMilestone) => {
                        //calculate not win milestones earnings
                        instanceMilestone.milestone_list().then(async(results)=>{
                            instanceMilestone.can_ask_refund().then(async(can_ask_refund)=>{
                                index=results[0];
                                milestones=results[1];
                                milestones_reward=results[2];
                                milestones_organizer=results[3];
                                tot=0;
                                num_of_rewards=0;
                                //check for all the rewards
                                for(i=index;i<milestones.length;i++){
                                    if(milestones_organizer[i].toLowerCase()==App.account.toString()){
                                        tot+=parseFloat(BigInt(milestones_reward[i]).toString())/1000000000000000000;
                                        App.organizer_reward_indexes.push(i);
                                        num_of_rewards++;
                                    }
                                }
                                $('#earnings').text(tot+" ETH in "+num_of_rewards+" uncollected milestone")
                                $("#withdraw-btn").click(function(){
                                    if(App.is_withdrawable && tot>0 && can_ask_refund){
                                        $("#organizerMilestoneRewardModal").modal();
                                    }else{
                                        alert("You can withdraw only if you have more than 0 ETH of uncollected milestones and if at least one Beneficiary has already collected the donations")
                                    }                                
                                })
                                $("#multi-transaction-button").click(function(){
                                    App.organizer_reward_indexes.forEach(elem => {
                                        instanceMilestone.refund(elem,{from:App.account}).then(async() => {
                                            $('#successModal').modal(); 
                                        }).catch(async(err)=> { 
                                            console.log(err.stack);
                                            $('#error_trace').append(err.stack); 
                                            $('#transactionErrorModal').modal(); 
                                        });
                                    });
                                })
                            });
                        })
                    })
                }else{
                    $("#accountErrorModal").modal()
                } 
            }      
        })
    },

    renderMilestone: function(){
        App.contracts["CrowdfundingCampaignMilestoneSystem"].at(App.milestone_addr).then(async (instance) => {
            instance.last_milestone().then(async(res)=>{
                $("#last_milestone").text((res.toString()/1000000000000000000)+" ETH")
                console.log(res);
                App.last_milestone=res;
                if(res.toString()<App.contract_curr_balance){
                    $("#last_milestone").text(" current balance + donation amount"); 
                }
            })
        });
    },

    flag_list: function(){
        App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
            instance.flag_list().then(async(result) => {
                for(i=0;i<result[0].length;i++){
                    amount=(parseFloat(BigInt(result[0][i]).toString())/1000000000000000000)+" ETH";
                    value=(parseFloat(BigInt(result[1][i]).toString())/1000000000000000000)+" ETH";
                    flag_card='<li class="list-group-item d-flex justify-content-between align-items-center border-0">'+amount+' <span class="badge badge-pill badge-warning">win: '+value+'</span></li>';
                    $('#flag_box').append(flag_card);
                }
            })
        })
    },

    donate: function(){
        App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
            if(App.state==1 || App.is_expired){
                alert("The campaign is finished, you can't donate now");
                return;
            }
            if(
                (App.state==0 && !App.organizers.includes(App.account.toString())) ||
                (App.state==0 && !App.fair_donation)
            ){
                alert("During the current state of the campaign only organizers can contribute and only with fair donations");
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

    setFlag: function(){
        App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
            flag = parseFloat($('#flag-input').val())*1000000000000000000;
            amount = parseFloat($('#flag-amount').val())*1000000000000000000;
            if(App.is_expired){
                alert("The campaign is finished, you can't set a flag now");
                return;
            }
            if(amount<50000000000000000){
                alert("Minimum donation amount 0,05ETH");
                return;
            }
            if(flag<=0){
                alert("Flag must be greater than 0 ETH");
                return;
            }
            instance.setup_reward(flag.toString(),{from:App.account,value:amount.toString()}).then(async() => {
                $('#successModal').modal(); 
            }).catch(async(err)=> { 
                console.log(err.stack);
                $('#error_trace').append(err.stack);    
                $('#transactionErrorModal').modal(); });
        });
    },

    setMilestone: function(){
        App.contracts["CrowdfundingCampaign"].deployed().then(async (instance) => {
            milestone_position = parseFloat($('#goal-input').val())*1000000000000000000;
            amount = parseFloat($('#goal-amount').val())*1000000000000000000;
            
            if(App.contract_curr_balance+amount>=milestone_position){
                balETH=parseFloat(App.contract_curr_balance)/1000000000000000000;
                alert("The milestone must be set at a strictly larger position than current contract balance+donation amount. Current balance: "+balETH);
                return;
            }
            if(milestone_position<App.last_milestone){
                alert("The milestone must be set at a strictly larger position than the last milestone");
                return;
            }
            if(App.contract_curr_balance+amount>=milestone_position){
                balETH=parseFloat(App.contract_curr_balance)/1000000000000000000;
                alert("The milestone must be set at a strictly larger position than current contract balance+donation amount. Current balance: "+balETH);
                return;
            }
            if(amount<50000000000000000){
                alert("Minimum donation amount 0,05ETH");
                return;
            }
            instance.new_milestone(milestone_position.toString(),{from: App.account, value: amount.toString()}).then(async() => {
                $('#successModal').modal(); 
            }).catch(async(err)=> { 
                console.log(err.stack);
                $('#error_trace').append(err.stack);    
                $('#transactionErrorModal').modal(); 
            });
        });
    },

    notify: function(event,id=""){
        if(id!=-1){
            try{
                $("."+id).addClass("d-none");
                $("."+id).removeClass("show");
                $("."+id).removeClass(id);
                console.log($("."+id))
            }catch(e){}
        }
        $("#notification-bell").addClass("btn-danger").removeClass("btn-light");
        $("#notification_box").append('<hr class="my-4 '+id+'" ><div class="alert alert-light alert-dismissible show '+id+'" role="alert" >'+event+
                    '<button type="button" class="close" onClick="window.location.reload();" aria-label="Close">'+
                    '<span aria-hidden="true">'+
                        '<svg class="bi bi-arrow-clockwise" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'+
                        '<path fill-rule="evenodd" d="M3.17 6.706a5 5 0 0 1 7.103-3.16.5.5 0 1 0 .454-.892A6 6 0 1 0 13.455 5.5a.5.5 0 0 0-.91.417 5 5 0 1 1-9.375.789z"/>'+
                        '<path fill-rule="evenodd" d="M8.147.146a.5.5 0 0 1 .707 0l2.5 2.5a.5.5 0 0 1 0 .708l-2.5 2.5a.5.5 0 1 1-.707-.708L10.293 3 8.147.854a.5.5 0 0 1 0-.708z"/>'+
                        '</svg>'+
                    '</span>'+
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

val_check = function(elem){
    val=$(elem).val();
    if (!isInt(val)){
        $(elem).val('0.0');
        $('#amount_error_modal').modal();
        return;
    }
}

function isInt(value) {
    return parseFloat(value)>=0.0 && !isNaN(value);
}

function countDownInterval(countDownDate,widget,expired_callback,countdown,expireMessage="EXPIRED",attr="placeholder") {
    return setInterval(function() {

        // Get today's date and time
        var now = new Date().getTime();
    
        // Find the distance between now and the count down date
        var distance = countDownDate - now;

        // Time calculations for days, hours, minutes and seconds
        var days = Math.floor(distance / (1000 * 60 * 60 * 24));
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result 
        result = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";
        attr=='text'?widget.text(result):widget.attr(attr,result);
    
        // If the count down is finished, write some text
        if (distance < 0) {
            clearInterval(countdown);
            attr=='text'?widget.text(expireMessage):widget.attr(attr,expireMessage);
            expired_callback();
        }
    }, 1000);
}

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {
        App.init(); 
    });
});