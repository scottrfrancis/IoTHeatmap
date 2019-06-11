import React, { Component } from 'react'
import './App.css'
import Amplify, { Auth } from 'aws-amplify'
import awsconfig from './aws-exports'
import awsiot from './aws-iot'
import AWS from 'aws-sdk'
import { Alert, Button, ButtonGroup, Col, Form, FormGroup, FormControl, FormLabel, Row } from "react-bootstrap";
import config from 'react-global-configuration'
import Signup from './Signup'
import Credentials from './Credentials'
import Dashboard2 from './Dashboard2'
// import Student from './Student'


// NXP Workshop
config.set({
  showLeaderboard: false,
  showShadow: true,
  showSignup: false,
  allowNewSignup: false,

  // bucketName: 'sttechnologytour-scofranc',
  bucketName: 'nxp-workshop',
  // logo: 'st-logo.svg'
  logo: 'NXP_logo_RGB_web.jpg'
})


// retrieve temporary AWS credentials and sign requests
Auth.configure(awsconfig);
Amplify.configure(awsconfig);

AWS.config.update({
  region: awsconfig.aws_cognito_region
})
updateAWSCredsForAnonymous()

function updateAWSCredsForAnonymous() {
  AWS.config.update({
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: awsconfig.aws_cognito_identity_pool_id
    })
  })
}

const LeaderboardPane = 'Leaderboard'
const CredentialsPane = 'Credentials'
const DevicePane = 'Device'



class App extends Component {
  constructor(props) {
    super(props)

    const searchParams = new URLSearchParams(window.location.search)
    const username = searchParams.get('username')
    const password = searchParams.get('password')

    this.panes = []
    config.get('showLeaderboard') && this.panes.push(
      { label: LeaderboardPane, handler: this.goLeaderboard }
    )
    config.get('showSignup') && this.panes.push(
      { label: CredentialsPane, handler: this.goCredentials }
    )
    config.get('showShadow') && this.panes.push(
      { label: DevicePane, handler: this.goDevice }
    )
    let selectedPane = this.panes[0].label

    // if ((username !== null) && (password !== null))
    //   selectedPane = CredentialsPane

    this.state = {
      isAuthenticating: true,

      selectedPane: selectedPane,

      studentNumber: null,
      studentId: (username === null) ? '#' : username,
      password: password,
      existingUser: null,
      isUserLoggedIn: false
    }

    this.refreshSessionAndCredentials = this.refreshSessionAndCredentials.bind(this)
    this.getExistingUserFromUsername = this.getExistingUserFromUsername.bind(this)
    this.onUserSignIn = this.onUserSignIn.bind(this)
    this.onUserSignOut = this.onUserSignOut.bind(this)
    // this.onSetStudentNumber = this.onSetStudentNumber.bind(this)
    this.selectStudent = this.selectStudent.bind(this)

    this.goLeaderboard = this.goLeaderboard.bind(this)
    this.goCredentials = this.goCredentials.bind(this)
    this.goDevice = this.goDevice.bind(this)
 }

  refreshSessionAndCredentials = () => {
    Auth.currentSession().then((session) => {
      console.log(session)
    })
    .catch((error) => {
      console.log(error)
      if (error === 'No current user') {
          updateAWSCredsForAnonymous()
      }
    })
    .finally(() => {
      this.setState({ isAuthenticating: false })
    })
  }

  async componentDidMount() {
    await this.refreshSessionAndCredentials()
    this.getExistingUserFromUsername()
  }

