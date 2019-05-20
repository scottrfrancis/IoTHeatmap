import Amplify from 'aws-amplify'
import React, { Component } from 'react'
import { Button, Col } from "react-bootstrap";
import ReactMarkdown from 'react-markdown'
import AWS from 'aws-sdk'
import awsconfig from './aws-exports'


Amplify.configure(awsconfig)

class Credentials extends Component {
  constructor(props) {
    super(props)

    this.state = {
      data: "",
      hideCreds: false
    }
  }

  componentDidMount() {
    if (this.props.disabled) {
      this.setState({ data: "" })
      return
    }

    const key = this.props.username + "/" + this.props.username + "_credentials.txt"
    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
    })

    s3.getObject({
      Bucket: this.props.bucketName,
      Key: key
    }, (err, data) => {
      if (err) {
        // console.log(err)
        this.setState({ data: "" })
      } else {
        (data.Body) && this.setState({ data: data.Body.toString() })
      }
    })
  }

  hideCreds = async event => {
    event.preventDefault()

    this.setState({
      hideCreds: true
    })
  }

  showCreds = async event => {
    event.preventDefault()

    this.setState({
      hideCreds: false
    })
  }

  render() {
    return(
      <div>
        {(this.state.hideCreds &&
        <Button size="sm" type="button" onClick={this.showCreds}>Show Credentials</Button>)
        ||
        <Col sm={8}>
          <h3>Credentials and Login Data</h3>
          <ReactMarkdown
            className={'Credentials'}
            source={this.state.data} />
          <Button size="sm" type="button" onClick={this.hideCreds}>Hide</Button>
        </Col>}
      </div>
    )
  }
}


export default Credentials;