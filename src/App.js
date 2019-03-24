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

    this.handleTopicMessage = this.handleTopicMessage.bind(this)
    this.getLatestBoardMetrics = this.getLatestBoardMetrics.bind(this)
    this.displayMetric = this.displayMetric.bind(this)
    
    Auth.currentCredentials()
      .then(credentials => console.log(credentials))
    
    AWS.config.update({
      region: awsconfig.aws_cognito_region,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: awsconfig.aws_cognito_identity_pool_id
      })
    })

    // subscribe to thing updates
    PubSub.subscribe('freertos/demos/sensors/#').subscribe({
      next: data => this.handleTopicMessage(data.value),
      error: error => console.log(error),
      close: () => console.log('Done')
    })
    
  }
  
  handleTopicMessage(message) {
    console.log("handling message", message)
    
    const thing = message[Board_id_label]
    message["Time"] = new Date().toLocaleTimeString()
    
    this.setState({
      messages: [message, ...this.state.messages.slice(0, MaxSamples - 1)],
      metrics: [...new Set([...this.state.metrics, ...Object.keys(message)])],
      things: [...new Set([...this.state.things, thing])]
    })
  }
  
  displayMetric(value, label, board_id) {
    const units = { 
      'Temp': "\xB0C",
      'Hum':  "%",
      'Press': "mBar",
      'Accel_X': "mG",
      'Accel_Y': "mG",
      'Accel_Z': "mG",
      'Gyro_X': "\xB0/S",
      'Gyro_Y': "\xB0/S",
      'Gyro_Z': "\xB0/S",
      'Magn_X': "mGa",
      'Magn_Y': "mGa",
      'Magn_Z': "mGa"
    }
    
    return( value + " " + units[label])
  }

  getLatestBoardMetrics(board_id, labels) {
    const message = this.state.messages.map((m) => (m[Board_id_label] === board_id) && m).reduce((a,c) => a || c, undefined)

    let metrics = new Array(labels.length)
      .fill(0)
    if (message !== false)
      metrics = metrics.map((l, i) => message[labels[i]])

    return metrics
  }

  render() {
    const xLabels = this.state.metrics.slice(1, this.state.metrics.length)
    xLabels.splice(xLabels.indexOf(Board_id_label), 1)
    const yLabels = this.state.things.map((t) => {return t}).sort()

    const data = []
    for (var i = 0; i < yLabels.length; i++) {
      const row = this.getLatestBoardMetrics(yLabels[i], xLabels)
      data.push(row)
    }
    

    return (
      <div className="App">
        <div className="HeatMap">
        <HeatMap
          xLabels={xLabels} yLabels={yLabels} data={data}
          yLabelWidth = {150} background = {"#ee9900"} squares={true} height={75}
          cellRender={this.displayMetric}
        />
        </div>
        <div>
          <br />
          <table>
            <thead>
              <tr>
                {this.state.metrics.map((m, j) => {return(<th key={j}>{m}</th>)})}
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