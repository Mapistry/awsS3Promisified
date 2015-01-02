var AWS = require('aws-sdk');
var BluebirdPromise = require('bluebird');
var fs = require('fs');
var _ = require('underscore');

var awsS3Promisified = {

  initialize: function() {
    var accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    var secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error( 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be defined.' );
    }

    AWS.config.update({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    });

    return this;
  },

  getDefaultExpiration: function() {
    // This value is 8 hours in seconds
    return 28800;
  },

  saveObjectToFile: function(bucket, key, path) {
    return new BluebirdPromise(function(resolve, reject) {
      var s3 = new AWS.S3();
      var params = {Bucket: bucket, Key: key};
      var writeStream = fs.createWriteStream(path);

      s3.getObject(params).createReadStream().pipe(writeStream);

      writeStream.on('finish', function () {
        resolve(path);
      })
      .on('error', function (err) {
        reject('Writestream to ' + path + ' did not finish successfully: ' + err);
      });
    });
  },

  getSignedURL: function(bucket, key) {
    var s3 = new AWS.S3();
    var params = {
      Bucket: bucket,
      Key: key,
      Expires: this.getDefaultExpiration()
    };

    return new BluebirdPromise(function(resolve, reject){
      s3.getSignedUrl('getObject', params, function(error, url){
        if (error) { reject(error); }
        else { resolve(url); }
      });
    });
  },

  getObject: function(bucket, key) {
    return new BluebirdPromise(function(resolve, reject){
      var s3 = new AWS.S3();
      var params = {Bucket: bucket, Key: key};

      var readStream = s3.getObject(params).createReadStream();

      readStream.on('readable', function(){
        resolve(readStream);
      })
      .on('error', function(){
        reject('Readstream did not complete.');
      });
    });
  },

  /* List all the objects in a particular bucket
   *
   * Parameters:
   *    bucket: String
   *        List the objects in this buck
   *    prefix: String (or undefined)
   *        only list the objects with this prefix.
   *
   * Return:
   *    bluebird promise
   */
  listObjects: function(bucket, prefix) {
    return new BluebirdPromise(function(resolve, reject){
      var s3 = new AWS.S3(),
          params = { Bucket: bucket};

      if (prefix) {
        params.Prefix = prefix;
      }

      s3.listObjects(params, function(error, data){
        if (error) { reject(error); }
        else { resolve(data); }
      });
    });
  },

  /* Delete an object from S3
   *
   * Parameters:
   *    bucket: String
   *        List the objects in this bucket
   *    key: String
   *        This is the name of the file to delete
   *
   * Return:
   *    bluebird promise
   */
  deleteObject: function(bucket, key) {
    return new BluebirdPromise(function(resolve, reject){
      var s3 = new AWS.S3();
      var params = { Bucket: bucket, Key: key};

      s3.deleteObject(params, function(error, data){
        if (error) { reject(error); }
        else { resolve(data); }
      });
    });
  },

  /* Put an object in S3
   *
   * Parameters:
   *    bucket: String
   *        Put the object in this bucket
   *    key: String
   *        Save the object under this key
   *    body: new Buffer('...') || streamObject || 'STRING_VALUE'
   *        The data to be saved to S3
   *    contentLength: int
   *        The size of the object that is being uploaded
   *
   * Return:
   *    bluebird promise
   */
  putObject: function(bucket, key, body, contentLength) {
    return new BluebirdPromise(function(resolve, reject){
      var s3 = new AWS.S3();
      var params = {
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentLength: contentLength
      };

      s3.putObject(params, function(error, data){
        if (error) { reject(error); }
        else { resolve(data); }
      });
    });
  },

  /* Put an object in S3
   *
   * Parameters:
   *    bucket: String
   *        Put the object in this bucket
   *    key: String
   *        Save the object under this key
   *
   * Return:
   *    bluebird promise
   */
  putFile: function(bucket, key, filepath) {
    var fs = require('fs');
    var stat = BluebirdPromise.promisify(fs.stat);

    return BluebirdPromise.bind(this)
      .then(function() { return stat(filepath); })
      .then(function(fileInfo) {
        var bodyStream = fs.createReadStream(filepath);

        return this.putObject(bucket, key, bodyStream, fileInfo.size);
      });
  },

  /* Copy an object in s3
   *
   * Parameters:
   *    srcBucket: String
   *        Copy the object from this bucket
   *    srcKey: String
   *        Copy this key
   *    dstBucket: String
   *        Copy the object to this bucket
   *    dstKey: String
   *        Create a new object name dstKey
   *
   * Return:
   *    bluebird promise
   */
  copyObject: function(srcBucket, srcKey, dstBucket, dstKey) {
    return new BluebirdPromise(function(resolve, reject){
      var s3 = new AWS.S3();
      var params = {
        Bucket: dstBucket,
        Key: dstKey,
        CopySource: srcBucket + '/' + srcKey
      };

      s3.copyObject(params, function(error, data){
        if (error) { reject(error); }
        else { resolve( _.extend(data, {key: dstKey} )); }
      });
    });
  }

};

module.exports = awsS3Promisified.initialize();
