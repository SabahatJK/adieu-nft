import React, { Component } from 'react'
import Web3 from 'web3'
import { PROPERTMANAGER_ABI, PROPERTMANAGER_ADDRESS } from '../config'
import {
  connectWallet,
  getCurrentWalletConnected //import here
} from "./connection.js";


import PropertyListings from './PropertyListings';

/*
 @dev Component to get properties to rent from blockchain
 display using PropertyListing Component

*/
class Rental extends Component {

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      propertyCount: 0,
      properties: [],
      account : this.props.account,
    };
  };

  UNSAFE_componentWillMount() {
      try {
        this.loadBlockchainData()
      }
     catch (error)
     {
       console.log(error)
     }

  }

  // @dev Load the properties from blockchain
  async loadBlockchainData() {


      //const {address, status} = await getCurrentWalletConnected();
      //this.setState({account : address})

      // Get web3 provider - pointing to connected or ganache
      const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")

      // create an instnace of the PropertyManager smart contract
      const propertyManagerInstance = new web3.eth.Contract(PROPERTMANAGER_ABI, PROPERTMANAGER_ADDRESS)
      // save to state ?/
      this.setState({ propertyManagerInstance })
      // get count of the properties on blockhain via web3
        const propertyCount = await propertyManagerInstance.methods.getCount().call()
      // save count
      this.setState({ propertyCount })
      // loop and get each propertu details
      for (var i = 0; i <= propertyCount; i++) {
        try {
          const property = await propertyManagerInstance.methods.getDetails(i).call()
          //save to state
          this.setState({
            properties: [...this.state.properties, property]
          })
      }
      catch(error)
        {
          continue;

        }
      }

}

render() {
    return (
      <div>
        <nav>
        </nav>
        <div className="container-fluid">
          <main role="main" className="col-lg-12 d-flex justify-content-center">
                      <div id="loader" className="text-center">
                        <p className="text-center">Loading...{this.state.propertyCount}</p>
                      </div>
          </main>
        <div className="row">
          <PropertyListings properties= {this.state.properties}></PropertyListings>
        </div>
      </div>
    </div>
  );
  };
}

export default Rental;
