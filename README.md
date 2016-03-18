awsS3Promisified
================

A node module for interacting with Amazon S3. All functions use Bluebird promises.

###Installation:
```
npm install aws-s3-promisified
```

###Usage:
#####Option 1: environmental variables.
Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as environment variables, then Node will configure AWS automatically.
```
var aws = require('aws-s3-promisified');
```
#####Option 2: set environment variables manually
```
var aws = require('aws-s3-promisified').initialize(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY);
```

All these functions return a Bluebird promise.
```
// Upload a file to S3
aws.putFile(bucket, key, filepath);

// Download a file from S3 and save it locally
aws.saveObjectToFile(bucket, key, filepath);

// Get a URL for a file on S3 taht will expire in 8 hours
var url = aws.getSignedURL(bucket, key);

// Get a ReadStream for a file on S3
var readstream = aws.getObject(bucket, key);

// List all the objects in a bucket
aws.listObjects(bucket);

// List all the objects in a bucket starting with a specific prefix:
aws.listObjects(bucket, prefix);

// Delete a file from S3
aws.deleteObject(bucket, key);

// Put a Buffer, streamObject or string on S3
aws.putObject(bucket, key, body, contentLength);

// Copy an object on S3 from one location to another
aws.copyObject(srcBucket, srcKey, dstBucket, dstKey);
```

####Testing:
These tests will store data on S3, they aren't just stubs. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be defined.
```
npm test
```
