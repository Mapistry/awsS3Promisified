var expect = require('expect.js');
var sinon = require('sinon');
var _ = require('underscore');
var restler = require('restler');
var BluebirdPromise = require('bluebird');
var fs = BluebirdPromise.promisifyAll(require('fs'));
var path = require('path');
var AWS = require('../index')();

// NOTE: These tests aren't just stubs. They actually save files to aws, and
// retrieve them.

describe('AWS', function() {
  this.timeout(10000);
  var sandbox, bucket = 'testingTempStorage';
  var awsReadstream, filepath, saveFilepath;
  var downloadReadStream, listObjectsData, key, copyKey;
  var listObjectsAfterDeleteData, signedURL, signedURLResp;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  before(function(done) {
    var downloadedRead = false;

    // Create the key with a random number so that tests being run at the same
    // time won't cause problems.
    key = 'grumpyCat' + Math.floor(Math.random() * 10000) + '.jpg';

    copyKey = 'grumpyCat' + Math.floor(Math.random() * 10000) + 'Copy.jpg';
    filepath = path.resolve(__dirname, './assets/cat.jpeg');
    saveFilepath = path.resolve(__dirname, './assets/catCopy.jpeg');

    return AWS.putFile(bucket, key, filepath)
      .then(function(){
        return AWS.getObject(bucket, key);
      }).then(function(readstream) {
        awsReadstream = readstream;
        return AWS.copyObject(bucket, key, bucket, copyKey);
      }).then(function(){
        return AWS.listObjects(bucket, 'grumpy');
      }).then(function(data){
        listObjectsData = data;
        return AWS.saveObjectToFile(bucket, key, saveFilepath);
      }).then(function() {
        downloadReadStream = fs.createReadStream(saveFilepath);
        return AWS.getSignedURL(bucket, key);
      }).then(function(url){
        signedURL = url;
        restler.get(signedURL)
          .on('complete', function(resp){
            signedURLResp = resp;
            return deleteDataUploadedToS3()
              .then(listObjectsStartingWithGrumpy)
              .then(readFileDownloadedFromS3);
          });
      });

    function deleteDataUploadedToS3() {
      return BluebirdPromise.all([
        AWS.deleteObject(bucket, key),
        AWS.deleteObject(bucket, copyKey)
      ]);
    }

    function listObjectsStartingWithGrumpy() {
      return AWS.listObjects(bucket, 'grumpy')
        .then(function(data){
          listObjectsAfterDeleteData = data;
        });
    }

    function readFileDownloadedFromS3() {
      downloadReadStream.on('readable', function(){
        if(!downloadedRead){
          downloadedRead = true;
          done();
        }
      });
    }
  });

  after(function() {
    return fs.unlinkAsync(saveFilepath);
  });

  it('the same file that is put on S3 can be retrieved', function(done){
    var localReadStream = fs.createReadStream(filepath);
    var readBeginning = false;
    localReadStream.on('readable', function() {
      if (!readBeginning) {
        expect(awsReadstream.read(10)).to.eql(localReadStream.read(10));
        readBeginning = true;
        done();
      }
    });
  });

  it('original file matches file downloaded from s3', function(done){
    var originalReadStream = fs.createReadStream(filepath);
    var readBeginning = false;

    originalReadStream.on('readable', function(){
      if (!readBeginning) {
        expect(downloadReadStream.read(10)).to.eql(originalReadStream.read(10));
        readBeginning = true;
        done();
      }
    });
  });

  it('file exists in listed files', function() {
    var keys = _.map(listObjectsData.Contents, function(item){
      return item.Key;
    });
    expect(keys).to.contain(key);
  });

  it('copied file exists in listed files', function() {
    var keys = _.map(listObjectsData.Contents, function(item){
      return item.Key;
    });
    expect(keys).to.contain(copyKey);
  });

  it('file deleted successfully', function() {
    var keys = _.map(listObjectsAfterDeleteData.Contents, function(item){
      return item.Key;
    });
    expect(keys).not.to.contain(key);
  });

  it('getSignedURL provides link to file', function() {
    // make sure file size is within 3% the same as the original
    return fs.statAsync(filepath).then(function(fileInfo){
      expect(Math.abs((fileInfo.size / signedURLResp.length) - 1)).to.be.lessThan(0.03);
    });
  });
});
