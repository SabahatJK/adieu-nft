import React, { Component } from 'react';
//import {pinJSONToIPFS} from './pinata.js'
import Modal from 'react-modal';
import moment from 'moment';
import Web3 from 'web3'
import {
  connectWallet,
  getCurrentWalletConnected //import here
} from "./connection.js";


import './PropertyListings.css'
import { BOOKINGMANAGER_ABI, BOOKINGMANAGER_ADDRESS } from '../config'

// @dev Takes care of the whole rental process/workflow
// first is the charging of non refundable fee
// then comes charging the deposit
// finally the rent

class AddRental extends Component {

    constructor(props) {
        super(props)
        this.state = {
          account: '',
          modalIsOpen: false,
          nonRefundableFee : this.props.nonRefundableFee,
          depositFee :  this.props.depositFee,
          rentFee : this.props.rentFee,
          address: this.props.propertAddress,
          noOfWeeks: 1,
          startDate : this.props.startDate,
          endDate : this.props.endDate,
          txError : '',
          reservTxHash : '',
          depositTxHash: '',
          rentalTxHash : '',
          tokenAddr :  '',
          tokenId : -1,
          tokenURI: '',
          submitDisabled : false,
          isDeposit : false,
          isRent : false,
          isSubmit : true,
          errors : ''

        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.init = this.init.bind(this);
        //this.calculateWeeks = this.calculateWeeks.bind(this);
    };

    // Intalize web3
    async init()  {
      connectWallet();
      const {address, } = await getCurrentWalletConnected();
      this.addWalletListener();
      this.setState({account : address})
      // intalize web3 with local ganache
      const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
      // get instance of the BookingManager Contract
      const bookingInstance = new web3.eth.Contract(BOOKINGMANAGER_ABI, BOOKINGMANAGER_ADDRESS)
      //this.setState({gasLimit : web3.utils.toHex(21000)
      console.log("this.props.propertyId: " + this.props.propertyId);
      // Set State
      this.setState({web3})
      this.setState({bookingInstance})


    }
  // Calculate the weeks between start date and end date to display
  // on the dropdown, not using calender, as no time
  calculateWeeks = () => {
      let weeks = []
      // set the first week as the start date
      weeks[0] = this.props.startDate
      // calculate a week in unix time
      const week = 7*24*60*60;
      // calculate the number of weeks between start date and end date
      // using floor to ignore any left over days after the last week
      const noWeeks = Math.floor(parseInt(this.props.endDate) - parseInt(this.state.startDate) )/7/24/60/60;

      console.log("No of weeks " + noWeeks)
      // Loop and get the weeks, any left over days are ignored
      for (let i = 1; i<= noWeeks -1 ; i++)
      {
          // calculate the starting date of the week
          weeks[i] =  parseInt(this.props.startDate) + i*parseInt(week);
      }
      this.setState({weeks})

    }
    UNSAFE_componentWillMount() {
      try{
      // calculate the starting dates of all weeks
      this.calculateWeeks()
      // intalize web3
      this.init();
    }
    catch(error)
    {
      this.setState({errors: error.message})
    }
  }
  // update the value in state for each change
  handleChange = event => {
        const {name, value} = event.target
        this.setState({
        [name]  : value
        })

  }
  // update the value in state for each dropdown
  handleSelect = event => {
    const {name, value} = event.target
    this.setState({
      [name]: value
    })
}
// Get the token Address from blockchain, so can be added to the metamask
getToken = async(tokenId) => {
  // just make sure tokenId is not null
  if (tokenId > 0 )
  {
    try {
      // get the token address from the BookingManager Contract
      const tokenAddr = await this.state.bookingInstance.methods.getTokenAddress(tokenId).call();
      this.setState({tokenAddr : "Please add the token to your metamask, to see your minted token : " + tokenAddr})
      this.setState({isRent : false})
      this.setState({isDeposit : false})
      this.setState({isSubmit : true})

    } catch (error) {
      this.setState({errors: error.message})
      this.setState({submitDisabled : 'false'})
    } finally {

    }

  }
}

addWalletListener = () => {
  if (window.ethereum) {
    var self = this;
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        self.setState({account : accounts[0]})
      } else {
        self.setState({account : accounts[0]})
      }
    });
  } else {

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
    this.setState({errors: "😢 Something went wrong while uploading your tokenURI."})
    this.setState({submitDisabled : 'false'})

  }
  var tokenURI = pinataResponse.pinataUrl;
  this.setState({tokenURI : "Token URI @Pinata : " + tokenURI})
  return tokenURI;

}

