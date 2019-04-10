import { Auth } from 'aws-amplify'
import React, { Component } from 'react'
import { Alert, Button, Col, Form, FormGroup, FormControl, FormLabel } from "react-bootstrap";


const labelSize = 3
const controlSize = 3

class Signup extends Component {
  constructor(props) {
    super(props)

    this.state = {
      given_name: "",
      family_name: "",
      email: "",
      password: "",
      confirmationCode: "",

      errorMessage: ""
    }

    this.logOut = this.logOut.bind(this)
    this.logIn = this.logIn.bind(this)
    this.confirmWithCode = this.confirmWithCode.bind(this)
    this.signUp = this.signUp.bind(this)
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
      this.state.given_name.length > 0 &&
      this.state.family_name.length > 0
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

  logIn = async event => {
    event.preventDefault()
    let success = false

    Auth.signIn(this.props.username, this.state.password).then(
      u => {
        console.log(u)
        success = (u !== undefined)
      },
      error => {
        console.log(error)
        success = false
        this.setState({ errorMessage: error.message })
      }
    ).finally( () => {
      success && (this.props.onUserSignIn) && (this.props.onUserSignIn())
      !success && (this.props.onUserSignOut) && (this.props.onUserSignOut())
    })
  }

  confirmWithCode = async event => {
    event.preventDefault()

    Auth.confirmSignUp(this.props.username, this.state.confirmationCode).then(
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
      username: this.props.username,
      password: this.state.password,
      attributes: {
        given_name: this.state.given_name,
        family_name: this.state.family_name,
        email: this.state.email
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
        <Col sm={controlSize}>
          <Button onClick={this.logOut}
            block size="large" type="button"
          >Log out</Button>
        </Col>
      )
    }
  }

  logInForm() {
    if (this.isExistingUserConfirmed && !this.props.isUserLoggedIn) {
      return(
        <Form onSubmit={this.logIn}>
          <FormGroup controlId="password" size="large">
            <FormLabel column sm={labelSize}>Password</FormLabel>
            <Col sm={controlSize}>
              <FormControl
                value={this.state.password}
                onChange={this.handleChange} type="password" autoComplete="off" autoFocus />
            </Col>
          </FormGroup>
          <Col sm={controlSize}>
            <Button
              block size="large" type="submit" disabled={!this.passwordNotEmpty}
            >Log in</Button>
          </Col>
        </Form>
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
        <FormGroup controlId="given_name" size="large">
          <FormLabel column sm={labelSize}>First Name</FormLabel>
          <Col sm={controlSize}>
            <FormControl autoFocus autoComplete="on" type="text" onChange={this.handleChange}
              value={this.state.given_name} />
          </Col>
        </FormGroup>
        <FormGroup controlId="family_name" size="large">
          <FormLabel column sm={labelSize}>Last Name</FormLabel>
          <Col sm={controlSize}>
            <FormControl autoComplete="on" type="text" onChange={this.handleChange}
              value={this.state.family_name} />
          </Col>
        </FormGroup>
        <FormGroup controlId="email" size="large">
          <FormLabel column sm={labelSize}>Email</FormLabel>
          <Col sm={controlSize}>
            <FormControl
              autoFocus autoComplete="on" type="email" onChange={this.handleChange}
              value={this.state.email} />
          </Col>
        </FormGroup>
        <FormGroup controlId="password" size="large">
          <FormLabel column sm={labelSize}>Password</FormLabel>
          <Col sm={controlSize}>
            <FormControl
              value={this.state.password}
              onChange={this.handleChange} type="password" autoComplete="off" />
          </Col>
        </FormGroup>
        <Col sm={controlSize}>
          <Button
            block size="large" type="submit"
            disabled={!this.validateSignUpForm()}
          >{'Sign up'}</Button>
        </Col>
      </Form>
    )
  }

  render() {
    if (this.props.isUserLoggedIn) {
      return(
        <div>
          <h1>{this.props.username} Logged In</h1>
          {this.logOutForm()}
        </div>
      )
    } else if (this.isExistingUserConfirmed()) {
      // show password to login
      return(
        <div>
          <h1>Enter password for {this.props.username}</h1>
          {this.errorAlert()}
          {this.logInForm()}
        </div>
      )
    } else if (this.existingUserNeedsToConfirm()) {
      // show confirmation code form
      return(
        <div>
          <h1>new user</h1>
          {this.errorAlert()}
          {this.confirmationForm()}
        </div>
      )
    } else {
      // R: existingUser should be null
      // show signup form
      return(
        <div sm="4">
          <h1>Please sign up.</h1>
          {this.errorAlert()}
          {this.signupForm()}
        </div>
      )
    }
  }
}

export default  Signup;