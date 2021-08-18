import React, { Component } from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
import moment from 'moment';

import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';

import
import MomentLocaleUtils, {
  formatDate,
  parseDate,
} from 'react-day-picker/moment';


import Web3 from 'web3'


import MyProperties from './MyProperties';
import './PropertyListings.css'

import { PROPERTMANAGER_ABI, PROPERTMANAGER_ADDRESS } from '../config'

// @dev Takes care of the whole rental process/workflow
// first is the charging of non refundable fee
// then comes charging the deposit
// finally the rent

class MyListings extends Component {

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
          errors: []
        };
      this.handleSubmit = this.handleSubmit.bind(this);
      //this.handleDayChange  = this.handleDayChange(this);
      //this.handleIntegerChange = this.handleIntegerChange(this);
      //this.handleChange = this.handleChange(this);

    };

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

    generateIfps = async (pinataApiKey, pinataSecretApiKey) => {
      var self = this;
      const body =
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

      const pinata = pinataClient(pinataApiKey, pinataSecretApiKey);
      this.setState({pinata})
      pinata.testAuthentication().then((result) => {
          //handle successful authentication here

          console.log(result);
      }).catch((err) => {
          //handle error here
          console.log(err);
      })

      const options = {
        pinataMetadata: {
            name: this.state.address,
        },
        pinataOptions: {
            cidVersion: 0
        }
    };

      pinata.pinJSONToIPFS(body, options).then((result) => {
          //handle results here
          console.log(result);
            self.setState({ifpsHash : result["IpfsHash"]})
            self.generateTokenURI()
      }).catch((err) => {
          //handle error here
          alert("Error Occured : " + error.message);
          console.log(err);
      });



    }

    generateTokenURI = async () => {
      var self = this
      const body = {
        Address : this.state.address,
        startDate : this.state.startDate,
        endDate : this.state.endDate,
     }

     const pinata = this.state.pinata

     const options = {
       pinataMetadata: {
           name: 'Property Token ' + this.state.address,
       },
       pinataOptions: {
           cidVersion: 0
       }
   };

     pinata.pinJSONToIPFS(body, options).then((result) => {
         //handle results here
         console.log(result);
           self.setState({tokenUri : result["IpfsHash"]})
           self.addListing()
     }).catch((err) => {
         //handle error here
         alert("Error Occured : " + error.message);
         console.log(err);
     });


    }

    handleIntegerChange = event => {
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

    handleChange = event => {
      const {name, value} = event.target
      this.setState({
        [name]: value
      });

    }

    // Intalize web3
    async init()  {
      // intalize web3 with local ganache
      const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
      // get accounts
      const accounts = await web3.eth.getAccounts()
      // Set State
      this.setState({web3})
      this.setState({ account: accounts[0] })


      const propertyManagerInstance = new web3.eth.Contract(PROPERTMANAGER_ABI, PROPERTMANAGER_ADDRESS)
      // save to state ?/
      this.setState({ propertyManagerInstance })
      // get count of the properties on blockhain via web3
      const propertyCount = await propertyManagerInstance.methods.getOwnerCount(accounts[0]).call()

      // save count
      this.setState({ propertyCount })
      // loop and get each propertu details
      for (var i = 0; i < propertyCount; i++) {
        const index = await propertyManagerInstance.methods.ownerTokens(accounts[0], i).call()
        const property = await propertyManagerInstance.methods.getDetails(index).call()
        //save to state
        this.setState({
          properties: [...this.state.properties, property]
        })
      }

    }
  componentWillMount() {
    // intalize web3
    this.init();

  }

  addListing = async() => {
    var self = this;
    await this.state.propertyManagerInstance.methods.addListing(this.state.account,
                        this.state.address,
                        "https://ipfs.io/ipfs/" + this.state.tokenUri,
                        "https://ipfs.io/ipfs/" + this.state.ifpsHash,
                        this.state.rent,
                        moment(this.state.startDate).unix(),
                        moment(this.state.endDate).unix()).send({from: this.state.account, value: 100}).then(function(receipt){
                            console.log(receipt);
                            self.init()
                            self.closeModal()
                        })


  }
  setErrorMessage = (sErr) => {
    this.setState(prevState => ({
      errors: [...prevState.errors, sErr],
    }));

  }
  validateForm = () =>
  {
    this.setState({errors : []})

    let isValid = true;
    // To do add validation via google
    if (this.state.address.trim() == "" || this.state.address.length < 10)
    {
      let sError = "Please enter a valid address";
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.rent.trim() == "" || Number(this.state.rent) < 1  )
    {
      let sError = "Please enter an rent (should be greater than 100)"
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.sqtFeet.trim() == "" || Number(this.state.sqtFeet) < 100  )
    {
      let sError = "Please enter a valid Sqfeet (should be greater than 100)"
      this.setErrorMessage(sError);
       isValid = false;
    }
    var dateReg = /^\d{2}[/]\d{2}[/]\d{4}$/

    if (this.state.startDate.trim() == "" || !dateReg.test(this.state.startDate.trim())  )
    {
      let sError = "Please enter a valid Start Date"
      this.setErrorMessage(sError);
       isValid = false;
    }
    if (this.state.endDate.trim() == "" || !dateReg.test(this.state.endDate)  )
    {
      let sError = "Please enter a valid End Date"
      this.setErrorMessage(sError);
       isValid = false;
    }
    var sDate = new Date(this.state.startDate);
    var eDate = new Date(this.state.endDate);
    if ( sDate >= eDate )
    {
      let sError = "End Availibility Date should be latter than Start Date"
      this.setErrorMessage(sError);
       isValid = false;
    }
    if (this.state.type == '' )
    {
      let sError = "Please select a Type";
      this.setErrorMessage(sError)
      isValid = false;
    }
    if (this.state.beds.trim() == "" || Number(this.state.beds) < 1  )
    {
      let sError = "Please enter the number of beds";
      this.setErrorMessage(sError)
       isValid = false;
    }

    if (this.state.baths.trim() == "" || Number(this.state.baths) < 1  )
    {
      let sError = "Please enter the number of baths";
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.parking == "" )
    {
      let sError = "Please select a Parking";
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.heating == "" )
    {
      let sError = "Please select a Heating";
      this.setErrorMessage(sError)
       isValid = false;
    }
    if (this.state.cooling == "" )
    {
      let sError = "Please select a Cooling";
      this.setErrorMessage(sError)
       isValid = false;
    }


    var imageRegex = /(https?:\/\/.*\.(?:png|jpg|webp))/i
    if (this.state.imageUrl.trim() == "" || !imageRegex.test(this.state.imageUrl) )
    {
      let sError = "Please enter a valid Image URL";
      this.setErrorMessage(sError)
       isValid = false;
    }

    if (this.state.description.trim() == "" || this.state.description.length < 10)
    {
      let sError = "Please enter a description, should be atleast 10 characters";
      this.setErrorMessage(sError)
       isValid = false;
    }
    var minlength = 19

    var keyRegex = /^[0-9a-z]{20}$/
    if (!keyRegex.test(this.state.pinataKey) )
    {
      let sError = "Please enter a valid Pinata Key";
      this.setErrorMessage(sError)
       isValid = false;
    }
    var keyRegex = /^[0-9a-z]{64}$/
    if (!keyRegex.test(this.state.pinataSecretKey) )
    {
      let sError = "Please enter a valid Pinata Secret Key";
      this.setErrorMessage(sError)
       isValid = false;
    }

    return isValid;

  }
  async handleSubmit(event) {
    event.preventDefault();

    //if (this.state.address.trim == "")
    //{
    //    this.lblError.value = "<br> Please enter an address"
    //}
    //if (this.state.pinataKey != '' &&  this.state.pinataSecretKey != '')
    if (this.validateForm())
      this.generateIfps(this.state.pinataKey,this.state.pinataSecretKey);

  }
  // open Modal
    openModal = () => {
        this.setState({ modalIsOpen: true });
    };
    // Close Modal
    closeModal = () => {
        this.setState({ modalIsOpen: false });
    };

  render() {
    return (
      <div>
        <p></p>
        <button onClick={this.openModal} className="blackSubmit"> Add Listing </button>
        <Modal isOpen={this.state.modalIsOpen} onRequestClose={this.closeModal}>
        <div>

        <form onSubmit={this.handleSubmit}>

          <table  width="99%" height="80%" cellSpacing="10" cellPadding="20" >

            <tr className="blackHeader">
              <td align="left" colSpan="2"><div> Add Listings </div>
              </td>
              <td></td>
              <td></td>
              <td align="right"  colSpan="2">
                  <button onClick={this.closeModal}>X</button>
              </td>
            </tr>
            <tr>
              <td colSpan="4">
                <>
                <ul>
              {this.state.errors.map((error => {
                return (
                    <li>{error}</li>

                )
              }))
            }
              </ul>

              </>
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
                <td>
                  Pinata Key
                </td>
                <td colSpan="2">
                  <input
                    id="pinataKey"
                    name="pinataKey"
                    type="password"
                    style={{width: "370px"}}
                    placeholder="Enter Pinata Key"
                    value={this.state.pinataKey}
                    onChange={this.handleChange}
                />
                </td>
                <td>
                  Pinata Secret Key
                </td>
                <td colSpan="2">
                  <input
                    id="pinataSecretKey"
                    name="pinataSecretKey"
                    type="password"
                    style={{width: "370px"}}
                    placeholder="Enter Pinata Secret Key"
                    value={this.state.pinataSecretKey}
                    onChange={this.handleChange}
                />
                </td>
            </tr>
            <tr>

             <td colSpan="4" align="right">

               <button type="submit" className="blackSubmit">
                      Submit
              </button>
              </td>
            </tr>

            </table>

         </form>
         </div>
        </Modal>
        <div className="row">
          <MyProperties properties={this.state.properties} ></MyProperties>
        </div>

      </div>
    );
  }
}

export default MyListings;
