import React, { Component } from 'react';

import Modal from 'react-modal';
import moment from 'moment';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import {
  formatDate,
  parseDate,
} from 'react-day-picker/moment';

import Web3 from 'web3'
import {
  connectWallet,
  getCurrentWalletConnected //import here
} from "./connection.js";

//import ConnectContext from "./Conn"
//import {pinJSONToIPFS} from './pinata.js'

import MyProperties from './MyProperties';
import './PropertyListings.css'

import { PROPERTMANAGER_ABI, PROPERTMANAGER_ADDRESS } from '../config'

// @dev Takes care adding a new listing
// charges 100 wei for each transaction
// creates an object in pinata for ifps and the tokenuri


class AddListing extends Component {

    constructor(props) {
        super(props)
        this.state = {
          account: '',
          modalIsOpen: false,
          address : '',
          rent : '',
          startDate: '',
          endDate : '',
          ifpsUrl : '',
          beds : '',
          baths: '',
          sqtFeet: '',
          type : '',
          heating: '',
          cooling : '',
          parking: '',
          imageUrl : '',
          description: '',
          propertyCount : 0,
          properties : [],
          tokenUri : '',
          pinataKey : '',
          pinataSecretKey : '',
          selectedDay: undefined,
          isEmpty: true,
          isDisabled: false,
          errors: [],
          error : '',
          submitDisabled : false
        };
      this.handleSubmit = this.handleSubmit.bind(this);
    };
    // handle the start date, should have had a single handler for
    // start date and end date, but somehow it was not working
    // so adding a seperate handler for each, have to fix
    handleDayChangeStartDate = (selectedDay, modifiers, dayPickerInput) =>{
      const input = dayPickerInput.getInput();
      this.setState({
        selectedDay,
        isEmpty: !input.value.trim()
      });
      this.setState({
        startDate : input.value
      });

    }
    handleDayChangeEndDate = (selectedDay, modifiers, dayPickerInput) =>{
      const input = dayPickerInput.getInput();
      this.setState({
        selectedDay,
        isEmpty: !input.value.trim()
      });
      this.setState({
        endDate : input.value
      });

    }
    // Generates an file on pinata with the details that dont need to be stored
    // in the blockhain, but needed for front end
  generateIfps = async () => {
      //var self = this;
      // create content that need to be saved to pinata
      const JSONBody =
      {
        Address: this.state.address,
        Beds : this.state.beds,
        Baths : this.state.baths,
        SqtFeet : this.state.sqtFeet,
        Type: this.state.type,
        Heating : this.state.heating,
        Cooling : this.state.cooling,
        Parking : this.state.parking,
        Description : this.state.description,
        Images: this.state.imageUrl

      }

      //make pinata call, via netlify as have to keep the keys secret
      const pinataResponse =  await fetch('/.netlify/functions/pinata', {
                                method: "POST",
                                body: JSON.stringify({JSONBody})
                              }).then((res) => res.json());

      // check for sucess
      if (!pinataResponse.success) {
        this.setState({submitDisabled : 'false'})
        this.setState({error : "😢 Something went wrong while uploading your token details to IFPS."})
        return {
              success: false,
              status: "😢 Something went wrong while uploading your token details to IFPS"

          }
      }
      else {
      let ifpsHash = pinataResponse.pinataUrl;
      this.setState({ifpsHash : ifpsHash})
      this.generateTokenURI()
      }
  }

