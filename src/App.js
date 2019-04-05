import React, { Component } from 'react'
import './App.css'
import Amplify, {Auth, PubSub} from 'aws-amplify'
import awsconfig from './aws-exports'
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsiot from './aws-iot'
import AWS from 'aws-sdk'
import HeatMap from 'react-heatmap-grid'
import Signup from './Signup'


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
      studentId: window.location.pathname.split("/")[1],  // requested id
      existingUser: null,

      username: "",     

      messages: [],       // reverse-time ordered FIFO of last MaxSamples 
      metrics: ["Time"]   // metrics accummulates all keys ever seen in the messages -- but Time is first measurement
    }
    
    this.handleTopicMessage = this.handleTopicMessage.bind(this)
    this.getLatestBoardMetrics = this.getLatestBoardMetrics.bind(this)
    this.displayMetric = this.displayMetric.bind(this)
    this.checkIfStudentIdRegistered = this.checkIfStudentIdRegistered.bind(this)
    this.signInStudent = this.signInStudent.bind(this)
     
    AWS.config.update({
      region: awsconfig.aws_cognito_region,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: awsconfig.aws_cognito_identity_pool_id
      })
    })
  // Auth.currentSession().then( 
            
      Auth.currentCredentials().then(
        result => {
          console.log(result)
          
          if (result.expired) {
            // Auth.currentSession automatically refreshes tokens
            Auth.currentSession().then(
              result => console.log(result),
              error => console.log(error)
            )
          }
          
  
          this.checkIfStudentIdRegistered()        
  
          // subscribe to thing updates for any publishers
          PubSub.subscribe('freertos/demos/sensors/#').subscribe({
            next: data => this.handleTopicMessage(data.value),
          })
        },
        error => console.log(error) )
    // )
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

  checkIfStudentIdRegistered() {
    let cognitoProvider = new AWS.CognitoIdentityServiceProvider()
    cognitoProvider.listUsers({
      UserPoolId: awsconfig.aws_user_pools_id,
      Limit: 50
    }, (err, data) => {
      if (err) console.log(err)
      else {
        console.log(data)
        
        // this.setState({
        //   existingUser: data.Users &&
        //       data.Users.map((u) => u.Username)
        //         .reduce((a,c) => a || (c === this.state.studentId), undefined)
        // })
        this.setState({
          existingUser: 
              data.Users.filter((u) => u.Username === this.state.studentId)[0]
        })        
      }
    })
  }
  
  signInStudent(password) {
    const user = Auth.signIn(this.state.studentId, password)
    console.log(user)
  }

  render() {
    // if (!this.state.studentAlreadyRegistered) {
      console.log( this.state.existingUser)
      return(
        <div>
          <Signup 
            username={this.state.studentId} 
            existingUser={this.state.existingUser} />
        </div>
      )
    // } else if (this.state.username === "") {
    //   return(
    //     <div>
    //     <Login 
    //       username={this.state.studentId}
    //       toSignin={this.signInStudent} />
    //     </div>
    //   ) 
    // }
    
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