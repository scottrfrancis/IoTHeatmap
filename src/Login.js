import React, { Component } from 'react'
import { Button, FormGroup, FormControl, FormLabel } from "react-bootstrap";


class Login extends Component {
  constructor(props) {
    super(props)
    
    this.state = {
     password: ""
    }
  }
  
  validateForm() {
    return (
      this.state.password.length > 0
    )
  }
  
  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    })
  }
  
  
  handleSubmit = async event => {
    event.preventDefault()
    
    // call the provided signup function
    this.props.toSignin(this.state.password)
  }

  render() {
  return(
    <div>
      <h1>Please sign IN.</h1>
      
      <form onSubmit={this.handleSubmit}>
          <FormGroup controlId="password" size="large">
            <FormLabel>Password</FormLabel>
            <FormControl
              value={this.state.password}
              type="password" autoComplete="off"
              onChange={this.handleChange}
            />
          </FormGroup>
  
          <Button
            block size="large" 
            disabled={!this.validateForm()}
            type="submit"
          >{'Sign in'}</Button>
      </form>
    </div>  
  )
}
}

export default  Login;