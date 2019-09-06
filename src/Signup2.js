import { Auth } from 'aws-amplify'
import React, { Component } from 'react'
import { Alert, Button, Col, Form, FormGroup, FormControl, FormLabel, Row } from "react-bootstrap"
import ReactMarkdown from 'react-markdown'


const apiEndpoint = 'https://pqu8ca43d3.execute-api.us-west-2.amazonaws.com/test'


const labelSize = 3
const controlSize = 3

class Signup2 extends Component {
  constructor(props) {
    super(props)

    this.state = {
      email: (this.props.username != "#") ? this.props.username : '',
      studentName: '',
      confirmationCode: "",
      event: {},
      credentials: "",

      errorMessage: ""
    }

    this.confirmWithCode = this.confirmWithCode.bind(this)
  }

  componentDidMount() {
    let url = apiEndpoint + "/events/next?p=" + this.props.partner
    fetch(url)
    .then((res) => {return res.json()})
    .then((data) => {
      console.log(data)
      this.setState({ event: data.body })
    })
    .catch(console.log)

    this.updateCredentials()
  }

  componentDidUpdate() {
    this.updateCredentials()
  }

  updateCredentials = () => {
    if (this.props.isUserLoggedIn && (this.props.username !== '') && (this.state.email !== '')
      &&  (this.state.credentials === '')) {
      let url = apiEndpoint + "/users/" + this.state.email + "/students/next"
      console.log("calling api " + url)
      fetch(url, {
        method: 'PUT'
      })
      .then((res) => {return res.json()})
      .then((data) => {
        console.log(data)

        if (data.statusCode !== 200) {
          console.log("error adding student to user " + data.body)
          this.setState({errorMessage: data.body})
        } else {
          this.setState({
            errorMessage: "",
            studentName: data.body.studentName,
            credentials: data.body.credentials
          })
          this.updateExistingUser(this.state.email)
        }
      })
    }
  }

 handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    })
  }

  validateConfirmationCode = () => {
    return( this.state.confirmationCode.length > 0 )
  }

 updateExistingUser(studentName) {
    (this.props.updateUser) && (this.props.updateUser(studentName));
  }

  confirmWithCode = async event => {
    event.preventDefault()

    let url = apiEndpoint + "/users/" + this.state.email + "/events?p=" + this.state.confirmationCode
    console.log("calling api " + url)
    fetch(url, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(this.state.event) })
    .then((res) => {return res.json()})
    .then((data) => {
      console.log(data)
      // check return code
      if (data.statusCode !== 200) {
        console.log("error adding event to user " + data.body)
        this.setState({errorMessage: data.body})
      } else {
        this.setState({errorMessage: ""})
        this.updateExistingUser(this.state.email)
      }
    })
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


  handleError = (err) => {
    console.log(err)
  }


  confirmationForm() {
    return (
      <Form onSubmit={this.confirmWithCode}>
        <FormGroup controlId="email" size="large">
          <FormLabel >Email Address</FormLabel>
          <FormControl
            value={this.state.email}
            onChange={this.handleChange} type="email" autoComplete="on" autoFocus />
        </FormGroup>
        <FormGroup controlId="confirmationCode" size="large">
          <FormLabel >Confirmation Code</FormLabel>
          <FormControl
              value={this.state.confirmationCode}
              onChange={this.handleChange} type="text" autoComplete="off"  />
        </FormGroup>
        <Button
            block size="large" type="submit"
            disabled={!this.validateConfirmationCode()}
        >{'Confirm'}</Button>
      </Form>
    )
  }


  render() {
    if (this.props.isUserLoggedIn) {
      return(
        <div>
            <h6><b>{this.state.studentName}</b> Logged In</h6>
            <ReactMarkdown
              className={'Credentials'}
              source={this.state.credentials} />
        </div>
      )
    } else /*if (this.existingUserNeedsToConfirm())*/ {
      // show confirmation code form
      return(
        <div>
          <Col xs={0} sm={2} md={4} large={8} xl={12}/>
          <Col xs={4} sm={8} md={8} large={8} xl={12}>
          {(this.state.event !== undefined) && <h3>Welcome to {this.state.event.partner}'s {this.state.event.name}</h3>}
          {this.errorAlert()}
          {this.confirmationForm()}
          </Col>
        </div>
      )
    }
  }
}

export default  Signup2;