
import React, { Component } from 'react';
import Web3 from 'web3'
import './PropertyListings.css'

import {
  connectWallet,
  getCurrentWalletConnected //import here
} from "./connection.js";

import { BOOKINGMANAGER_ABI, BOOKINGMANAGER_ADDRESS } from '../config'
import moment from 'moment';



class MyRentals extends Component {

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      bookingCount: 0,
      bookings: [],
      error : ''
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
   if (this.state.account !== "")
   {
     this.setState({error : ''})
    this.setState({bookings : []})
    const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
    const bookingInstance = new web3.eth.Contract(BOOKINGMANAGER_ABI, BOOKINGMANAGER_ADDRESS)
    this.setState({web3})
    this.setState({bookingInstance})
    const bookingCount = await bookingInstance.methods.getCntForTenant(this.state.account).call()
    this.setState({ bookingCount})
    for (var i = 0; i < this.state.bookingCount; i++) {
      try {
      const index = await bookingInstance.methods.tenantTokens(this.state.account, i).call()

      const booking = await bookingInstance.methods.getDetails(index).call()

      const isRefund = await bookingInstance.methods.getRefund(booking.tokenid).call()
      booking.isRefund = isRefund
      this.setState({test: booking.isRefund})
      this.setState({
        bookings: [...this.state.bookings, booking]
      });


      }
      catch(error) {
        //this.setState({error: error.message})
        continue;
      }

    };
  }
};

generateTokenURI = async() => {
   //make metadata
  const JSONBody = {
    name : 'Adieu Token :' + this.props.propertAddress,
    property : this.props.propertAddress,
    startDate : this.state.startDate,
    noOfWeeks : this.state.noOfWeeks
  }

  //make pinata call
   // Pass the date into the request body
  const pinataResponse = await fetch('/.netlify/functions/pinata', {
                            method: "POST",
                            body: JSON.stringify({JSONBody})
                          }).then((res) => res.json());
  console.log(pinataResponse)
  if (!pinataResponse.success) {
          this.setState({error: "😢 Something went wrong while uploading your tokenURI."})


  }
  else {
  var tokenURI = pinataResponse.pinataUrl;
  this.setState({tokenURI : "Token URI @Pinata : " + tokenURI})
  return tokenURI;
}
}

rent = async(tokenId, rent, noOfWeeks) => {
  if (tokenId > 0 )
  {
    var self = this;
    let txtHash;
    const tokenURI = this.generateTokenURI();
    // call blockchain async and wait till done
    await this.state.bookingInstance.methods.rent(
      tokenId, tokenURI).send(
      {from: this.state.account,
      value: rent})
      .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        alert(JSON.parse(JSON.stringify(error))["message"]);
        console.log(error)
        self.setState({error: JSON.parse(JSON.stringify(error))["message"]})
      })
      // Once done, get the transaction hash and call getToken to get the
      // address of the token just minted
      .then(function(receipt){
        console.log("receipt")
        txtHash = receipt["transactionHash"]
        console.log(receipt["transactionHash"])
        self.loadBlockchainData()
    });
  this.setState({rentalTxHash : "Rent Tx Hash: " + txtHash})

  }
}

// Connect to metmask and pay the required depoist
// Wait untill done and then call
deposit = async(tokenId, deposit, rent, noOfWeeks) => {
  if (tokenId > 0 )
  {
      var self = this;
      //this.setState({TokenId, tokenId})
      let txtHash;
      try{
          await this.state.bookingInstance.methods.deposit(
          tokenId).send(
          {from: this.state.account,
          value: deposit}).then(function(receipt){
            txtHash = receipt["transactionHash"]
            console.log(receipt["transactionHash"])
            self.rent(tokenId, rent, noOfWeeks)
        });
        this.loadBlockchainData();
        this.setState({depositTxHash : "Deposit Tx Hash: " + txtHash})

      }
      catch(error) {
        alert("Error Occured : " + error.message);
        this.setState({error: error.message})

      }
  }

}
// Get the token Address from blockchain, so can be added to the metamask

refund = async(tokenId, deposit, noOfWeeks) => {
  if (tokenId > 0 )
  {
      var self = this;
      //this.setState({TokenId, tokenId})
      let txtHash;
      try{
        await this.state.bookingInstance.methods.refund(
        tokenId).send(
        {from: this.state.account}).then(function(receipt){
          txtHash = receipt["transactionHash"]
          console.log(receipt["transactionHash"])
          self.loadBlockchainData()
      });
    }
    catch(error) {
      this.setState({error: error.message})

    }
  }
}
//booking._status,booking.tokenid, booking._rent, booking._deposit,noOfWeeks
getStatus =(status, tokenId, rent, deposit, noOfWeeks ) => {
  switch(status) {
    case '0':
      return 'Non Refundable FeeRequired'
    case '1':
      return <button  className="blackSubmit" onClick={ () =>this.deposit(tokenId, deposit, rent, noOfWeeks)}>Deposit</button>
    case '2':
      return <button  className="blackSubmit" onClick={ () =>this.rent(tokenId, rent, noOfWeeks)}>Rent</button>
    default:
      return 'Rented'
  }

}



//booking._status,booking.tokenid, booking._rent, booking._deposit,noOfWeeks
showWidthdraw = (tokenId, startDate, noOfWeeks, deposit, isRefund ) => {
  var current = moment().format("L");
  if (moment(current).unix() >  (Number(startDate) + Number(noOfWeeks)*7*24*60*60 + 5*24*60*60) )
  {
    if (isRefund)
      return <button  className="blackSubmit" onClick={() =>this.refund(tokenId, deposit, noOfWeeks)}>Refund</button>
    else
      return ''
  }
};



render() {
    return (
      <div>
        <p></p>
        { this.state.error.length > 0  &&
            <div className="error">
              ERROR : Please correct the errors and continue
              <ul>
              <li className="error" > {this.state.error} </li>
              </ul>
            </div> }


        <main role="main" className="col-lg-12 d-flex justify-content-center">
                      <div id="loader" className="text-center">
                        <p className="text-center">Loading...{this.state.bookingCount}</p>
                      </div>
          </main>
        <p></p>
        <table className="rentaltable" >
          <tr className="blackHeader">
            <td></td>
            <td> Address </td>
            <td> Token </td>
            <td> Start Date </td>
            <td> # Of Weeks </td>
            <td> Rent </td>
            <td> Deposit </td>
            <td> Status </td>
          </tr>
        { this.state.bookings.map((booking, key) => {
              return(
                  <tbody>
                    <tr>
                    <td>

                        <span className="content">{booking.tokenid} &nbsp;</span>
                    </td>
                      <td>

                        <span className="content">{booking.addr} &nbsp;</span>
                      </td>
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

                        {this.getStatus(booking._status,booking.tokenid, booking._rent, booking._deposit,booking.noOfWeeks )}
                        &nbsp; {this.showWidthdraw(booking.tokenid, booking.startDate, booking.noOfWeeks, booking._deposit, booking.isRefund)}
                        </td>
                    </tr>
                    </tbody>
              )
            })}
            </table>
        </div>
  );
  };
}

export default MyRentals;