  generateTokenURI = async () => {
      //var self = this
      const JSONBody = {
        Address : this.state.address,
        startDate : this.state.startDate,
        endDate : this.state.endDate,
     }

     //make pinata call
     //const pinataResponse = await pinJSONToIPFS(body);
     //make pinata call
     const pinataResponse =  await fetch('/.netlify/functions/pinata', {
                               method: "POST",
                               body: JSON.stringify({JSONBody})
                             }).then((res) => res.json());

     if (!pinataResponse.success) {
        this.setState({submitDisabled : 'false'})
        this.setState({error : "😢 Something went wrong while uploading your tokenURI."})
         return {
             success: false,
             status: "😢 Something went wrong while uploading your tokenURI.",

         }
     }
     else {
       let tokenUri = pinataResponse.pinataUrl;

      this.setState({tokenUri : tokenUri})
      this.addListing()
      }

  }
  // handle all integer inputs
  handleIntegerChange = event => {
    // regex to check for integers
    const regexp = new RegExp(`^-?[0-9]*$`);
    const target = event.target;
    const value = target.value;
    const name = target.name;
    if (regexp.test(value))
    {
      this.setState({
        [name]: value
      });
    }
  }
  // handler for all inputs
  handleChange = event => {
    const {name, value} = event.target
    this.setState({
      [name]: value
    });

  }
// load data from blockhain
  loadBlockchainData = async() => {
    this.setState({properties: []})
    const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
    // get accounts
    this.setState({web3})

    const propertyManagerInstance = new web3.eth.Contract(PROPERTMANAGER_ABI, PROPERTMANAGER_ADDRESS)
    // save to state ?/
    this.setState({ propertyManagerInstance })
    let propertyCount;
    // get count of the properties on blockhain via web3
    try
    {
      propertyCount = await propertyManagerInstance.methods.getOwnerCount(this.state.account).call()
      // save count
      this.setState({ propertyCount })
    }
    catch (e) {
      this.setState({error: e.message})
      console.log("Error : ")
      console.log(e)
      }
    // loop and get each propertu details
    for (var i = 0; i < propertyCount; i++) {
      const index = await propertyManagerInstance.methods.ownerTokens(this.state.account, i).call()
      const property = await propertyManagerInstance.methods.getDetails(index).call()
      //save to state
      this.setState({
        properties: [...this.state.properties, property]
      })
    }

  }
  // add listner to when the account is changed.
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

  // Intalize web3,connect to wallet, add listner for change in account, load data
  async init()  {
    // intalize web3 with local ganache
    connectWallet();
    const {address, } = await getCurrentWalletConnected();
    this.addWalletListener();
    this.setState({account : address})
    this.loadBlockchainData()

  }

  UNSAFE_componentWillMount() {
  // intalize web3
    this.init();

}
  // add listing to blockchain
  addListing = async() => {
    var self = this;
    try {
      await this.state.propertyManagerInstance.methods.addListing(this.state.account,
                          this.state.address,
                          this.state.tokenUri,
                          this.state.ifpsHash,
                          this.state.rent,
                          moment(this.state.startDate).unix(),
                          moment(this.state.endDate).unix()).send({from: this.state.account, value: 100})
                          .then(function(receipt){
                              console.log(receipt);
                              self.init()
                              self.closeModal()
                          })
    } catch(error) {
      this.setState({ submitDisabled: false });
      this.setState({error: error.message})
      this.closeModal();
    }
  }
  setErrorMessage = (sErr) => {
    this.setState(prevState => ({
      errors: [...prevState.errors, sErr],
    }));

  }
  // validate the form
  validateForm = () =>
  {
    this.setState({errors : []})

    let isValid = true;
    // To do add validation via google
    if (this.state.address.trim() === "" || this.state.address.length < 10)
    {
      let sError = "Please enter a valid address";
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.rent.trim() === "" || Number(this.state.rent) < 1  )
    {
      let sError = "Please enter an rent (should be greater than 100)"
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.sqtFeet.trim() === "" || Number(this.state.sqtFeet) < 100  )
    {
      let sError = "Please enter a valid Sqfeet (should be greater than 100)"
      this.setErrorMessage(sError);
       isValid = false;
    }
    var dateReg = /^\d{2}[/]\d{2}[/]\d{4}$/

    if (this.state.startDate.trim() === "" || !dateReg.test(this.state.startDate.trim())  )
    {
      let sError = "Please enter a valid Start Date"
      this.setErrorMessage(sError);
       isValid = false;
    }
    if (this.state.endDate.trim() === "" || !dateReg.test(this.state.endDate)  )
    {
      let sError = "Please enter a valid End Date"
      this.setErrorMessage(sError);
       isValid = false;
    }

    if ( (moment(this.state.endDate) <= moment(this.state.startDate).add(8, "days"))  )
    {
      let sError = "The property has to be listed for atleast a  week"
      this.setErrorMessage(sError);
       isValid = false;
    }
    if (this.state.type === '' )
    {
      let sError = "Please select a Type";
      this.setErrorMessage(sError)
      isValid = false;
    }
    if (this.state.beds.trim() === "" || Number(this.state.beds) < 1  )
    {
      let sError = "Please enter the number of beds";
      this.setErrorMessage(sError)
       isValid = false;
    }

    if (this.state.baths.trim() === "" || Number(this.state.baths) < 1  )
    {
      let sError = "Please enter the number of baths";
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.parking === "" )
    {
      let sError = "Please select a Parking";
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.heating === "" )
    {
      let sError = "Please select a Heating";
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.cooling === "" )
    {
      let sError = "Please select a Cooling";
      this.setErrorMessage(sError)
       isValid = false;
    }


    var imageRegex = /(https?:\/\/.*\.(?:png|jpg|webp))/i
    if (this.state.imageUrl.trim() === "" || !imageRegex.test(this.state.imageUrl) )
    {
      let sError = "Please enter a valid Image URL";
      this.setErrorMessage(sError)
       isValid = false;
    }

    if (this.state.description.trim() === "" || this.state.description.length < 10)
    {
      let sError = "Please enter a description, should be atleast 10 characters";
      this.setErrorMessage(sError)
       isValid = false;
    }
    return isValid;

  }
  async handleSubmit(event) {
    event.preventDefault();


    if (this.validateForm())
    {
      try{
        this.setState({submitDisabled : true})
        this.generateIfps(this.state.pinataKey,this.state.pinataSecretKey);

        }
        catch(error){
          this.setState({errors : error.message});
          this.setState({submitDisabled : false});

        }

      }
    else {
      this.setState({submitDisabled : false});
    }
  }
  // open Modal
    openModal = () => {
        this.setState({ modalIsOpen: true });
        this.setState({submitDisabled : false})
    };
    // Close Modal
    closeModal = () => {
        this.setState({ modalIsOpen: false });
        this.setState({submitDisabled : false})
    };

