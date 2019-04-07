import { Auth } from 'aws-amplify'
import React, { Component } from 'react'
import { Button, FormGroup, FormControl, FormLabel } from "react-bootstrap";


class Signup extends Component {
  constructor(props) {
    super(props)

    this.state = {
      isUserLoggedIn: false,
      given_name: "",
      family_name: "",
      email: "",
      password: "",
      confirmationCode: ""
    }

    if (this.props.existingUser) {
      console.log(this.props.existingUser)
    }

    this.logOut = this.logOut.bind(this)
    this.logIn = this.logIn.bind(this)
    this.confirmWithCode = this.confirmWithCode.bind(this)
    this.signUp = this.signUp.bind(this)

    // this.validateConfirmationCode = this.validateConfirmationCode.bind(this)
    // this.handleChange = this.handleChange.bind(this)
    // this.validateForm = this.validateForm.bind(this)
  }

  isExistingUserConfirmed() {
    return ((this.props.existingUser) && (this.props.existingUser.UserStatus === 'CONFIRMED'))
  }

  existingUserNeedsToConfirm() {
    console.log(this.props.existingUser)
    return ((this.props.existingUser) && (this.props.existingUser.UserStatus !== "CONFIRMED"))
  }

  passwordIsEmpty() {
    return (this.state.password.length === 0)
  }

  validateConfirmationCode() {
    return( this.state.confirmationCode.length === 6 )
  }

  updateExistingUser() {
    (this.props.updateUser) && (this.props.updateUser())
  }

  validateSignUpForm() {
    return (
      this.state.email.length > 0 &&
      !this.passwordIsEmpty() &&
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
    .catch(err => console.log(err));

    this.setState({
      isUserLoggedIn: false
    })
  }

  logIn = async event => {
    event.preventDefault()

    Auth.signIn(this.props.username, this.state.password).then(
      u => {
        console.log(u)
        this.setState({ isUserLoggedIn: (u !== undefined) })
      },
      error => {
        console.log(error)
        this.setState({ isUserLoggedIn: false })
      }
    )
  }

  confirmWithCode = async event => {
    event.preventDefault()

    Auth.confirmSignUp(this.props.username, this.state.confirmationCode).then(
      conf => {
        console.log(conf)

        Auth.signIn(this.props.username, this.state.password).then(
          u => {
            console.log(u)
             this.setState({ isUserLoggedIn: (u !== undefined) })
          },
          error => {
            console.log(error)
            this.setState({ isUserLoggedIn: false })
          }
        )
      },
      error => {
        console.log(error)
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

      console.log(`Use ${this.state.password} for ${newUser}`)
      console.log(newUser)

      this.updateExistingUser()
  }


  render() {
     if (this.state.isUserLoggedIn) {
      // show username and logout
      return(
        <div>
          <h1>{this.state.username} Logged In</h1>
          <Button onClick={this.logOut}
            block size="large" type="button"
          >Log out</Button>
        </div>
      )
    } else if (this.isExistingUserConfirmed()) {
      // show password to login
      return(
        <div>
          <h1>Enter password for {this.state.username}</h1>
          <form onSubmit={this.logIn}>
            <FormGroup controlId="password" size="large">
              <FormLabel>Password</FormLabel>
              <FormControl
                value={this.state.password}
                onChange={this.handleChange} type="password" autoComplete="off" autoFocus
              />
            </FormGroup>
            <Button
              block size="large" type="submit" disabled={this.passwordIsEmpty}
            >Log in</Button>
          </form>
        </div>
      )
    } else if (this.existingUserNeedsToConfirm()) {
      // show confirmation code form
      return(
        <div>
          <h1>new user</h1>
          <form onSubmit={this.confirmWithCode}>
            <FormGroup controlId="confirmationCode" size="large">
              <FormLabel>Confirmation Code</FormLabel>
              <FormControl
                value={this.state.confirmationCode}
                onChange={this.handleChange} type="text" autoComplete="off" autoFocus
              />
            </FormGroup>
            <Button
              block size="large" type="submit"
              disabled={!this.validateConfirmationCode}
            >{'Confirm'}</Button>
          </form>
        </div>
      )
    } else {
      // existingUser should be null
      console.log(this.props.existingUser)
      // show signup form
      return(
        <div>
          <h1>Please sign up.</h1>

          <form onSubmit={this.signUp}>
            <FormGroup controlId="given_name" size="large">
              <FormLabel>First Name</FormLabel>
              <FormControl autoFocus autoComplete="on" type="text" onChange={this.handleChange}
                value={this.state.given_name}
              />
            </FormGroup>
            <FormGroup controlId="family_name" size="large">
              <FormLabel>Last Name</FormLabel>
              <FormControl autoComplete="on" type="text" onChange={this.handleChange}
                value={this.state.family_name}
              />
            </FormGroup>
            <FormGroup controlId="email" size="large">
              <FormLabel>Email</FormLabel>
              <FormControl
                autoFocus autoComplete="on" type="email" onChange={this.handleChange}
                value={this.state.email}
              />
            </FormGroup>
            <FormGroup controlId="password" size="large">
              <FormLabel>Password</FormLabel>
              <FormControl
                value={this.state.password}
                onChange={this.handleChange} type="password" autoComplete="off"
              />
            </FormGroup>
            <Button
              block size="large" type="submit"
              disabled={!this.validateSignUpForm()}
            >{'Sign up'}</Button>
          </form>
        </div>
      )
    }
  }
}

export default  Signup;