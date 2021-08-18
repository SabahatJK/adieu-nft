import React, { Component } from 'react';
import Web3 from 'web3';
import './PropertyListings.css';
import {
  connectWallet,
  getCurrentWalletConnected //import here
} from "./connection.js";

import { BOOKINGMANAGER_ABI, BOOKINGMANAGER_ADDRESS } from '../config';
import moment from 'moment';

class PropertyRentals extends Component {

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      bookingCount: 0,
      bookings: [],
      state : true,
      test : ''
    };


  }

  componentWillMount() {
    this.init()
  }

  addWalletListener = () => {
    if (window.ethereum) {
      var self = this;
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          self.setState({account : accounts[0]})
          self.loadBlockchainData()
        } else {
          self.state.setState({account : accounts[0]})
        }
      });
    }
  };

  init = async() =>  {
    connectWallet();
    const {address, status} = await getCurrentWalletConnected();
    this.addWalletListener();
    this.setState({account : address})
    this.loadBlockchainData();


  }

loadBlockchainData = async() => {
   this.setState({bookings : []})
   const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
   const bookingInstance = new web3.eth.Contract(BOOKINGMANAGER_ABI, BOOKINGMANAGER_ADDRESS)
   this.setState({web3})
   this.setState({bookingInstance})
   const bookingCount = await bookingInstance.methods.getCntForProperty(this.props.propertyId).call()
   this.setState({ bookingCount})
   for (var i = 0; i < this.state.bookingCount; i++) {
     try {
     const index = await bookingInstance.methods.propertyBookings(this.props.propertyId, i).call()
     const booking = await bookingInstance.methods.getDetails(index).call()
     const isRefund = await bookingInstance.methods.getRefund(booking.tokenid).call()
     booking.isRefund = isRefund
     this.setState({test: booking.isRefund})
     const isWithdrawal = await bookingInstance.methods.getWithdrawal(booking.tokenid).call()
     booking.isWithdrawal = isWithdrawal
     this.setState({test: booking.isWithdrawal})

     this.setState({
       bookings: [...this.state.bookings, booking]
     });
    }
    catch(error)
    {
      //console.log(error)
      continue;
    }
  };
};

// Get the token Address from blockchain, so can be added to the metamask
withdraw = async(tokenId) => {
  if (tokenId > 0 )
  {
      var self = this;
      //this.setState({TokenId, tokenId})
      let txtHash;
      try {
        await this.state.bookingInstance.methods.withdraw(
        tokenId).send(
        {from: this.state.account}).then(function(receipt){
          txtHash = receipt["transactionHash"]
          console.log(receipt["transactionHash"])
          self.loadBlockchainData()
      });

    } catch (error) {
          this.setState({error: error.message})
      }
  }
}
breach = async(tokenId, breachFee, rent) => {

  if (tokenId > 0 )
  {
      var self = this;
      let txtHash;
      try {
        console.log(breachFee*0.01);


        await this.state.bookingInstance.methods.contractBreached(tokenId, String(breachFee))
        .send({from: this.state.account, value : rent*.5})
          .then(function(receipt){
            txtHash = receipt["transactionHash"];
            console.log(receipt["transactionHash"]);
            self.loadBlockchainData();
          });
      } catch (error) {
        alert("Error Occured : " + error.message);
        this.setState({error: error.message})
      }
    }
}

//booking._status,booking.tokenid, booking._rent, booking._deposit,noOfWeeks
showBreachButton =(status, tokenId, breachFee, startDate, noOfWeeks, rent, isRefund, isWithdrawal ) => {
  switch(status) {
    case '1':
        return 'Deposit Required';
    case '2':
      return 'Rent Required';
    case '3':
      var current = moment().format("L");
      if ((moment(current).unix() > Number(startDate)) && (isRefund && isWithdrawal))
        {
          return <div><span>Rented </span><button  className="blackSubmit"
          onClick={ () =>this.breach(tokenId, breachFee, rent)}>Breach</button></div>
        }
        else {
          return 'Rented';
        }
        default:
         return '';
    }

}
//booking._status,booking.tokenid, booking._rent, booking._deposit,noOfWeeks
showWidthdraw = (tokenId, startDate, noOfWeeks, rent, isWithdrawal ) => {
  var current = moment().format("L");
  if (moment(current).unix() >  (Number(startDate) + Number(noOfWeeks)*7*24*60*60 + 5*24*60*60)  )
  {
    if (isWithdrawal)
      return <div><button  className="blackSubmit" onClick={() =>this.withdraw(tokenId)}>Withdraw Rent</button></div>
  }
  else {

  }
};



render() {
    let display = ''
    if (this.state.bookingCount > 0)
    {
      display = <div  className='header'>
      <table width="99%" >
      <tr className="lightHeader" align="center">
          <td > Token</td>
          <td > Start Date </td>
          <td > # Of Weeks </td>
          <td > Rent </td>
          <td > Deposit </td>
          <td > Status </td>
        </tr>

         { this.state.bookings.map((booking, key) => {
            return(
                <tbody>
                  <tr key={booking.tokenid}  align="center">
                    <td>

                      <span className="content">{booking.token} &nbsp;</span>
                    </td>
                    <td>
                      <span className="content">{moment.unix(booking.startDate).format('L')} &nbsp;</span>


                    </td>
                    <td>
                      <span className="content">{booking.noOfWeeks} &nbsp;</span>

                    </td>
                    <td>
                     <span className="content">{booking._rent/ 1000000000000000000} eth &nbsp;</span>

                    </td>
                    <td>
                      <span className="content">{booking._deposit/ 1000000000000000000} eth &nbsp;</span>

                    </td>

                      <td>
                      &nbsp; {this.showWidthdraw(booking.tokenid, booking.startDate,
                          booking.noOfWeeks, booking._rent, booking.isWithdrawal)}
                      &nbsp;
                      {this.showBreachButton(booking._status,booking.tokenid,
                            Number(booking._rent)*0.5, booking.startDate,
                            booking.noOfWeeks, booking._rent, booking.isRefund,
                            booking.isWithdrawal )}
                        </td>

                  </tr>
                  </tbody>
            )
          })}
          </table>
      </div>
      }
    return (
        display

  );

  };

}

export default PropertyRentals;
