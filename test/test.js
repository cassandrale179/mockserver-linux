const assert = require('assert');
const config = require('os').homedir() + "//.aws/config";
const fs = require('fs');

//------------- LIST OF MODULES TO BE USED ------------
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
    it ('should return status code at 200', function(done){
        done();
    });
});

describe('Call to security credentials', function(){
    it ('should return an IAM role', function(done){
        done();
    });
});
