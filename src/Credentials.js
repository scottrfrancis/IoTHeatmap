import Amplify from 'aws-amplify'
import React, { Component } from 'react'
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
        <h2>your data here</h2>
        <ReactMarkdown source={this.state.data} />
      </div>
    )
  }
}


export default Credentials;