  getExistingUserFromUsername = () => {
    Auth.currentUserCredentials().then((credentials) => {
      let cognitoProvider = new AWS.CognitoIdentityServiceProvider({
        credentials: Auth.essentialCredentials(credentials)
      })
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
    })
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    })
  }

  onUserSignIn =  (username) => {
    Auth.currentUserCredentials().then((creds) => {
      AWS.config.update({
        credentials: creds
      })

      this.setState({
        studentId: username,
        isUserLoggedIn: true
      })
    })
  }

  onUserSignOut =  () => {
    updateAWSCredsForAnonymous()
    this.setState({ isUserLoggedIn: false })
    this.getExistingUserFromUsername()
  }

  studentNumberNotEmpty = () => {
    return (this.state.studentNumber !== null) && (this.state.studentNumber.length !== 0)
  }

  // onSetStudentNumber = (studentNumber) => {
  //   this.setState({ studentId: `Student${studentNumber}` })
  // }

  selectStudent = (event) => {
    event.preventDefault()
    console.log(`Selecting Student ${this.state.studentNumber}`)
    // this.onSetStudentNumber(this.state.studentNumber)
    this.setState({ studentId: `student${this.state.studentNumber}`})
  }

  goLeaderboard = (event) => {
    event.preventDefault()
    this.setState({
      selectedPane: LeaderboardPane
    })
  }

  goCredentials = (event) => {
    event.preventDefault()
    this.setState({
      selectedPane: CredentialsPane
    })
  }

  goDevice = (event) => {
    event.preventDefault()
    this.setState({
      selectedPane: DevicePane
    })
  }

  studentForm = () => {
    return(
      <div>
        <Col sm={2}>
          <Form onSubmit={this.selectStudent}>
            <FormGroup controlId="studentNumber">
              <FormLabel>Student Number</FormLabel>
              <FormControl value={this.state.studentNumber}
                onChange={this.handleChange} type="text" autoComplete="on" autoFocus />
            </FormGroup>
            <Button size="sm" type="submit" disabled={!this.studentNumberNotEmpty()}>Set</Button>
          </Form>
        </Col>
      </div>
    )
  }

  header = () => {
    return(
      <div>
        <p>&nbsp;</p>
        <Row>
          <Col>
            <img src='image.png' width={100} height={60} alt=""/>
          </Col>
          <Col>
            <h3>AWS IoT Workshop with Amazon:FreeRTOS</h3>
          </Col>
          <Col>
            <img src={config.get('logo')} height={60} alt="" />
          </Col>
        </Row>
        {(this.panes.length > 1) &&
        <ButtonGroup className="mr-2" aria-label="First group">
          {this.panes.map((p,i) => {
            return(<Button key={i}
              variant={(this.state.selectedPane === p.label) ? "primary" : "secondary"}
              onClick={p.handler}
              >{p.label}</Button>
            )
          })}
        </ButtonGroup>}
        <p>&nbsp;</p><p>&nbsp;</p>
      </div>
    )
  }

  render() {
    if (this.state.isAuthenticating)
      return null

    let studentSignup = ''
    if (config.get('showSignup') && (this.state.studentId !== "")) {
        studentSignup = (
          <Signup
            username={this.state.studentId}
            password={this.state.password}
            existingUser={this.state.existingUser}
            updateUser={this.getExistingUserFromUsername}
            onUserSignIn={this.onUserSignIn}
            onUserSignOut={this.onUserSignOut}
            isUserLoggedIn={this.state.isUserLoggedIn}
            showNewUserSignup={config.get('allowNewSignup')}
          />
        )
    }

    let studentDevice = ''
    if (config.get('showShadow')) {
      studentDevice = <Dashboard2 thingName={this.state.studentId} />
    } else {
      if (this.state.isUserLoggedIn) {
        studentDevice = <Dashboard2 topic={`${awsiot.topic_base}/${this.state.studentId}`} />
      } else {
        studentDevice = (
          <Alert variant='warning'>Please Login From the Credentials Tab First</Alert>
        )
      }
    }

    return (
      <div className="App">
        {this.header()}

        {/* Classroom Leaderboard */}
        {(this.state.selectedPane === LeaderboardPane) &&
          <Dashboard2 topic={`${awsiot.topic_base}/#`} />}

        {/* signin/credentials */}
        {(this.state.selectedPane === CredentialsPane) &&
          ((!this.state.isUserLoggedIn && studentSignup) ||
            (this.state.isUserLoggedIn &&
              <Credentials
                bucketName={config.get('bucketName')}
                username={this.state.studentId}
              />))
        }

        {/* student's device / shadow control */}
        {(this.state.selectedPane === DevicePane) && (!config.get('showSignup'))
          && this.studentForm()}
        {(this.state.selectedPane === DevicePane)
          && studentDevice}
      </div>
    )
  }
}

export default App