import Amplify, { Auth } from 'aws-amplify'
import React, { Component } from 'react'
import { Col } from "react-bootstrap";
import AWS from 'aws-sdk'
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsconfig from './aws-exports'
import awsiot from './aws-iot'
import HeatMap from 'react-heatmap-grid'
import AWSIoTData from 'aws-iot-device-sdk'


const MaxSamples = 50
const Board_id_label = "Board_id"


class Dashboard2 extends Component {
  constructor(props) {
    super(props)

    this.state = {
      messages: [],       // reverse-time ordered FIFO of last MaxSamples
      metrics: ["Time"]   // metrics accummulates all keys ever seen in the messages -- but Time is first measurement
    }
    this.client = null

    this.onConnect = this.onConnect.bind(this)
    this.onMessage = this.onMessage.bind(this)

    console.log('Dashboard constructed')
  }

  getCurrentCredentials = () => {
    return new Promise((resolve, reject) => {
      Auth.currentUserCredentials()
        .then(creds => resolve(creds))
        .catch(err => reject(err))
    })
  }

  attachIotPolicy = (identityId) => {
    console.log(`Attaching dashboard-policy to ${identityId}`)
    return new Promise((resolve, reject) => {
      const iot = new AWS.Iot({apiVersion: '2015-05-28'});
      iot.attachPolicy({
        policyName: 'dashboard-policy',
        target: identityId
      }, (err, data) => {
        if (err) {
          console.log(err)
          reject(err)
        } else {
          console.log(data)
          resolve(data)
        }
      })
    })
  }

  onConnect = () => {
    console.log('client connected')

    this.client.subscribe('freertos/demos/sensors/#', (err, granted) => {
      if (err) console.log(err)
      else {
        console.log(granted)
      }
    })
  }

  onMessage = (topic, message) => {
    console.log(topic); console.log(message)
  }

  componentDidMount() {
    console.log('Dashboard mounted')

    this.getCurrentCredentials().then((creds) => {
      console.log(creds)
      const essentialCreds = creds;

      AWS.config.update({
        region: awsconfig.aws_project_region,
        credentials: essentialCreds
      })
      this.attachIotPolicy(creds._identityId).then(() => {
        this.thingName = "Discovery-02"
        try {
          this.shadows = AWSIoTData.thingShadow({
            region: awsiot.aws_pubsub_region,
            host: awsiot.aws_iot_endpoint,
            clientId: awsconfig.aws_user_pools_web_client_id + (Math.floor((Math.random() * 100000) + 1)),
            protocol: 'wss',
            maximumReconnectTimeMs: 8000,
            debug: true,
            accessKeyId: essentialCreds.accessKeyId,
            secretKey: essentialCreds.secretAccessKey,
            sessionToken: essentialCreds.sessionToken
          })
          console.log(this.shadows)
        } catch (err) {
          console.log('error: ' + err)
        }

        this.shadows.on('connect', function() {
          // After connecting to the AWS IoT platform, register interest in the
          // Thing Shadow
          if (!this.shadowRegistered) {
            console.log('registering ' + this.thingName);
            this.shadows.register(this.thingName, {}, function() {
              console.log('register callback');
              this.getThingState();
            }.bind(this));
            this.shadowRegistered = true;

            this.shadows.subscribe('freertos/demos/sensors/Discovery-02', {},
              (err, granted) => {
                if (err) console.log(err)
                else {
                  console.log(granted)
                }
            })
          } else {
            this.getThingState();
          }
        }.bind(this));

        this.shadows.on('message', (topic, message) => {
          console.log(`received message on ${topic}`)
          console.log(message.toString())

          this.handleTopicMessage(JSON.parse(message))
        })

        this.shadows.on('status', function(thingName, stat, clientToken, stateObject) {
          console.log('Operation ' + clientToken + " status: " + stat);
          if (clientToken === this.clientTokenUpdate) {
            if (stat === 'accepted') {
              this.handleNewThingState(stateObject);
            }
          } else if (clientToken === this.clientTokenGet) {
            if (stat === 'accepted') {
              this.handleNewThingState(stateObject);
            }
          }
          console.log(stateObject);
        }.bind(this));

        this.shadows.on('foreignStateChange', function(thingName, operation, stateObject) {
          console.log('foreignStateChange ' + operation);
          console.log(stateObject);
          if (operation === "update") {
            this.handleNewThingState(stateObject);
          }
        }.bind(this))
      })
    })
  }

  getThingState() {
    console.log("getting thing "+ this.thingName);
    this.clientTokenGet = this.shadows.get(this.thingName);
    console.log("sent request " + this.clientTokenGet);
  }

  handleNewThingState(stateObject) {
    if (stateObject.state.reported === undefined) {
      stateObject.state.reported = stateObject.state.desired;
      console.warn("no reported thing state, using desired");
    }

    var stateChanges = {thingState: stateObject, switched: false};

    // if (this.state.thingState.state) console.log(this.state.thingState.state.reported.pushedAt);
    if (this.state.thingState.state === undefined || stateObject.state.reported.Power !== this.state.thingState.state.reported.Power) {
      this.setState({
        switched: false});
      this.setState(stateChanges);
    }
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
    console.log('Dashboard is rendering')

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
      <div>
        <Col sm={8}>
          <h3>Dashboard</h3>
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
        </Col>
      </div>
    )
  }
}

export default Dashboard2