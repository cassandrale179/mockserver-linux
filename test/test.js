const assert = require('assert');
const config = require('os').homedir() + "//.aws/config";
const fs = require('fs');
const request = require('request');
const url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/';
const expect = require('chai').expect;
const os = require('os');

//---------- LIST OF MODULES TO BE USED -----------
const mockModule = require('../mock.js');
const readModule = require('../readconfig.js');


describe('Set proxy', function(){
    it ('should return http://proxy-server.bms.com:8080 for proxy', function(){
        assert.equal(process.env.http_proxy, 'http://proxy-server.bms.com:8080');
    });
});

describe('Configuration file', function(){
    it ('should be located in user .aws folder', function(){
        fs.stat(config, (err, stat) => {
            assert.equal(err, null);
        });

    });
});

describe('Parsing configuration file', function(){
    it('should return an array of profiles', function(done){
        readModule.read_config().then(result => {
            assert.equal(Array.isArray(result), true);
            done();
        });

    });
});


describe('Call to 169.254.169.254', function(){
    it ('should return status code as 200', function(done){
        request({'url':url,'proxy':'http://169.254.169.254/'}, function(error, response, body){
	    expect(response.statusCode).to.equal(200);
	});
        done();
    });
});

describe('Call to security credentials', function(){
    it ('should return an IAM role', function(done){
    	request({'url': url, 'proxy': 'http://169.254.169.254/'}, function(err, res, bod){
	    if (bod){
	    	var role = bod;
    		var newURL = url + role;
    		request({'url': newURL, 'proxy': 'http://169.254.169.254/'}, function(err2, res2, bod2){
    		    expect(res2.statusCode).to.equal(200);
    		});
	    }
	   });
        done();
    });
});

describe('Mockserver', function(){
    it ('should be located in user global node modules', function(done){
        var path = "";
        if (process.platform == 'linux'){
            path = '/usr/lib/node_modules/mockserver';
        }
        else{
            path = os.homedir() + '/AppData/Roaming/npm/node_modules/mockserver';
        }
        fs.stat(path, (err, stat) => {
            console.log(err);
            assert.equal(err, null);
        });
        done();
    });
});


describe('Check bmsmock', function(){
    var path = "";
    it ('should return bmsmock as an executable', function(done){
        if (process.platform == 'linux'){
            path = '/usr/bin/bmsmock';
        }
        else{
            path = os.homedir() + '/AppData/Roaming/npm/bmsmock';
        }
        fs.stat(path, (err, stat) => {
            console.log(err);
            assert.equal(err, null);
        });
        done();
    });
});


describe('Check bmsjwt', function(){
    var path = "";
    it ('should return bmsjwt as an executable', function(done){
        if (process.platform == 'linux'){
            path = '/usr/bin/bmsjwt';
        }
        else{
            path = os.homedir() + '/AppData/Roaming/npm/bmsjwt';
        }
        fs.stat(path, (err, stat) => {
            console.log(err);
            assert.equal(err, null);
        });
        done();
    });
});


describe('Check executable path on Linux and Windows', function(){
    var path = "";
    it('should return linprofile or winprofile as an executable', function(done){
        if (process.platform == 'linux'){
       	 path = '/usr/bin/linprofile';
        }
        else{
         path = os.homedir() + '/AppData/Roaming/npm/winprofile';
        }
        fs.stat(path, (err, stat) => {
            assert.equal(err, null);
        });
        done();
    });
});
