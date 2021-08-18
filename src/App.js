//import react
import { useEffect, useState } from "react";
import {
  connectWallet,
  getCurrentWalletConnected, ConnectProvider  //import here
} from "./components/connection.js";

//import router
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch,
  Redirect
} from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import About from './components/About';
import Rental from './components/Rental';
import AddListing from './components/AddListing';
import MyRentals from './components/MyRentals';
import FastForward from './components/FastForward';


//import { ConnectionProvider } from "./connectContext.js";


import './App.css'

//window.ethereum.on('accountsChanged', handleAccountsChanged);

function App() {


   //State variables
   const [walletAddress, setWallet] = useState("");
   const [status, setStatus] = useState("");
   const [networkId, setNetworkId] = useState("");
   const [networkName, setNetworkName] = useState("");

   useEffect(async () => {
    const {address, status, networkId, networkName } = await getCurrentWalletConnected();
    setWallet(address);
    setStatus(status);
    setNetworkId(networkId);
    setNetworkName(networkName);
    addWalletListener();
    addNetworkListner();
  }, []);

// detect Network  change and connect to new network
function addNetworkListner() {
  if (window.ethereum) {
     window.ethereum.on('networkChanged', function(networkId){

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

const connectWalletPressed = async () => {
  const walletResponse = await connectWallet();
  setStatus(walletResponse.status);
  setWallet(walletResponse.address);
  setNetworkId(walletResponse.networkId);
  setNetworkName(walletResponse.networkName);
};

 return (
      <div className="main">
        <Header/>

        <div align="center">
          <br/>
          <button id="walletButton" onClick={connectWalletPressed} className="blackSubmit" >
            {(networkName.length >0 && walletAddress.length > 0) ? (
              String(networkName) +
              " : Connected: " +
              String(walletAddress).substring(0, 6) +
              "..." +
              String(walletAddress).substring(38)
            ) : (
              <span>Connect Wallet</span>
            )}
          </button>
          <div>
            {status}
        </div>
        <br/>
      </div>
      <nav>
        <ConnectProvider value={walletAddress}>
          <Router>
            <div className="navigation"  align="center">
              <table width="50%" align="center">
                <tr>
                    <td>
                      <Link to="/About">About Us</Link>
                    </td>
                    <td>
                    <Link to="/Rental">Want to rent?</Link>
                    </td>
                    <td>
                    <Link to="/AddListing">Want to List a Property?</Link>
                    </td>
                    <td>
                    <Link to="/MyRentals">My Rentals</Link>
                    </td>

                </tr>
              </table>
            <Switch>
                <Route exact path="/">
                  <Redirect to="/About" />
                </Route>
                <Route exact path='/About' component={About}></Route>
                <Route exact path='/AddListing' component={AddListing}></Route>
                <Route exact path='/Rental' component={Rental}></Route>
                <Route exact path='/MyRentals' component={MyRentals}></Route>
                <Route exact path='/FastForward' component={FastForward}></Route>

              </Switch>
            </div>
         </Router>
       </ConnectProvider>
       </nav>
      <Footer></Footer>
    </div>
  );
  };



export default App;