// Call rent on the smart contract, that actually mints the token to the
// first address in metamask
rent = async(tokenId) => {
  try {
    if (tokenId > 0 )
    {
      var self = this;
      let txtHash;
      const tokenURI = this.generateTokenURI()
      // call blockchain async and wait till done
      await this.state.bookingInstance.methods.rent(
        tokenId, tokenURI).send(
        {from: this.state.account,
        value: this.props.rentFee*this.state.noOfWeeks})
        .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
          this.setState({errors: JSON.parse(JSON.stringify(error))["message"]})
          //alert(JSON.parse(JSON.stringify(error))["message"]);
          console.error(error)
        })
        // Once done, get the transaction hash and call getToken to get the
        // address of the token just minted
        .then(function(receipt){
          console.log("receipt")
          txtHash = receipt["transactionHash"]
          console.log(receipt["transactionHash"])
          self.getToken(tokenId);
      });

      this.setState({rentalTxHash : "Rent Tx Hash: " + txtHash})
      this.setState({isRent : false})
      this.setState({isDeposit : false})
      this.setState({isSubmit : true})

      self.setState({submitDisabled : false})
    }
  } catch(error) {
    this.setState({errors: error.message})
    self.setState({submitDisabled : false})
  }
}
// Connect to metmask and pay the required depoist
// Wait untill done and then call
deposit = async(tokenId) => {

  try {
    if (tokenId > 0 )
    {
        var self = this;
        //this.setState({TokenId, tokenId})
        let txtHash
        let txError
        await this.state.bookingInstance.methods.deposit(
        tokenId).send(
        {from: this.state.account,
        value: this.props.depositFee*this.state.noOfWeeks}).then(function(receipt){
          txtHash = receipt["transactionHash"]
          console.log(receipt["transactionHash"])
          self.setState({tokenId : tokenId})
          self.setState({isRent : true})
          self.setState({isDeposit : false})
          self.setState({isSubmit : false})
          self.rent(tokenId)
      });

      this.setState({txError})
      this.setState({depositTxHash : "Deposit Tx Hash: " + txtHash})

    }

  } catch(error) {
    this.setState({errors: error.message})
    self.setState({submitDisabled : false})
  }

}
// On submit, intiate the rental process, pay the nonRefundable fee
// wait, untill the block is minted and then get the tokenid from the
// events (using past events on the latest block)
async handleSubmit(event) {
    event.preventDefault()
    this.setState({errors : ''})
    if (this.state.isSubmit === true)
      {
        if (Number(this.props.endDate) < (Number(this.state.startDate)  + Number(this.state.noOfWeeks*7*24*60*60)))
        {
          var strMessage = "Unfortunately this is beyond the end availibility ("
              +   moment.unix(this.props.endDate).format('L')
              + ") of the property, please reduce the number of weeks";

          this.setState({errors: strMessage})

        }
        else {

          this.setState({submitDisabled : true})
          this.setState({depositTxHash : ""})
          this.setState({rentalTxHash : ""})
          let txtHash = '';
          var self = this;
          try {
          // intiate the rental process by calling reserve
          await this.state.bookingInstance.methods.reserve(
                                this.props.propertyId,
                                this.state.startDate,
                                this.state.noOfWeeks,
                                this.state.account).send(
                                {from: this.state.account,
                                value: this.props.nonRefundableFee})
                                .on('transactionHash', function(hash){
                                  txtHash = hash


                              })
                              .on('receipt', function(receipt){
                                console.log(JSON.parse(JSON.stringify(receipt)))
                                console.log(JSON.parse(JSON.stringify(receipt))["events"]["NonRefundable"][0]["returnValues"]["tokenId"])
                                var tokenId = JSON.parse(JSON.stringify(receipt))["events"]["NonRefundable"][0]["returnValues"]["tokenId"]
                                self.setState({tokenId : tokenId})
                                self.deposit(tokenId)

                              })
                              .on('confirmation', function(confirmationNumber, receipt){
                                //this.setState({confirmation : confirmationNumber})
                              })
                              .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
                                //alert(JSON.parse(JSON.stringify(error))["message"]);
                                self.setState({errors: JSON.parse(JSON.stringify(error))["message"]});
                                console.error(error)
                                self.setState({submitDisabled : false})
                              });

          this.setState({reservTxHash : "Reservation Tx: " + txtHash})
          this.setState({isRent : false})
          this.setState({isDeposit : true})
          this.setState({isSubmit : false})

        } catch(error) {
            strMessage = error.message;
            var indexOfRevert = strMessage.indexOf("Runtime");
            if ((indexOfRevert !== -1) )
            {
              this.setState({errors: "Error : " + error.message.substring(indexOfRevert, strMessage.length-1)})

            }
            else
            {
              this.setState({errors: "Error : " + error.message})
            }
            self.setState({submitDisabled : false})
        }
      }
    }
  }
  // open Modal
    openModal = () => {
        this.setState({ modalIsOpen: true });
        this.setState({isSubmit : true})
        this.setState({isDeposit : false})
        this.setState({isRent : false})
        this.setState({reservTxHash : ''})
        this.setState({depositTxHash : ''})
        this.setState({tokenURI : ''})
        this.setState({rentalTxHash : ''})
        this.setState({errors : ''})
        this.setState({submitDisabled : false})
    };
    // Close Modal
    closeModal = () => {
        this.setState({ modalIsOpen: false });
    };

  render() {
    return (
      <div>
        <button onClick={this.openModal} className="blackSubmit"> Rent </button>
        <Modal isOpen={this.state.modalIsOpen} onRequestClose={this.closeModal} ariaHideApp={false}>
          <form onSubmit={this.handleSubmit}>
            <table  width="99%">
              <thead>
                <tr className="blackHeader">
                    <td align="left"><div> {this.props.propertAddress} </div>
                    </td>
                    <td align="right">
                    <button onClick={this.closeModal} className="blackSubmit">X</button>
                    </td>

                </tr>

              </thead>
              <tbody>
                <tr>
                  <td colSpan="2">
                  { this.state.errors.length > 0  &&
                      <div className="error">
                        ERROR : Please correct the errors and continue
                        <ul>
                        <li className="error" > {this.state.errors} </li>
                        </ul>
                      </div> }
                  </td>
                </tr>

                <tr>
                <td>
                      <table>
                      <tbody>
                        <tr>
                          <td> Select Starting Week:  </td>
                          <td>
                            <select id="startDate" name="startDate"
                            placeholder="Select Starting week"
                            onChange={this.handleSelect}

                            >

                            { this.state.weeks.map((item) => {
                              return(
                                <option value={item} >
                                  {moment.unix(item).format('L')}
                                </option>
                              )})}
                            </select>


                          </td>
                        </tr>
                        <tr>

                            <td> # of Consecutive weeks: </td>
                            <td>

                                <input
                                  id="noOfWeeks"
                                  name="noOfWeeks"
                                  type="text"
                                  defaultValue = "1"
                                  placeholder="Enter the # of Weeks"
                                  onChange={this.handleChange} // Prop: Puts data into state
                                />
                            </td>
                            </tr>
                          </tbody>
                      </table>

                    </td>

                    <td>
                       <b>NOTE : This will be show up as three seperate transactions on your account </b>
                        <br></br>
                        <ul>
                            <li>A Non Refundable Fee of <span className="content"><label id="lblNonRefundable">{(this.props.nonRefundableFee / 1000000000000000000).toFixed(3) } eth</label></span></li>
                            <li>Refundable Deposit  <span className="content"><label id="lblDeposit">{(this.props.depositFee * this.state.noOfWeeks/ 1000000000000000000).toFixed(3)} eth</label></span></li>
                            <li> Total Rent  <label id="lblRent">{(this.props.depositFee * this.state.noOfWeeks/ 1000000000000000000).toFixed(3)} eth</label></li>
                        </ul>
                    </td>

                </tr>
                <tr>
                 <td>
                 {this.state.isSubmit &&
                 <button type="submit" className="blackSubmit"
                        disabled={this.state.submitDisabled}
                        >
                        Submit
                </button>}
                {this.state.isDeposit && <button type="submit" className="blackSubmit"
                        disabled={this.state.submitDisabled}
                        onClick={() =>this.deposit(this.state.tokenId)}
                        >
                       Deposit
               </button>}
               {this.state.isRent &&
               <button type="submit" className="blackSubmit"
                    disabled={this.state.submitDisabled} onClick={() =>this.rent(this.state.tokenId)}
                    >
                      Rent
              </button>}

                </td>
                </tr>

                <tr>
                  <div>
                    <br/>
                    <br/>
                    <label id="lblRvTxHash">{this.state.reservTxHash}</label><br></br>
                    <label id="lblDepositTxHash">{this.state.depositTxHash}</label> <br></br>
                    <label id="lblTokenURI">{this.state.tokenURI}</label> <br></br>
                    <label id="lblRentTxHash">{this.state.rentalTxHash}</label> <br></br>
                    <br/>
                    <b><label>{this.state.tokenAddr} </label></b>
                  </div>
                </tr>
              </tbody>
            </table>

          </form>
        </Modal>
      </div>
    );
  }
}

export default AddRental;
