import { Auth } from 'aws-amplify'
import React, { Component } from 'react'
import { Button, Col } from "react-bootstrap";
import AWS from 'aws-sdk'
import awsconfig from './aws-exports'
import awsiot from './aws-iot'
import HeatMap from 'react-heatmap-grid'
import AWSIoTData from 'aws-iot-device-sdk'

import Switch from 'react-toggle-switch'



const MaxSamples = 50
const Board_id_label = "Board_id"


class Dashboard2 extends Component {
  constructor(props) {
    super(props)

    this.state = {
      LEDstate: 0,
      messages: [],       // reverse-time ordered FIFO of last MaxSamples
      metrics: ["Time"]   // metrics accummulates all keys ever seen in the messages -- but Time is first measurement
    }
    this.client = null

    this.setupSubscription = this.setupSubscription.bind(this)

    this.isLEDOn = this.isLEDOn.bind(this)
    this.toggleLED = this.toggleLED.bind(this)
    this.updateAccelerometer = this.updateAccelerometer.bind(this)
  }

  getCurrentCredentials = () => {
    return new Promise((resolve, reject) => {
      Auth.currentUserCredentials()
        .then(creds => resolve(creds))
        .catch(err => reject(err))
    })
  }

  attachIotPolicy = (identityId) => {
    console.log(`Attaching ${awsiot.policy_name} to ${identityId}`)
    return new Promise((resolve, reject) => {
      const iot = new AWS.Iot({apiVersion: '2015-05-28'});
      iot.attachPolicy({
        policyName: awsiot.policy_name,
        target: identityId
      }, (err, data) => {
        if (err) {
          console.log(err)
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }


  setupSubscription = (thingName) => {
    this.getCurrentCredentials().then((creds) => {
      console.log(creds)
      const essentialCreds = creds;

      AWS.config.update({
        region: awsconfig.aws_project_region,
        credentials: essentialCreds
      })
      this.attachIotPolicy(creds._identityId).then(() => {
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
        } catch (err) {
          console.log('error: ' + err)
        }

        this.shadows.on('connect', function() {
          // After connecting to the AWS IoT platform, register interest in the
          // Thing Shadow
          console.log('..onConnect')
          if (!this.shadowRegistered) {
            console.log('registering ' + thingName);

            this.shadows.register(thingName, {
              ignoreDeltas: true
            }, function() {
              this.getThingState();
            }.bind(this));
            this.shadowRegistered = true;

            this.shadows.subscribe(
              `${awsiot.topic_base}/${thingName}`
              , {},
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
          this.handleTopicMessage(JSON.parse(message))
        })

        this.shadows.on('status', function(thingName, stat, clientToken, stateObject) {
          if ((  (clientToken === this.clientTokenUpdate) ||
                (clientToken === this.clientTokenGet)) &&
              (stat === 'accepted')) {
               this.handleNewThingState(stateObject);
          }
        }.bind(this));

        this.shadows.on('foreignStateChange', function(thingName, operation, stateObject) {
          // refetch the whole shadow
          this.clientTokenGet = this.shadows.get(thingName)
        }.bind(this))
      } )
    })
  }

  componentWillReceiveProps = (nextProps) => {
    if (this.props.thingName !== nextProps.thingName) {
      this.setupSubscription(nextProps.thingName)
    }
  }

  getThingState() {
    this.clientTokenGet = this.shadows.get(this.props.thingName);
  }

  handleNewThingState(stateObject) {
    if (stateObject.state.reported === undefined) {
      console.warn("no reported thing state");
    } else {
      let message = {
        "Board_id" : this.props.thingName,
      }

      if (stateObject.state.reported.LEDstate !== undefined) {
        message['LEDstate'] = stateObject.state.reported.LEDstate*1000
      }

      if (stateObject.state.reported.accel !== undefined) {
        message['Accel_X'] = stateObject.state.reported.accel.x
        message['Accel_Y'] = stateObject.state.reported.accel.y
        message['Accel_Z'] = stateObject.state.reported.accel.z
      }

      this.handleTopicMessage(message)

      if (stateObject.state.reported.LEDstate !== undefined) {
        this.setState({
          LEDstate: stateObject.state.reported.LEDstate
        })
      }
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

    if (label === 'LEDstate') {
      const display = (value > 0) ? 'ON' : 'OFF'
      return(display)
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

  isLEDOn = () => {
    return this.state.LEDstate
  }

  toggleLED = () => {
    console.log('LED')
    const newState = {state: {desired: {LEDstate: (this.state.LEDstate) ? 0 : 1}}}
    this.clientTokenUpdate = this.shadows.update(this.props.thingName, newState)
  }

  updateAccelerometer = () => {
    console.log('update accel')
    const newState = {state: {desired: {accelUpdate: 1}}}
    this.clientTokenUpdate = this.shadows.update(this.props.thingName, newState)
  }

  render() {
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

    if (((this.props.thingName === '') || (this.props.thingName === '#')) &&
      (yLabels.length <= 0)) {
        return(
          <div>
          </div>
        )
    } else {
      return (
        <div>
          <Col sm={8}>
            <div className="App-canvasContainer">
            <h4>LED Status</h4>
              <Switch on={this.isLEDOn()} onClick={this.toggleLED} />
            </div>
            <div>
              <Button onClick={this.updateAccelerometer}
                size="sm" type="button" class="btn btn-success" variant="success"
              >Update Acclerometer</Button>
            </div>
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
}

export default Dashboard2