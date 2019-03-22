import React, { Component } from 'react'
import './App.css'

import Amplify, {Auth, PubSub} from 'aws-amplify'

import awsconfig from './aws-exports'

import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsiot from './aws-iot'

import AWS from 'aws-sdk'

import HeatMap from 'react-heatmap-grid'

const MaxSamples = 50
const Board_id_label = "Board_id"

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
      metrics: ["Time"]
    }

    this.getAllTheThings = this.getAllTheThings.bind(this)
    this.handleTopicMessage = this.handleTopicMessage.bind(this)
    this.getLatestBoardMetrics = this.getLatestBoardMetrics.bind(this)
    this.normalizeMetric = this.normalizeMetric.bind(this)

    Auth.currentCredentials()
      .then(credentials => console.log(credentials))
    
    AWS.config.update({
      region: awsconfig.aws_cognito_region,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: awsconfig.aws_cognito_identity_pool_id
      })
    })

    this.getAllTheThings()
    
    // subscribe to thing connect events
    PubSub.subscribe('$aws/events/presence/connected/#').subscribe({
      next: data => this.getAllTheThings()
    })
    
    // subscribe to thing updates
    PubSub.subscribe('freertos/demos/sensors/#').subscribe({
      next: data => this.handleTopicMessage(data.value),
      error: error => console.log(error),
      close: () => console.log('Done')
    })
    
  }
  
  getAllTheThings() {
    new AWS.Iot()
      .listThings({
      }, (err, data) => {
        if (err) console.log(err)
        else {
          console.log(data)
          this.setState({
            things: data.things
          })
        }
      })
  }
  
  handleTopicMessage(message) {
    console.log("handling message", message)
    
    message["Time"] = new Date().toLocaleTimeString()
    
    this.setState({
      messages: [message, ...this.state.messages.slice(0, MaxSamples - 1)],
      metrics: [...new Set([...this.state.metrics, ...Object.keys(message)])]
    })
  }
  
  normalizeMetric(message, label) {
    const normalize = { // label: [scale, offset]
      'Temp': [1.0, 0],
      'Hum': [1.0, 0],
      'Press': [0.1 , -260],
      'Accel_X': [0.02, 2500],
      'Accel_Y': [0.02, 2500],
      'Accel_Z': [0.02, 2500],
      'Gyro_X': [0.001, 50000],
      'Gyro_Y': [0.001, 50000],
      'Gyro_Z': [0.001, 50000],
      'Magn_X': [0.1, 360],
      'Magn_Y': [0.1, 360],
      'Magn_Z': [0.1, 360]
    }
    
    return ((message[label] || 0) + normalize[label][1])*normalize[label][0]
  }

  getLatestBoardMetrics(board_id, labels) {
    const message = this.state.messages.map((m) => (m[Board_id_label] === board_id) && m).reduce((a,c) => a || c, undefined)
    // console.log("for " + board_id + " using " + JSON.stringify(message))
    
    let metrics = new Array(labels.length)
      .fill(0)
    if (message !== false)
      metrics = metrics.map((l, i) => this.normalizeMetric(message, labels[i]))
      
    return metrics
  }

  render() {
    const xLabels = this.state.metrics.slice(1, this.state.metrics.length)
    xLabels.splice(xLabels.indexOf(Board_id_label), 1)
    const yLabels = this.state.things.map((t) => {return (t.thingName)}).sort()

    const data = []
    for (var i = 0; i < yLabels.length; i++) {
      const row = this.getLatestBoardMetrics(yLabels[i], xLabels)
      // console.log("row: " + row)
      data.push(row)
    }
    // console.log("data is " + JSON.stringify(data))

    return (
      <div className="App">
        <div>
        <HeatMap
          xLabels={xLabels}
          yLabels={yLabels}
          data={data}
          yLabelWidth = {150}
        />
        </div>
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