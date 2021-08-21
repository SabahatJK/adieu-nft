import React, { useState, useEffect, useRef, useContext } from "react";
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
  getCurrentWalletConnected,
  extractBlockchainError //import here
} from "./connection.js"

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';

import { makeStyles } from '@material-ui/core/styles';
import WalletContext from './context';

//import ConnectContext from "./Conn"
//import {pinJSONToIPFS} from './pinata.js'

import PropertyListings from './PropertyListings';
import './PropertyListings.css'

import { PROPERTMANAGER_ABI, PROPERTMANAGER_ADDRESS } from '../config'

const useStyles = makeStyles((theme) => ({
  overrides: {
      MuiSelect: {
          root: {  //This can be referred from Material UI API documentation.
              width: '100px'
          },
      },
    MuiTableContainer: {
      root: {  //This can be referred from Material UI API documentation.

        width: '90%',
      }
    }
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  root: {
    '& > *': {
      margin: theme.spacing(1),
      width: '25ch',
    },
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  modal: {
   display: 'flex',
   alignItems: 'center',
   justifyContent: 'center',
 },
 paper: {
   backgroundColor: theme.palette.background.paper,
   border: '2px solid #000',
   boxShadow: theme.shadows[5],
   padding: theme.spacing(2, 4, 3),
 },

}));

// @dev Takes care adding a new listing
// charges 100 wei for each transaction
// creates an object in pinata for ifps and the tokenuri


function MyProperties(props)  {
  const defaultValues = {
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
    };
    const [walletAddress, setWallet] = useState("");
    const [formValues, setFormValues] = useState(defaultValues);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [propertyCount, setPropertyCount] = useState(-1);
    const[propertyManagerInstance, setPropertyManagerInstance] = useState(null);
    const [properties, setProperties] = useState([]);
    const myPropertiesRef = useRef(properties);

    const [ifpsUrl, setIfpsUrl]  = useState("");
    const [submitDisabled, setSubmitDisabled]  = useState(false);
    const [tokenUri, setTokenUri]  = useState("");
    const [error, setError]  = useState("");
    const [multipleErrors, setMultipleError]  = useState([]);
    const [counter, setSetCounter]  = useState(0);


    const [web3, setWeb3] = useState(null);
    const[bookingInstance, setBookingInstance] = useState(null);

    const classes = useStyles();
    const [openBackdrop, setOpenBackdrop] = useState(false);
    const[disabled, setDisabled] = useState("");
    const walletInfo = useContext(WalletContext);



  useEffect(() => {
    setWallet(walletInfo);
    loadProperyList(walletInfo);
  },[walletInfo, myPropertiesRef]);


    //const classes = useStyles();
    // handle the start date, should have had a single handler for
    // start date and end date, but somehow it was not working
    // so adding a seperate handler for each, have to fix
    const handleDayChangeStartDate = (selectedDay, modifiers, dayPickerInput) =>{
      const input = dayPickerInput.getInput();
      /*this.setState({
        selectedDay,
        isEmpty: !input.value.trim()
      });

      */
      setFormValues({
        ...formValues,
        startDate: input.value,
      });
    }
    const handleDayChangeEndDate = (selectedDay, modifiers, dayPickerInput) =>{
      const input = dayPickerInput.getInput();
      /*this.setState({
        selectedDay,
        isEmpty: !input.value.trim()
      });
      this.setState({
        endDate : input.value
      });*/
      setFormValues({
        ...formValues,
        endDate: input.value,
      });


    }

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormValues({
        ...formValues,
        [name]: value,
      });
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormValues({
        ...formValues,
        [name]: value,
      });
    };
    // handle all integer inputs
    const handleIntegerChange = event => {
      // regex to check for integers
      const regexp = new RegExp(`^-?[0-9]*$`);
      const target = event.target;
      const value = target.value;
      const name = target.name;
      if (regexp.test(value))
      {
        setFormValues({
          ...formValues,
          [name]: value,
        });
      }
    }
    const handleSubmit =  async (event) => {
      event.preventDefault();
      setMultipleError([]);
      if (validateForm())
      {
        try{
          setSubmitDisabled(true);
          generateIfps();

          }
          catch(error){
            setErrorMessage(error.message);
            setSubmitDisabled(false);

          }

        }
      else {

        setSubmitDisabled(false);
      }
    }

    // Generates an file on pinata with the details that dont need to be stored
    // in the blockhain, but needed for front end
  async function generateIfps()  {
      setSubmitDisabled(false);
      // create content that need to be saved to pinata
      const JSONBody =
      {
        Address: formValues.address,
        Beds : formValues.beds,
        Baths : formValues.baths,
        SqtFeet : formValues.sqtFeet,
        Type: formValues.type,
        Heating : formValues.heating,
        Cooling : formValues.cooling,
        Parking : formValues.parking,
        Description : formValues.description,
        Images: formValues.imageUrl
      }

      //make pinata call, via netlify as have to keep the keys secret
      const pinataResponse =  await fetch('/.netlify/functions/pinata', {
                                method: "POST",
                                body: JSON.stringify({JSONBody})
                              }).then((res) => res.json());

      // check for sucess
      if (!pinataResponse.success) {
        setSubmitDisabled(false);
        setError(pinataResponse.message)
        return {
              success: false,
              status: pinataResponse.message

          }
      }
      else {
      let ifpsHash = pinataResponse.pinataUrl;
      setIfpsUrl(ifpsHash)
      generateTokenURI()
      }
  }

  async function generateTokenURI()  {
      //var self = this
      const JSONBody = {
        Address : formValues.address,
        startDate : formValues.startDate,
        endDate : formValues.endDate,
     }
     //make pinata call
     //const pinataResponse = await pinJSONToIPFS(body);
     //make pinata call
     const pinataResponse =  await fetch('/.netlify/functions/pinata', {
                               method: "POST",
                               body: JSON.stringify({JSONBody})
                             }).then((res) => res.json());

     if (!pinataResponse.success) {
         setSubmitDisabled(false);
         setError(pinataResponse.message)
         return {
             success: false,
             status: pinataResponse.message,

         }
     }
     else {
       let tokenUri = pinataResponse.pinataUrl;
       setTokenUri(tokenUri);
       addListing()
      }
  }
// load data from blockhain
  async function loadProperyList (address) {
    //setProperties([]);

    const web3 = new Web3(Web3.givenProvider || "http://localhost:8545")
    setWeb3(web3);
    // get accounts

    const propertyManagerInstance = new web3.eth.Contract(PROPERTMANAGER_ABI, PROPERTMANAGER_ADDRESS)
    // save to state ?/
    setPropertyManagerInstance(propertyManagerInstance);
    let propertyCount;
    // get count of the properties on blockhain via web3
    try
    {
      propertyCount = await propertyManagerInstance.methods.getOwnerCount(address).call()
      // save count
      setPropertyCount(propertyCount);
    }
    catch (error) {
      let sError = extractBlockchainError(error.message);
      setError("Deposit  @ : " + sError);
      console.log(error)
      }
    var newProperties = [];
    // loop and get each propertu details
    for (var i = 0; i < propertyCount; i++) {
      const index = await propertyManagerInstance.methods.ownerTokens(address, i).call({from : address});
      const property = await propertyManagerInstance.methods.getDetails(index).call({from : address});
      newProperties = newProperties.concat( property);
      setSetCounter(i);
      setProperties(newProperties);
    }

  }

  // add listing to blockchain
  async function addListing() {

    setSubmitDisabled(true);
    setOpenBackdrop(true);
    try {
      await propertyManagerInstance.methods.addListing(walletInfo,
                          formValues.address,
                          tokenUri,
                          ifpsUrl,
                          formValues.rent,
                          moment(formValues.startDate).unix(),
                          moment(formValues.endDate).unix()).send({from: walletAddress, value: 100})
                          .then(function(receipt){
                              console.log(receipt);
                              closeModal()
                              const property = {};
                              property.pAddr = formValues.pAddr;
                              property.rentFee = formValues.rent;
                              property.depositFee = formValues.deposit;
                              property.nonRefundableFee = formValues.nonRefundableFee;
                              property.startAvailability = formValues.startDate;
                              property.endAvailability = formValues.endDate;
                              property.ifps = formValues.ifpsUrl;
                              properties.concat(property);
                              setProperties(properties);
                              PropertyListings.forceUpdate();

                          })


    } catch(error) {
      let sError = extractBlockchainError(error.message);
      setError("Add Listing  @ : " + sError);
      //closeModal();
    }
    finally{
      setOpenBackdrop(false);
      setSubmitDisabled(false);
    }
  }

  function setErrorMessage(sErr) {

    setMultipleError([...multipleErrors, sErr]);

    }

    //this.setState(prevState => ({
  //    errors: [...prevState.errors, sErr],
  //  }));


  // validate the form
  function validateForm() {
    let isValid = true;
    // To do add validation via google
    if (formValues.address.trim() === "" || formValues.address.length < 10)
    {
      let sError = "Please enter a valid address";
      setErrorMessage(sError);
      isValid = false;
    }
    if (formValues.rent.trim() === "" || Number(formValues.rent) < 1  )
    {
      let sError = "Please enter an rent (should be greater than 100)"
      setErrorMessage(sError);
      isValid = false;
    }
    if (formValues.sqtFeet.trim() === "" || Number(formValues.sqtFeet) < 100  )
    {
      let sError = "Please enter a valid Sqfeet (should be greater than 100)"
      setErrorMessage(sError);
      isValid = false;
    }
    var dateReg = /^\d{2}[/]\d{2}[/]\d{4}$/

    if (formValues.startDate.trim() === "" || !dateReg.test(formValues.startDate.trim())  )
    {
      let sError = "Please enter a valid Start Date"
      setErrorMessage(sError);
      isValid = false;
    }
    if (formValues.endDate.trim() === "" || !dateReg.test(formValues.endDate)  )
    {
      let sError = "Please enter a valid End Date"
      setErrorMessage(sError);
      isValid = false;
    }

    if ( (moment(formValues.endDate) <= moment(formValues.startDate).add(8, "days"))  )
    {
      let sError = "The property has to be listed for atleast a  week"
      setErrorMessage(sError);
      isValid = false;
    }
    if (formValues.type === '' )
    {
      let sError = "Please select a Type";
      setErrorMessage(sError);
      isValid = false;
    }
    if (formValues.beds.trim() === "" || Number(formValues.beds) < 1  )
    {
      let sError = "Please enter the number of beds";
      setErrorMessage(sError);
      isValid = false;
    }

    if (formValues.baths.trim() === "" || Number(formValues.baths) < 1  )
    {
      let sError = "Please enter the number of baths";
      setErrorMessage(sError);
      isValid = false;
    }
    if (formValues.parking === "" )
    {
      let sError = "Please select a Parking";
      setErrorMessage(sError);
      isValid = false;
    }
    if (formValues.heating === "" )
    {
      let sError = "Please select a Heating";
      setErrorMessage(sError);
      isValid = false;
    }
    if (formValues.cooling === "" )
    {
      let sError = "Please select a Cooling";
      setErrorMessage(sError);
      isValid = false;
    }


    var imageRegex = /(https?:\/\/.*\.(?:png|jpg|webp))/i
    if (formValues.imageUrl.trim() === "" || !imageRegex.test(formValues.imageUrl) )
    {
      let sError = "Please enter a valid Image URL";
      setErrorMessage(sError);
      isValid = false;
    }

    if (formValues.description.trim() === "" || formValues.description.length < 10)
    {
      let sError = "Please enter a description, should be atleast 10 characters";
      setErrorMessage(sError);
      isValid = false;
    }
    alert(isValid);
    return isValid;

  };
  // open Modal
  function openModal() {
        setMultipleError([]);
        setError("");
        setModalIsOpen(true);
        setSubmitDisabled(false);
    };
    // Close Modal
  function closeModal() {
        setModalIsOpen(false);
        setSubmitDisabled(false);
    };


    return (
      <div id="addList">

        <br/>
        <Button variant="contained" onClick={openModal}>Add Listing</Button>

        <br/>
        <Dialog open={modalIsOpen}
          aria-labelledby="form-dialog-title"
          fullWidth={"lg"}
          maxWidth={"lg"}
        >
        <DialogContent>
        <Backdrop className={classes.backdrop} open={openBackdrop}>
          <CircularProgress color="inherit" />
        </Backdrop>


        <div>
          <form  onSubmit={handleSubmit} method="POST" >

            <table height="90%" cellSpacing="10" cellPadding="20" >
              <thead className="blackHeader">
                <tr>
                <td colSpan="8" text-align="center">
                  <div className="float-container">
                  <div align="left" className="float-child">Add Listing </div>
                  </div>
                </td>
                </tr>
              </thead>
              <tbody>
              <tr>
                <td colSpan="6">
                <div>
                  <b> Please Note:  A service fee of 100 wei is charged for each property listing. </b>
                </div>

                { error.length > 0  &&
                    <div className="error">
                      ERROR : Please correct the errors and continue
                      <ul>
                      <li className="error" > {error} </li>
                      </ul>
                    </div> }
                </td>
              </tr>

                <tr>
                  <td colSpan="4">

                    { multipleErrors.length > 0  &&
                    <div className="error">
                     ERRORS : Please correct the errors and continue
                     <ul className="error">
                          { multipleErrors.map((err => {
                            return (

                                <li>{err}</li>

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
                        value={formValues.address}
                        onChange={handleChange}
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
                        value={formValues.rent}
                        onChange={handleIntegerChange}

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
                        value={formValues.sqtFeet}
                        onChange={handleIntegerChange}
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
                      formatDate={formatDate}
                      value={formValues.startDate}
                      parseDate={parseDate}
                      placeholder={`${formatDate(new Date())}`}
                      onDayChange={handleDayChangeStartDate}

                    />
                      </td>
                    <td>
                      End Date :
                      </td>
                    <td>

                      <DayPickerInput
                        id="startDate"
                        name="startDate"
                        value={formValues.endDate}
                        formatDate={formatDate}
                        parseDate={parseDate}
                        placeholder={`${formatDate(new Date())}`}
                        onDayChange={handleDayChangeEndDate}
                        disabledDays = {[
                                {
                                  before: `{moment(formValues.startDate).add(8, "days").format("L")}`
                                },
                              ]}

                      />
                      </td>
                      <td>
                  Type :
                  </td>
                  <td>


                  <select id="type" name="type"
                      onChange={handleChange}
                      defaultValue={formValues.type}
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
                        value={formValues.beds}
                        onChange={handleIntegerChange}
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
                        value={formValues.baths}
                        onChange={handleIntegerChange}
                    />
                  </td>
                  <td>Parking</td>
                  <td>
                  <select id="parking" name="parking"
                      defaultValue={formValues.parking}
                      onChange={handleChange}
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
                            onChange={handleChange}
                            defaultValue={formValues.heating}
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
                            defaultValue={formValues.cooling}
                            onChange={handleChange}
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
                                style={{width: "250px"}}
                                placeholder="Enter Image URL"
                                value={formValues.imageUrl}
                                onChange={handleChange}
                            />
                        </td>
                  </tr>
                  <tr>
                    <td>Description:</td>
                    <td colSpan="5">
                    <textarea
                    id="description" name="description"
                    placeholder="Enter Description"
                    defaultValue={formValues.descroption}
                    onChange={handleChange}
                    rows={5}
                    cols={130}
                    />


                    </td>
                </tr>
                <tr>

                <td colSpan="6" align="right">
                  <hr/>
                  <DialogActions>

                    <Button type="submit" variant="contained" disabled={submitDisabled}>
                            Submit
                    </Button>
                    <div>
                      <Button variant="contained" onClick={closeModal}>Close</Button>
                    </div>

                  </DialogActions>
                  </td>
                </tr>
              </tbody>

            </table>

          </form>
          </div>
          </DialogContent>

         </Dialog>

        <br/>
        <main role="main" className="col-lg-12 d-flex justify-content-center">
                      <div id="loader" className="text-center">
                        <p className="text-center">Loading...{counter}</p>
                      </div>
       </main>
       <br/>

        <div className="row">

          <PropertyListings properties={properties} showButtons={false} ></PropertyListings>
        </div>

      </div>
    );

}

export default MyProperties;
