import React, { Component } from 'react'
import logo from './logo.svg'
import './App.css'

import Amplify, {Auth, PubSub} from 'aws-amplify'

import awsconfig from './aws-exports'

import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsiot from './aws-iot'

import AWS from 'aws-sdk'


// retrieve temporary AWS credentials and sign requests
Auth.configure(awsconfig);
// send analytics events to Amazon Pinpoint
// Analytics.configure(awsconfig);

Amplify.configure(awsconfig);
Amplify.addPluggable( new AWSIoTProvider(awsiot) )

PubSub.configure()


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      things: [],
      messages: []
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
      next: data => {
        console.log('Message received', data)
        this.handleTopicMessage(data.value)
      },
      error: error => console.log(error),
      close: () => console.log('Done')
    })
    
  }
  
  handleTopicMessage(message) {
    console.log("handling message", message)
    this.setState({
      messages: [...this.state.messages, message]
    })
  }

  render() {
    var messageBlock = ""
    var m, i = 0
    
    while ((m = this.state.messages.pop()) !== undefined) {
      messageBlock +=  JSON.stringify(m)
    }
    
    return (
      <div className="App">
        <header>
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <div>
          {this.state.things.length} Things:<br/>
          <table>
            <tbody>
              {this.state.things.map((t,i) => {return(<tr key={i}><td>{t.thingName}</td></tr>)})}
            </tbody>
          </table>
          <br/>
          { messageBlock }
        </div>
      </div>
    );
  }
}

export default App;