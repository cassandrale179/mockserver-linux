const fs = require('fs');
const util = require('util');
const os = require('os');
const exec = util.promisify(require('child_process').exec);
const request = require('request');
const AWS = require('aws-sdk');
const url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/';


//process.on('unhandledRejection', (reason, p) => {console.log(p)}); 

//--------------- FIX AWS PATH -------------
var AWSPath = "";
if (process.platform == 'win32') AWSPath = os.homedir() + "\\.aws\\TempCredScript.js --tcws_url=";
else AWSPath = os.homedir() + "/.aws/TempCredScript.js --tcws_url=";

//----------- SET PROXY FOR BMS --------------
var tunnel = require('tunnel');
var tunnelingAgent = tunnel.httpsOverHttp({
    proxy: {
        host: 'proxy-server.bms.com',
        port: 8080
    }
});
AWS.config.httpOptions = { agent: tunnelingAgent };

//--------------- FUNCTION TO CHECK FILE INSTANCE ON EC2 -----------
function credentialSource(args){
    return new Promise((resolve, reject) => {
        request(url, function(error, response, body){
            console.log('error', error);
            console.log('statusCode:', response && response.statusCode);
            console.log('body: ', body);

            if (body){
                var role = body;
                var roleURL = url + role;
                request(roleURL, function(error, response, body){
                    var data = JSON.parse(body);
                    console.log(data);
                    if (data.AccessKeyId && data.SecretAccessKey && data.Expiration){
                       console.log(data);
                       resolve(data);
                   }
                   else{
                       console.log('Could not get data with the given role');
                       reject(data); 
		       return; 
                   }
               });
            }
            else{
                reject('Could not get role name', body);
		return; 
            }
        });
    });
}



//-------  GET ASSUME ROLE INFORMATION ------
function checkFileRole(p, json){
    return new Promise((resolve, reject) => {

                console.log('ASSUME ROLE ARN!!!!!', p.assume_role_arn);
                if (p.role_session_name == '')
                    p.role_session_name = os.hostname();

                var accesskey = json.AccessKeyId;
                var secretkey = json.SecretAccessKey;
                var token = json.SessionToken;

                var params = {
                    RoleArn: p.assume_role_arn,
                    RoleSessionName: p.role_session_name
                };


                console.log("Access key, secret key, and token");
                console.log(accesskey, secretkey, token);
		if (acceskskey == undefined || secretkey == undefined){
		    console.log(json);
		    console.log("ACCESS KEY IS UNDEFINED!!!!!");
		    reject("cannot get key for this", json); 
		}

                else if (accesskey && secretkey ){
                    var creds = {accessKeyId: accesskey,
                        secretAccessKey: secretkey};
                    if (token){
                        creds.sessionToken= token;
                    }
                    var sts = new AWS.STS(creds);

                    //---- GET DATA FROM STS ----
                    sts.assumeRole(params, function(err, data) {
                        if (err) console.log("[Error: ] User cannot assume this role", err);
                        else {
                            if (data.Credentials){
                                data.Credentials.target = p.target;
                                resolve(data.Credentials);
                            }
                            else{
                                reject("Unable to Assume Role ", params);
                            }
                        }
                    });
                }
        });
}


//----------- GET JSON FILE -----------
function getJSON(args){
    // console.log("Getting jSON is called for", args[0]);

    var promise = new Promise((resolve, reject ) => {
            p = args[0]; datacsv = args[1];

        //------- IF IT'S A CREDENTIAL PROCESS -------
        if (p.hasOwnProperty("credential_process")){
            var localContextFunction = function(p2){ return function (output) {
                var stdout = output.stdout;
                var stderr = output.stderr;
                var result = (JSON.parse(stdout));
                if (result){
                    result.target = p2.target;
                    resolve(result);
		    return;
                }
                else{
                    reject("Execute failed to return JSON ", p2.credential_process, result);
		    return;
                }
            }};

            var ind = p.credential_process.indexOf("tcws_url=");
            var url = p.credential_process.substring(ind+9, p.credential_process.length);
            var command = "node " + AWSPath + url;
            exec(command)
            .then(localContextFunction(p));
        }

        //------- IF IT'S A CREDENTIAL SOURCE -------
        else if (p.hasOwnProperty("credential_source")){
            return credentialSource(p);
        }

        //-------- IF IT'S A SOURCE PROFILE --------
        else if (p.hasOwnProperty("source_profile")){
            datacsv.forEach(parent => {
                if (parent.source == p.source_profile){
                    return getJSON([parent, datacsv]);
                }
            });
        }

        else{
	    // this shouldn't happen here.... Catch it at parsing, not in processor.
	    reject("credential_source, source_profile or credential_process not found for "+p);
	    return;
        }
    });


    //------------ IF IT HAS AN ASSUME ROLE, CALLED CHECK FILE ROLE ---------
    promise.then(json => {
        return new Promise(function(resolve2, reject2){
        if (!json){
            console.log("JSON IS UNDEFINED!", json, args);
	    reject2("JSON IS UNDEFINED");
	    return;
        }
	else if (json.hasOwnProperty('SecretAccessKey')== false){
	    console.log("JSON doesn't have key", json); 
	    reject2("NO KEY RECEIVED! JSON IS "+ json, json);
	    return;
	}
        if (args[0].assume_role_arn && json){
            console.log("ASSUME ROLE AND JSON ARE VALID TO MAKE CALL", json);
            return checkFileRole(args[0], json);
        }
        else return (json);
 
	});
    }).catch(err => {
    	console.log("Error", err); 
    }); 
    return promise;
}
exports.getJSON = getJSON;
