import React, { Component } from 'react'
import './App.css'
import Amplify, {Auth, PubSub} from 'aws-amplify'
import awsconfig from './aws-exports'
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsiot from './aws-iot'
import AWS from 'aws-sdk'
import HeatMap from 'react-heatmap-grid'
import Signup from './Signup'
import Credentials from './Credentials'


const MaxSamples = 50
const Board_id_label = "Board_id"


// retrieve temporary AWS credentials and sign requests
Auth.configure(awsconfig);

Amplify.configure(awsconfig);

Amplify.addPluggable( new AWSIoTProvider(awsiot) )

AWS.config.update({
  region: awsconfig.aws_cognito_region })
updateAWSCredsForAnonymous()


function updateAWSCredsForAnonymous() {
  AWS.config.update({
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: awsconfig.aws_cognito_identity_pool_id
    })
  })
}


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      studentId: window.location.pathname.split("/")[1],  // requested id
      existingUser: null,
      isUserLoggedIn: false,

      messages: [],       // reverse-time ordered FIFO of last MaxSamples
      metrics: ["Time"]   // metrics accummulates all keys ever seen in the messages -- but Time is first measurement
    }

    this.displayMetric = this.displayMetric.bind(this)
    this.getExistingUserFromUsername = this.getExistingUserFromUsername.bind(this)
    this.onUserSignIn = this.onUserSignIn.bind(this)
    this.onUserSignOut = this.onUserSignOut.bind(this)
  }

  componentDidMount() {
    Auth.currentCredentials().then(
      result => {
        console.log(result)
        this.getExistingUserFromUsername()

        // subscribe to thing updates for any publishers
        PubSub.configure()
        // PubSub.subscribe('freertos/demos/sensors/#').subscribe({
        //   next: data => this.handleTopicMessage(data.value),
        //   error: error => console.log(error)
        // })
      })
  }

  getExistingUserFromUsername =  () => {
      let cognitoProvider = new AWS.CognitoIdentityServiceProvider()
      cognitoProvider.listUsers({
        UserPoolId: awsconfig.aws_user_pools_id,
        Filter: "username = \"" + this.state.studentId + "\"",
        Limit: 50     // really shouldn't ever be more than 1
      }, (err, data) => {
        if (err) console.log(err)
        else {
          this.setState({ existingUser: data.Users[0] })
        }
      })
   }

  onUserSignIn =  () => {
    Auth.currentUserCredentials().then((creds) => {
      console.log(creds)
      AWS.config.update({
        credentials: creds
      })

      this.setState({ isUserLoggedIn: true })
    })
  }

  onUserSignOut =  () => {
    updateAWSCredsForAnonymous()
    this.setState({ isUserLoggedIn: false })
    this.getExistingUserFromUsername()
  }


  handleTopicMessage(message) {
    message["Time"] = new Date().toLocaleTimeString()
    console.log(`received message ${JSON.stringify(message)}`)

    this.setState({
      messages: [message, ...this.state.messages.slice(0, MaxSamples - 1)],
      metrics: [...new Set([...this.state.metrics, ...Object.keys(message)])],
    })
  }

  displayMetric(value, label, board_id) {
    const units = {
      'Temp': "\xB0C",
      'Hum':  "%",
      'Press': "mBar",
      'Accel_X': "cm/S\xB2",
      'Accel_Y': "cm/S\xB2",
      'Accel_Z': "cm/S\xB2",
      'Gyro_X': "\xB0/S",
      'Gyro_Y': "\xB0/S",
      'Gyro_Z': "\xB0/S",
      'Magn_X': "mGa",
      'Magn_Y': "mGa",
      'Magn_Z': "mGa"
    }

    return(`${value} ${units[label]}`)
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
      return(
        <div>
          <Signup
            username={this.state.studentId}
            existingUser={this.state.existingUser}
            updateUser={this.getExistingUserFromUsername}
            onUserSignIn={this.onUserSignIn}
            onUserSignOut={this.onUserSignOut}
            isUserLoggedIn={this.state.isUserLoggedIn}/>
          <br/>
          {this.state.isUserLoggedIn &&
          <Credentials
            bucketName={'sttechnologytour-scofranc'}
            username={this.state.studentId}
          />}

        </div>
      )


    const TableLabelsToHide = ["Time", "Board_id"]
    const ExtraLabelsToHide = ["Gyro_X", "Gyro_Y", "Gyro_Z"]
    const tLabels = this.state.metrics.filter(l => !ExtraLabelsToHide.includes(l))
    const xLabels = this.state.metrics.filter(l => !TableLabelsToHide.includes(l) && !ExtraLabelsToHide.includes(l))
    const yLabels = [...new Set(this.state.messages.map((m) => m[Board_id_label]))].sort()
    const data = []
    for (let i = 0; i < yLabels.length; i++) {
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
                {(tLabels.length > 1) && tLabels
                  .map((m, j) => {return(<th key={j}>{m}</th>)})}
              </tr>
            </thead>
            <tbody>
              {this.state.messages.map((t,i) => {
                return(<tr key={i}>{tLabels.map((m, j) => {
                  return(<td key={j}>{t[m]}</td>)})}</tr>)})}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default App;