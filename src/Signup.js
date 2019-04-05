import { Auth } from 'aws-amplify'
import React, { Component } from 'react'
import { Button, FormGroup, FormControl, FormLabel } from "react-bootstrap";


class Signup extends Component {
  constructor(props) {
    super(props)
    
    this.state = {
      isUserConfirmed: false,
      isUserLoggedIn: false,
      
      given_name: "",
      family_name: "",
      email: "",
      password: "",
      username: this.props.username,
      confirmationCode: ""
    }
    
    if (this.props.existingUser) {
      console.log(this.props.existingUser)
    }
    
    
    this.logOut = this.logOut.bind(this)
    this.handleConfirm = this.handleConfirm.bind(this)
    this.validateConfirmationCode = this.validateConfirmationCode.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.validateForm = this.validateForm.bind(this)
    this.handlePassword = this.handlePassword.bind(this)
    this.passwordIsEmpty = this.passwordIsEmpty.bind(this)
    this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this)
  }
  
  componentWillReceiveProps(props) {
    if (props.existingUser !== undefined) {
      this.setState({
        user: props.existingUser,
        isUserConfirmed: props.existingUser.UserStatus === 'CONFIRMED'
      }) 
    }
  }
  
  passwordIsEmpty() {
    return (this.state.password.length === 0)
  }
  
  handlePassword = async event => {
    event.preventDefault()

    Auth.signIn(this.props.username, this.state.password).then(
      u => {
        console.log(u)

        this.setState({
          user: u,
          isUserLoggedIn: (u !== undefined)
        })
      },
      error => {
        console.log(error)
        
        this.setState({
          user: null,
          isUserLoggedIn: false
        })
      }
    )
  }
  
  validateForm() {
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
  
  handleSubmit = async event => {
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
      this.setState({
        user: newUser,
        isUserConfirmed: newUser.userConfirmed
      })
  }
  
  validateConfirmationCode() {
    return( this.state.confirmationCode.length === 6 )
  }
  
  handleConfirm = async event => {
    event.preventDefault()
    
    Auth.confirmSignUp(this.props.username, this.state.confirmationCode).then(
      conf => {
        console.log(conf)
        
        this.setState({
          isUserConfirmed: (conf === 'SUCCESS')
        })
        
        Auth.signIn(this.props.username, this.state.password).then(
          u => {
            console.log(u)
  
             this.setState({
              user: u,
              isUserLoggedIn: (u !== undefined)
            })
          },
          error => {
            console.log(error)
            
            this.setState({
              user: null,
              isUserLoggedIn: false
            })
          }
        )
      },
      error => {
        console.log(error)
        
        this.setState({
          isUserConfirmed: false
        })
      }
    )
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
    } else if (this.state.user !== undefined) {
      if (this.state.isUserConfirmed) {
        // show password to login
        return(
          <div>
            <h1>Enter password for {this.state.username}</h1>
            <form onSubmit={this.handlePassword}>
              <FormGroup controlId="password" size="large">
                <FormLabel>Password</FormLabel>
                <FormControl
                  value={this.state.password}
                  onChange={this.handleChange}
                  type="password" autoComplete="off"
                />
              </FormGroup>
              
              <Button
                block size="large" type="submit"
                disabled={this.passwordIsEmpty}
              >Log in</Button>
            </form>
          </div>
        )
      } else {
        // show confirmation code form
        return(
          <div>
            <h1>new user</h1>
            <form onSubmit={this.handleConfirm}>
              <FormGroup controlId="confirmationCode" size="large">
                <FormLabel>Confirmation Code</FormLabel>
                <FormControl
                  value={this.state.confirmationCode}
                  onChange={this.handleChange}
                  type="text" autoComplete="off" autoFocus
                />
              </FormGroup>
              
              <Button
                block size="large" type="submit"
                disabled={!this.validateConfirmationCode}
              >{'Confirm'}</Button>
            </form>
          </div>
        )
      }
    } else {
      // show signup form
      return(
        <div>
          <h1>Please sign up.</h1>
          
          <form onSubmit={this.handleSubmit}>
    
              <FormGroup controlId="given_name" size="large">
                <FormLabel>First Name</FormLabel>
                <FormControl autoFocus autoComplete="on" type="text"
                  value={this.state.given_name}
                  onChange={this.handleChange}
                />
              </FormGroup>
              <FormGroup controlId="family_name" size="large">
                <FormLabel>Last Name</FormLabel>
                <FormControl autoFocus autoComplete="on" type="text"
                  value={this.state.family_name}
                  onChange={this.handleChange}
                />
              </FormGroup>
            
            <FormGroup controlId="email" size="large">
                <FormLabel>Email</FormLabel>
                <FormControl
                  autoFocus autoComplete="on" type="email"
                  value={this.state.email}
                  onChange={this.handleChange}
                />
              </FormGroup>
              <FormGroup controlId="password" size="large">
                <FormLabel>Password</FormLabel>
                <FormControl
                  value={this.state.password}
                  onChange={this.handleChange}
                  type="password" autoComplete="off"
                />
              </FormGroup>
  
              <Button
                block size="large" type="submit"
                disabled={!this.validateForm()}
              >{'Sign up'}</Button>
          </form>
        </div>  
      )    
    }
  }
}

export default  Signup;