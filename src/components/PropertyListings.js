import React, { Component } from 'react'
import './PropertyListings.css'
import PropertyDetails from './PropertyDetails';
//import Workflow from './Workflow';
import moment from 'moment';
import AddRental from './AddRental';

// @ dev component to display all llistings 
// uses PropertyDetails to display the details from IPFS
// Displays the rent button via workflow componet

class PropertyListings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      properties: [],
      id : -1
    }
        
    }
       
    render() {
        return (
           <div id="listings">
            { this.props.properties.map((property, key) => {
              return(
                <div>
                  <table>
                  <tr className="bold">
                    <td>
                      <div >
                        Address : <span className="content">{property.pAddr} &nbsp;</span>
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
                    <td>
                        <AddRental propertyId={property.token_id} 
                          startDate={property.startAvailability} 
                          endDate={property.endAvailability} 
                          propertAddress={property.pAddr} 
                          rentFee={property.rentFee}
                          depositFee = {property.rentFee}
                          nonRefundableFee = {property.nonRefundableFee} />

                    </td>
                  </tr>
                  <tr>
                    <td colSpan="5">
                        <PropertyDetails ifpsUrl={property.ifps}  test="6" />
                    </td>
                    
                  </tr>  
              </table>

            </div>
              )
            })}
            
        </div>
       )
    }
  }    


export default PropertyListings;