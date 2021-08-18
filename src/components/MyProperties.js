import React, { Component } from 'react'
import './PropertyListings.css'
import PropertyDetails from './PropertyDetails';
import moment from 'moment';
import PropertyRentals from './PropertyRentals';

// @ dev component to display all llistings
// uses PropertyDetails to display the details from IPFS
// Displays the rent button via workflow componet

class MyProperties extends Component {
  constructor(props) {
    super(props);
    this.state = {
      properties: [],
      id : -1,

    }

  }
  togglePanel = (event, elm,  isOpen) => {
    const Open = isOpen
    var change = {};
    change[elm] = isOpen;
    this.setState(change);
    }

  handleClick= (id) => {
      this.setState((prevState => ({...prevState, [id]: !prevState[id]})));
  }
    render() {
      return (
         <div id="listings">
          { this.props.properties.map((property, key) => {
            return(
              <div key={property.token_id}>
                <table>
                <tbody>
                <tr className="bold">
                  <td>
                    <div >
                      Address : <span className="content">{property.pAddr} &nbsp;</span>
                    </div>
                  </td>
                  <td>
                    <div >
                      Token Address : <span className="content">{property.token} &nbsp;</span>
                    </div>
                  </td>
                  <td>
                    <div >
                      Rent: <span className="content">{(property.rentFee/ 1000000000000000000).toFixed(3)} eth </span>
                    </div>
                  </td>
                  <td>
                    <div >
                      Deposit: <span className="content">{(property.depositFee/ 1000000000000000000).toFixed(3)} eth </span>
                    </div>
                  </td>
                  <td>
                  <div >
                    Non Refundable Fee: <span className="content">{(property.nonRefundableFee/ 1000000000000000000).toFixed(3)} eth </span>
                    </div>

                  </td>
                  <td>
                  <div >
                    Availability : <span className="content">
                    {moment.unix(property.startAvailability).format('L')}
                          </span> -
                    <span className="content">
                    {moment.unix(property.endAvailability).format('L')}
                      </span>
                    <br>
                    </br>
                    </div>

                  </td>

                </tr>
                <tr>
                  <td colSpan="5">
                      <PropertyDetails ifpsUrl={property.ifps}  test="6" />
                  </td>

                </tr>
                <tr>
                  <td colSpan="5">

                  <div>
                    <PropertyRentals propertyId={property.token_id} />
                  </div>

                  </td>

                </tr>
                </tbody>
            </table>

          </div>
            )
          })}

      </div>
     )
  }
}



export default MyProperties;
