var AWS = require('aws-sdk');
var BluebirdPromise = require('bluebird');
var fs = require('fs');
var _ = require('underscore');


var awsS3Promisified = function (config) {

  if (config && config.accessKeyId && config.secretAccessKey) {
    AWS.config.update(config);
  }

  // default expiration time to 8 hours
  setExpirationInSeconds(28800);

  return {
    setExpirationInSeconds: setExpirationInSeconds,
    getExpirationInSeconds: getExpirationInSeconds,
    saveObjectToFile: saveObjectToFile,
    getSignedURL: getSignedURL,
    getObject: getObject,
    listObjects: listObjects,
    deleteObject: deleteObject,
    putObject: putObject,
    putFile: putFile,
    copyObject: copyObject
  }
};

module.exports = awsS3Promisified;




var setExpirationInSeconds = function (t) {
  this.expirationTime = t;
};

var getExpirationInSeconds = function () {
  return this.expirationTime;
};

var saveObjectToFile = function (bucket, key, path) {
  return new BluebirdPromise(function (resolve, reject) {
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
};

var getSignedURL = function (bucket, key, options) {
  var s3 = new AWS.S3();
  var params = {
    Bucket: bucket,
    Key: key,
    Expires: this.getExpirationInSeconds()
  };

  options = options || {};
  var operation = options.operation || 'getObject';

  if (options.contentType) {
    params.ContentType = options.contentType;
  }

  if (options.ACL) {
    params.ACL = options.ACL;
  }

  if (options.ResponseContentDisposition) {
    params.ResponseContentDisposition = options.ResponseContentDisposition;
  }

  return new BluebirdPromise(function (resolve, reject) {
    s3.getSignedUrl(operation, params, function (error, url) {
      if (error) {
        reject(error);
      }
      else {
        resolve(url);
      }
    });
  });
};

var getObject = function (bucket, key) {
  return new BluebirdPromise(function (resolve, reject) {
    var s3 = new AWS.S3();
    var params = {Bucket: bucket, Key: key};

    var readStream = s3.getObject(params).createReadStream();

    readStream.on('readable', function () {
        resolve(readStream);
      })
      .on('error', function () {
        reject('Readstream did not complete.');
      });
  });
};

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
var listObjects = function (bucket, prefix) {
  return new BluebirdPromise(function (resolve, reject) {
    var s3 = new AWS.S3();
    var params = {Bucket: bucket};

    if (prefix) {
      params.Prefix = prefix;
    }

    s3.listObjects(params, function (error, data) {
      if (error) {
        reject(error);
      }
      else {
        resolve(data);
      }
    });
  });
};


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
var deleteObject =function (bucket, key) {
  return new BluebirdPromise(function (resolve, reject) {
    var s3 = new AWS.S3();
    var params = {Bucket: bucket, Key: key};

    s3.deleteObject(params, function (error, data) {
      if (error) {
        reject(error);
      }
      else {
        resolve(data);
      }
    });
  });
};

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
var putObject = function (bucket, key, body, contentLength) {
  return new BluebirdPromise(function (resolve, reject) {
    var s3 = new AWS.S3();
    var params = {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentLength: contentLength
    };

    s3.putObject(params, function (error, data) {
      if (error) {
        reject(error);
      }
      else {
        resolve(data);
      }
    });
  });
};

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
var putFile = function (bucket, key, filepath) {
  var fs = require('fs');
  var stat = BluebirdPromise.promisify(fs.stat);

  return BluebirdPromise.bind(this)
    .then(function () {
      return stat(filepath);
    })
    .then(function (fileInfo) {
      var bodyStream = fs.createReadStream(filepath);

      return this.putObject(bucket, key, bodyStream, fileInfo.size);
    });
};

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
var copyObject = function (srcBucket, srcKey, dstBucket, dstKey) {
  return new BluebirdPromise(function (resolve, reject) {
    var s3 = new AWS.S3();
    var params = {
      Bucket: dstBucket,
      Key: dstKey,
      CopySource: srcBucket + '/' + srcKey
    };

    s3.copyObject(params, function (error, data) {
      if (error) {
        reject(error);
      }
      else {
        resolve(_.extend(data, {key: dstKey}));
      }
    });
  });
};

