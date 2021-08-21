//import react
import React, { useState, useLayoutEffect } from "react";
import Link from "@material-ui/core/Link";
import { BrowserRouter as Router, Route, Link as RouterLink, Switch, Redirect } from "react-router-dom";
import { WalletProvider } from './components/context'
//import { AppContext } from './context';

import {
  connectWallet,
  getCurrentWalletConnected  //import here
} from "./components/connection.js";

/*//import router
import {
  BrowserRouter as Router,
  Route,
  //Link,
  Switch,
  Redirect
} from 'react-router-dom';
*/
import Header from './components/Header';
import Footer from './components/Footer';
import About from './components/About';
import Rental from './components/Rental';
import MyProperties from './components/MyProperties';
import MyRentals from './components/MyRentals';
import FastForward from './components/FastForward';
import './App.css';

//import { ConnectionProvider } from "./connectContext.js";
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));




//window.ethereum.on('accountsChanged', handleAccountsChanged);

function App() {


   //State variables
   const [walletAddress, setWallet] = useState("");
   const [status, setStatus] = useState("");
   //const [networkId, setNetworkId] = useState("");
   const [networkName, setNetworkName] = useState("");
   const classes = useStyles();
   const walletInfo = {
       walletAddress: "",
       networkId : ""
   }

   useLayoutEffect(() => {

     function addNetworkListner() {
       if (window.ethereum) {
          window.ethereum.on('chainChanged', function(networkId){

            if (networkId.length > 0) {
               connectWalletPressed();
             };
           });
         }
     };
     // detect account  change and connect to new network
     function addWalletListener() {
       if (window.ethereum) {
         window.ethereum.on("accountsChanged", (accounts) => {
           if (accounts.length > 0) {
             connectWalletPressed();
           };
         });
       };
     };
     async function connectToNetwork() {

        const {address, status, networkId, networkName } = await getCurrentWalletConnected();
        setWallet(address);
        setStatus(status);
        setWallet(address);
        //setNetworkId(networkId);
        setNetworkName(networkName);

      };
    connectToNetwork();
     addWalletListener();
     addNetworkListner();
   }, [] );


// detect Network  change and connect to new network



const connectWalletPressed = async () => {
  const walletResponse = await connectWallet();
  setStatus(walletResponse.status);
  setWallet(walletResponse.address);
  //setNetworkId(walletResponse.networkId);
  setNetworkName(walletResponse.networkName);
};


 return (
      <div className="main" align="center">
        <Header/>

        <div align="center">
          <br/>
          <Button variant="outlined" onClick={connectWalletPressed} color="inherit">
            {(networkName.length >0 && walletAddress.length > 0) ? (
              " Connected: " +
              String(networkName) +
              " : " +
              String(walletAddress).substring(0, 6) +
              "..." +
              String(walletAddress).substring(38)
            ) : (
              <span>Connect Wallet</span>
            )}

          </Button>
          <div>
            {status}
        </div>
        <br/>
      </div>
      <br/>
      <WalletProvider value={walletAddress}>
          <Router>
                <div className="nav"  align="center">
                      <div className="navigationItem">
                        <Link component={RouterLink} to="/About"> About

                        </Link>
                      </div>
                    <div className="navigationItem">
                      <Link component={RouterLink} to="/Rental">Rent a Property? </Link>
                    </div>
                    <div className="navigationItem">

                    <Link component={RouterLink} to="/MyProperties">
                      My Properties
                    </Link>
                    </div>
                    <div className="navigationItem">
                      <Link component={RouterLink} to="/MyRentals">
                        My Rentals
                      </Link>
                    </div>
                </div>
              <Switch>
                <Route exact path="/">
                  <Redirect to="/About" />
                </Route>
                <Route exact path='/About' >
                    <About account={walletAddress} />
                </Route>
                <Route exact path='/MyProperties' >
                  <MyProperties account={walletAddress}/>
                </Route>
                <Route exact path='/Rental' component={Rental}></Route>
                <Route exact path='/MyRentals' component={MyRentals}></Route>
                <Route exact path='/FastForward' component={FastForward}></Route>
              </Switch>

         </Router>
       </WalletProvider>
      <Footer></Footer>
    </div>
  );
  };



export default App;
