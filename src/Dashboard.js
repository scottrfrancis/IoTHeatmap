import Amplify, { Auth } from 'aws-amplify'
import React, { Component } from 'react'
import { Col } from "react-bootstrap";
import AWS from 'aws-sdk'
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsiot from './aws-iot'
import { PubSub } from 'aws-amplify'
import HeatMap from 'react-heatmap-grid'


const MaxSamples = 50
const Board_id_label = "Board_id"


class Dashboard extends Component {
  constructor(props) {
    super(props)

    this.state = {
      messages: [],       // reverse-time ordered FIFO of last MaxSamples
      metrics: ["Time"]   // metrics accummulates all keys ever seen in the messages -- but Time is first measurement
    }

    console.log('Dashboard constructed')

    // Amplify.addPluggable( new AWSIoTProvider(awsiot) )
    // PubSub.configure()
  }

  getCurrentCredentials = () => {
    return new Promise((resolve, reject) => {
      Auth.currentUserCredentials()
        .then(creds => resolve(creds))
        .catch(err => reject(err))
    })
  }

  attachIotPolicy = () => {
    return new Promise((resolve, reject) => {
      this.getCurrentCredentials()
        .then((credentials) => {
          Amplify.addPluggable(new AWSIoTProvider(awsiot))

        resolve()
        })
      .catch((error) => {
        console.log(error)
        reject(error)
      })
    })
  }

  componentDidMount() {
    console.log('Dashboard mounted')
    // Auth.currentUserCredentials().then((credentials) => {
    //   console.log(credentials)

    //   AWS.config.update({
    //     credentials: credentials
    //   })
    //   console.log(AWS.config)

    this.attachIotPolicy().then(() => {
      // PubSub.configure()

      const sub = PubSub.subscribe('freertos/demos/sensors/#')
      const subscription = sub.subscribe({
        next: data => this.handleTopicMessage(data.value),
        error: error => console.log(error),
        close: () => console.log('Done')
      }) //.catch((error) => {
        // console.log(error)
      // })
    }).catch((error) => {
      console.log(error)
    })
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

export default Dashboard