import { Auth } from 'aws-amplify'
import React, { Component } from 'react'
import { Alert, Button, Col, Form, FormGroup, FormControl, FormLabel, Row } from "react-bootstrap";
import QrReader from 'react-qr-scanner'
// import QrReader from 'react-qr-reader'


const labelSize = 3
const controlSize = 3

class Signup extends Component {
  constructor(props) {
    super(props)

    const username = (this.props.username === '#') ? '' :  this.props.username

    this.state = {
      name: "",
      email: "",
      company: "",
      password: this.props.password,
      confirmationCode: "",
      username: username,

      errorMessage: ""
    }

    this.logOut = this.logOut.bind(this)
    this.loginWithUserAndPassword = this.loginWithUserAndPassword.bind(this)
    this.logIn = this.logIn.bind(this)
    this.confirmWithCode = this.confirmWithCode.bind(this)
    this.signUp = this.signUp.bind(this)

    this.handleScan = this.handleScan.bind(this)
  }

  isExistingUserConfirmed() {
    return ((this.props.existingUser) && (this.props.existingUser.UserStatus === 'CONFIRMED'))
  }

  existingUserNeedsToConfirm() {
    return ((this.props.existingUser) && (this.props.existingUser.UserStatus !== "CONFIRMED"))
  }

  passwordNotEmpty() {
    return (this.state.password.length !== 0)
  }

  validateConfirmationCode() {
    return( this.state.confirmationCode.length === 6 )
  }

  updateExistingUser() {
    (this.props.updateUser) && (this.props.updateUser());
  }

