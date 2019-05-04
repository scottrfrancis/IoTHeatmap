import Amplify from 'aws-amplify'
import React, { Component } from 'react'
import { Button, Col, Form, FormGroup, FormControl, FormLabel } from "react-bootstrap";
// import ReactMarkdown from 'react-markdown'
// import AWS from 'aws-sdk'
import awsconfig from './aws-exports'


Amplify.configure(awsconfig)

class Student extends Component {
  constructor(props) {
    super(props)

    this.state = { studentNumber: this.props.studentNumber }

    this.studentNumberNotEmpty = this.studentNumberNotEmpty.bind(this)
    this.selectStudent = this.selectStudent.bind(this)
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    })
  }

  studentNumberNotEmpty = () => {
    return (this.state.studentNumber.length !== 0)
  }

  selectStudent = () => {
    if (this.props.onSetStudentNumber !== null) {
      this.props.onSetStudentNumber(this.state.studentNumber)
    }
  }

  render() {
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
}


export default Student