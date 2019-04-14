import React, { Component } from 'react'
import './App.css'
import Amplify, { Auth, PubSub } from 'aws-amplify'
import awsconfig from './aws-exports'
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers'
import awsiot from './aws-iot'
import AWS from 'aws-sdk'
// import HeatMap from 'react-heatmap-grid'
import Signup from './Signup'
import Credentials from './Credentials'
import Dashboard from './Dashboard'


// retrieve temporary AWS credentials and sign requests
Auth.configure(awsconfig);
Amplify.configure(awsconfig);

Amplify.addPluggable( new AWSIoTProvider(awsiot) )
PubSub.configure()

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
    let newSession = null

    Auth.currentSession().then((session) => {
      console.log(session)
      newSession = session
    })
    .then((credentials) => {
      console.log(credentials)
      newSession = credentials
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
    console.log('session refreshed')
    console.log(AWS.config.credentials)
    this.getExistingUserFromUsername()

    Auth.currentUserCredentials().then((credentials) => {
      console.log(credentials)
    })
  }

  getExistingUserFromUsername = () => {
    Auth.currentUserCredentials().then((credentials) => {
      console.log(credentials)

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
        <Dashboard />
      </div>
    )
  }
}

export default App;