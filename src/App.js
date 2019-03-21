import React, { Component } from 'react'
import './App.css'

import Amplify, {Auth, PubSub} from 'aws-amplify'

import awsconfig from './aws-exports'

import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsiot from './aws-iot'

import AWS from 'aws-sdk'


// retrieve temporary AWS credentials and sign requests
Auth.configure(awsconfig);

Amplify.configure(awsconfig);
Amplify.addPluggable( new AWSIoTProvider(awsiot) )

PubSub.configure()


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      things: [],
      messages: [],
      metrics: []
    }

    this.handleTopicMessage = this.handleTopicMessage.bind(this)

    Auth.currentCredentials()
      .then(credentials => console.log(credentials))
    
    AWS.config.update({
      region: awsconfig.aws_cognito_region,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: awsconfig.aws_cognito_identity_pool_id
      })
    })

    var iot = new AWS.Iot()
    iot.listThings({
    }, (err, data) => {
      if (err) console.log(err)
      else {
        console.log(data)
        this.setState({
          things: data.things
        })
      }
    })
    
    PubSub.subscribe('freertos/demos/sensors/#').subscribe({
      next: data => this.handleTopicMessage(data.value),
      error: error => console.log(error),
      close: () => console.log('Done')
    })
    
  }
  
  handleTopicMessage(message) {
    console.log("handling message", message)
    
    this.setState({
      messages: [message, ...this.state.messages.slice(0, 9)],
      metrics: [...new Set([...this.state.metrics, ...Object.keys(message)])]
    })
  }

  render() {
    return (
      <div className="App">

        <div>
 
          <br />
          <table>
            <thead>
              <tr>
                {this.state.metrics.map((m, j) => {return(<td key={j}>{m}</td>)})}
              </tr>
            </thead>
            <tbody>
              {this.state.messages.map((t,i) => {return(<tr key={i}>{this.state.metrics.map((m, j) => {return(<td key={j}>{t[m]}</td>)})}</tr>)})}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default App;