  render() {
    return (
      <div id="addList">

        <p></p>
        <button onClick={this.openModal} className="blackSubmit"> Add Listing </button>
        <Modal isOpen={this.state.modalIsOpen} onRequestClose={this.closeModal}>
        <div>
          <form onSubmit={this.handleSubmit}>

            <table  width="99%" height="80%" cellSpacing="10" cellPadding="20" >
              <thead className="blackHeader">
                <tr>
                  <th align="left" colSpan="2"><div> Add Listings </div>
                  </th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th align="right"  >
                      <button onClick={() =>this.closeModal()} className="blackSubmit">X</button>
                  </th>
                </tr>
              </thead>
              <tbody>
              <tr>
                <td colSpan="6">
                <div>
                  <b> Please Note:  A service fee of 100 wei is charged for each property listing. </b>
                </div>

                { this.state.error.length > 0  &&
                    <div className="error">
                      ERROR : Please correct the errors and continue
                      <ul>
                      <li className="error" > {this.state.error} </li>
                      </ul>
                    </div> }
                </td>
              </tr>

                <tr>
                  <td colSpan="4">
                    { this.state.errors.length > 0  &&
                    <div className="error">
                     ERRORS : Please correct the errors and continue
                    <ul className="error">
                          { this.state.errors.length > 0 && this.state.errors.map((error => {
                            return (

                                <li>{error}</li>

                            )
                          }))
                        }
                  </ul>

                  </div>
                }
                  </td>
                </tr>
                <tr className="table_padding">
                  <td>
                    Address :
                  </td>
                  <td>
                    <input
                        id="address"
                        name="address"
                        type="text"
                        style={{width: "370px"}}
                        placeholder="Enter Address"
                        value={this.state.address}
                        onChange={this.handleChange}
                    />
                  </td>


                  <td>
                    Rent :
                  </td>
                  <td>
                    <input
                        id="rent"
                        name="rent"
                        type="text"
                        placeholder="Enter rent in wei"
                        value={this.state.rent}
                        onChange={this.handleIntegerChange}

                    />
                  </td>
                  <td>
                  SqtFeet :
                  </td>
                  <td>
                    <input
                        id="sqtFeet"
                        name="sqtFeet"
                        type="text"
                        placeholder="Enter SqtFeet"
                        value={this.state.sqtFeet}
                        onChange={this.handleIntegerChange}
                    />
                  </td>

                </tr>
                <tr cellPadding="10px">
                    <td>
                      Start Date :
                    </td>
                    <td>
                    <DayPickerInput
                      id="startDate"
                      name="startDate"
                      value={this.state.startDate}
                      formatDate={formatDate}
                      parseDate={parseDate}
                      placeholder={`${formatDate(new Date())}`}
                      onDayChange={this.handleDayChangeStartDate}

                    />
                      </td>
                    <td>
                      End Date :
                      </td>
                    <td>

                      <DayPickerInput
                        id="startDate"
                        name="startDate"
                        value={this.state.endDate}
                        formatDate={formatDate}
                        parseDate={parseDate}
                        placeholder={`${formatDate(new Date())}`}
                        onDayChange={this.handleDayChangeEndDate}
                        disabledDays = {[
                                {
                                  before: `{moment(this.state.startDate).add(8, "days").format("L")}`
                                },
                              ]}

                      />
                      </td>
                      <td>
                  Type :
                  </td>
                  <td>


                  <select id="type" name="type"
                      defaultValue={this.state.type}
                      onChange={this.handleChange}
                    >
                      <option value="" disabled>
                                Choose Type
                              </option>
                      <option value="Single Family">Single Family</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Condo">Condo</option>
                    </select>



                  </td>


                </tr>
                <tr className="table_padding">
                  <td>
                    Beds :
                  </td>
                  <td>
                    <input
                        id="beds"
                        name="beds"
                        type="text"
                        placeholder="Enter # of Beds"
                        value={this.state.beds}
                        onChange={this.handleIntegerChange}
                    />
                  </td>


                  <td>
                    Baths :
                  </td>
                  <td>
                    <input
                        id="baths"
                        name="baths"
                        type="text"
                        placeholder="Enter # of Baths"
                        value={this.state.baths}
                        onChange={this.handleIntegerChange}
                    />
                  </td>
                  <td>Parking</td>
                  <td>
                  <select id="parking" name="parking"
                      defaultValue={this.state.parking}
                      onChange={this.handleChange}
                    >
                      <option value="" disabled>
                                Choose Parking
                      </option>
                      <option value="No Parking space">No Parking Space</option>
                      <option value="1 Attached Garage space">1 Attached Garage space</option>
                      <option value="2 Attached Garage space">2 Attached Garage space</option>
                    </select>

                  </td>
                  </tr>


                  <tr>
                        <td> Heating</td>
                        <td>
                            <select id="heating" name="heating"
                            defaultValue={this.state.heating}
                            onChange={this.handleChange}
                            >
                              <option value="" disabled>
                                Choose Heating Type
                              </option>

                              <option value="Electric">Electric</option>
                              <option value="Gas">Gas</option>
                            </select>
                        </td>
                        <td> Cooling</td>
                        <td>
                            <select id="cooling" name="cooling"
                            defaultValue={this.state.cooling}
                            onChange={this.handleChange}
                            >
                              <option value="" disabled className="disabledOpt">
                                Choose Cooling Type
                              </option>
                              <option value="Electric">Electric</option>
                              <option value="Gas">Gas</option>
                            </select>
                        </td>

                        <td>
                            Image :
                          </td>
                          <td>
                            <input
                                id="imageUrl"
                                name="imageUrl"
                                type="text"
                                style={{width: "370px"}}
                                placeholder="Enter Image URL"
                                value={this.state.imageUrl}
                                onChange={this.handleChange}
                            />
                        </td>
                  </tr>
                  <tr>
                    <td>Description:</td>
                    <td colSpan="5">
                    <textarea
                    id="description" name="description"
                    placeholder="Enter Description"
                    onChange={this.handleChange}
                    rows={5}
                    cols={160}
                    />


                    </td>
                </tr>
                <tr>

                <td colSpan="4" align="right">

                  <button type="submit" className="blackSubmit" disabled={this.state.submitDisabled}>
                          Submit
                  </button>
                  </td>
                </tr>
              </tbody>
            </table>

          </form>
          </div>
        </Modal>
        <p></p>
        <main role="main" className="col-lg-12 d-flex justify-content-center">
                      <div id="loader" className="text-center">
                        <p className="text-center">Loading...{this.state.propertyCount}</p>
                      </div>
       </main>

        <div className="row">

          <MyProperties properties={this.state.properties} ></MyProperties>
        </div>

      </div>
    );
  }
}

export default AddListing;
