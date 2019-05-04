import React, { Component } from 'react'
import './App.css'
import Amplify, { Auth } from 'aws-amplify'
import awsconfig from './aws-exports'
import AWS from 'aws-sdk'
import { Button, Col, Form, FormGroup, FormControl, FormLabel } from "react-bootstrap";
import Signup from './Signup'
import Credentials from './Credentials'
import Dashboard2 from './Dashboard2'
// import Student from './Student'


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


class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      isAuthenticating: true,

      studentNumber: null,
      studentId: '#', //window.location.pathname.split("/")[1],  // requested id
      existingUser: null,
      isUserLoggedIn: false
    }

    this.refreshSessionAndCredentials = this.refreshSessionAndCredentials.bind(this)
    this.getExistingUserFromUsername = this.getExistingUserFromUsername.bind(this)
    this.onUserSignIn = this.onUserSignIn.bind(this)
    this.onUserSignOut = this.onUserSignOut.bind(this)
    // this.onSetStudentNumber = this.onSetStudentNumber.bind(this)
    this.selectStudent = this.selectStudent.bind(this)
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

  onUserSignIn =  () => {
    Auth.currentUserCredentials().then((creds) => {
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
    this.setState({ studentId: `Student${this.state.studentNumber}`})
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

  render() {
    if (this.state.isAuthenticating)
      return null

    // let thingName = '#'
    // if (this.state.studentId !== "") {
    //   thingName = this.state.studentId
    // }
    let thingName = ''
    // if (this.studentNumberNotEmpty()) {
      thingName = this.state.studentId; //`Student${this.state.studentId}`
    // }
    console.log(`using Thing: ${thingName}`)

    // const studentNumber = this.state.studentId.replace(/\D/g,'')

    return (
      <div className="App">
        <Col sm={2}>
          <Form onSubmit={this.selectStudent}>
            <FormGroup controlId="studentNumber">
              <FormLabel>Student Number</FormLabel>
              <FormControl
                onChange={this.handleChange} type="text" autoComplete="on" autoFocus />
            </FormGroup>
            <Button size="sm" type="submit" disabled={!this.studentNumberNotEmpty()}>Set</Button>
          </Form>
        </Col>
        {false && (this.state.studentId !== "") &&
        <Signup
          username={this.state.studentId}
          existingUser={this.state.existingUser}
          updateUser={this.getExistingUserFromUsername}
          onUserSignIn={this.onUserSignIn}
          onUserSignOut={this.onUserSignOut}
          isUserLoggedIn={this.state.isUserLoggedIn}/>
        }
        <br/>
        {this.state.isUserLoggedIn &&
        <Credentials
            bucketName={'sttechnologytour-scofranc'}
            username={this.state.studentId}
        />}
        {thingName}
        {true &&
        <Dashboard2 thingName={thingName} />}
      </div>
    )
  }
}

export default App