  validateSignUpForm() {
    return (
      this.state.email.length > 0 &&
      this.passwordNotEmpty() &&
      this.state.name.length > 0
    )
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    })
  }

  logOut = async event => {
    event.preventDefault()

    Auth.signOut()
    .then(data => console.log(data))
    .catch(err => console.log(err))
    .finally(() => {
      (this.props.onUserSignOut) && (this.props.onUserSignOut())
    })
  }

  loginWithUserAndPassword = (username, password) => {
    let success = false

    Auth.signIn(username, password).then(
      u => {
        success = (u !== undefined)
      },
      error => {
        console.log(error)
        success = false
        this.setState({ errorMessage: error.message })
      }
    ).finally( () => {
      success && (this.props.onUserSignIn) && (this.props.onUserSignIn(username))
      !success && (this.props.onUserSignOut) && (this.props.onUserSignOut())
    })
  }

  logIn = async event => {
    event.preventDefault()

    this.loginWithUserAndPassword(this.state.username, this.state.password)
  }

  confirmWithCode = async event => {
    event.preventDefault()

    Auth.confirmSignUp(this.state.username, this.state.confirmationCode).then(
      conf => {
        console.log(conf)
        this.logIn(event)
      },
      error => {
        console.log(error)
        this.setState({ errorMessage: error.message })
      }
    ).finally( () => {
      this.updateExistingUser()
    })
  }

  signUp = async event => {
    event.preventDefault()

    const newUser = await Auth.signUp({
      username: this.state.username,
      password: this.state.password,
      attributes: {
        name: this.state.name,
        email: this.state.email,
        'custom:company': this.state.company
    }})
    .catch((err) => {
      console.log(err)
      this.setState({ errorMessage: err.message })
    })
    console.log(newUser)

    this.updateExistingUser()
  }

  errorAlert() {
    if (this.state.errorMessage !== "") {
      return (
        <Alert variant='danger'>
          {this.state.errorMessage}
        </Alert>
      )
    }
  }

  logOutForm() {
    if (this.props.isUserLoggedIn) {
      // show username and logout
      return(
          <Button onClick={this.logOut}
            size="sm" type="button" class="btn btn-outline-primary"
          >Log out</Button>
      )
    }
  }

  handleError = (err) => {
    console.log(err)
  }

  handleScan = (data) => {
    if (data === null)
      return

    console.log(data)
    const dataObj = JSON.parse(data)

    if ((dataObj.username !== undefined) && (dataObj.username.length > 0)
      && (dataObj.password !== undefined) && (dataObj.password.length > 0)) {

      this.setState({
        username: dataObj.username,
        password: dataObj.password
      }, () => {
        this.loginWithUserAndPassword(this.state.username, this.state.password)
      })
    }
  }

  logInForm() {
    if (this.isExistingUserConfirmed && !this.state.isUserLoggedIn) {
      let usernamePlaceholder = this.state.username
      if (usernamePlaceholder === '') {
        usernamePlaceholder = 'studentXX'
      }

      const previewStyle = {
        height: 240,
        width: 320
      }

      return(
        <Col sm={4*controlSize}>
          <Row>
            <QrReader
              delay={100}
              style={previewStyle}
              onError={this.handleError}
              onScan={this.handleScan}
            />
          </Row>
          <Form onSubmit={this.logIn}>
            <FormGroup controlId="username" size="large">
              <FormLabel column sm={labelSize}>Username</FormLabel>
              <FormControl
                value={this.state.username}
                placeholder={usernamePlaceholder}
                onChange={this.handleChange} type="text" autoComplete="on" autoFocus
              />
            </FormGroup>
            <FormGroup controlId="password" size="large">
              <FormLabel column sm={labelSize}>Password</FormLabel>
                <FormControl
                  value={this.state.password}
                  onChange={this.handleChange} type="password" autoComplete="off" autoFocus />
            </FormGroup>
              <Button
                size="sm" type="submit" disabled={!this.passwordNotEmpty}
              >Log in</Button>
          </Form>
        </Col>
      )
    }
  }

  confirmationForm() {
    if (this.existingUserNeedsToConfirm()) {
      return (
        <Form onSubmit={this.confirmWithCode}>
          <FormGroup controlId="confirmationCode" size="large">
            <FormLabel column sm={labelSize}>Confirmation Code</FormLabel>
            <Col sm={controlSize}>
              <FormControl
                value={this.state.confirmationCode}
                onChange={this.handleChange} type="text" autoComplete="off" autoFocus />
            </Col>
          </FormGroup>
          <Col sm={controlSize}>
            <Button
              block size="large" type="submit"
              disabled={!this.validateConfirmationCode}
            >{'Confirm'}</Button>
          </Col>
        </Form>
      )
    }
  }

  signupForm() {
    return (
      <Form onSubmit={this.signUp}>
        <FormGroup controlId="name" size="large">
          <FormLabel column sm={labelSize}>Name</FormLabel>
            <FormControl autoComplete="on" type="text" onChange={this.handleChange} autoFocus
              value={this.state.family_name} />
        </FormGroup>
        <FormGroup controlId="company" size="large">
          <FormLabel column sm={labelSize}>Company</FormLabel>
            <FormControl autoComplete="on" type="text" onChange={this.handleChange}
              value={this.state.company} />
        </FormGroup>
        <FormGroup controlId="email" size="large">
          <FormLabel column sm={labelSize}>Email</FormLabel>
            <FormControl
              autoComplete="on" type="email" onChange={this.handleChange}
              value={this.state.email} />
        </FormGroup>
        <FormGroup controlId="password" size="large">
          <FormLabel column sm={labelSize}>Password</FormLabel>
            <FormControl
              value={this.state.password}
              onChange={this.handleChange} type="password" autoComplete="off" />
        </FormGroup>
          <Button
            block size="large" type="submit"
            disabled={!this.validateSignUpForm()}
          >{'Sign up'}</Button>
      </Form>
    )
  }

  render() {
    if (this.props.isUserLoggedIn) {
      return(
        <div>
          <Col sm={4}>
            <h6>{this.state.username} Logged In</h6>
            {this.logOutForm()}
          </Col>
        </div>
      )
    } else if (this.isExistingUserConfirmed() || (!this.props.showNewSignup)) {
      // show password to login
      return(
        <div>
          <Col sm={3}>
            <h6>Login or Show QR Code</h6>
            {this.errorAlert()}
            {this.logInForm()}
          </Col>
        </div>
      )
    } else if (this.existingUserNeedsToConfirm()) {
      // show confirmation code form
      return(
        <div>
          <Col sm={4}>
          <h3>new user</h3>
          {this.errorAlert()}
          {this.confirmationForm()}
          </Col>
        </div>
      )
    } else if (this.props.showNewSignup) {
      // R: existingUser should be null
      // show signup form
      return(
        <div>
          <Col sm="6">
          <h1>Please sign up.</h1>
          {this.errorAlert()}
          {this.signupForm()}
          </Col>
        </div>
      )
    }
  }
}

export default  Signup;