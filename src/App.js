import React, { Component } from 'react'
import './App.css'
import Amplify, { Auth } from 'aws-amplify'
import awsconfig from './aws-exports'
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsiot from './aws-iot'
import AWS from 'aws-sdk'
import Signup from './Signup'
import Credentials from './Credentials'
import Dashboard2 from './Dashboard2'


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

      studentId: window.location.pathname.split("/")[1],  // requested id
      existingUser: null,
      isUserLoggedIn: false
    }

    this.refreshSessionAndCredentials = this.refreshSessionAndCredentials.bind(this)
    this.getExistingUserFromUsername = this.getExistingUserFromUsername.bind(this)
    this.onUserSignIn = this.onUserSignIn.bind(this)
    this.onUserSignOut = this.onUserSignOut.bind(this)
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

  render() {
    if (this.state.isAuthenticating)
      return null

    return (
      <div className="App">
        {(this.state.studentId !== "") &&
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
        <Dashboard2 />
      </div>
    )
  }
}

export default App