import Amplify from 'aws-amplify'
import React, { Component } from 'react'
import { Col } from "react-bootstrap";
import ReactMarkdown from 'react-markdown'
import AWS from 'aws-sdk'
import awsconfig from './aws-exports'


Amplify.configure(awsconfig)

class Credentials extends Component {
  constructor(props) {
    super(props)

    this.state = { data: "" }
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

  render() {
    return(
      <div>
        <Col sm={8}>
          <h3>Credentials and Login Data</h3>
          <ReactMarkdown
            className={'Credentials'}
            source={this.state.data} />
        </Col>
      </div>
    )
  }
}


export default Credentials;