const fs = require('fs');
const util = require('util');
const tunnel = require('tunnel');
const moment = require('moment');
const AWS = require('aws-sdk');
const os = require('os');
const config = os.homedir() + "//.aws/config";
const read_promise = util.promisify(fs.readFile);
const write_promise = util.promisify(fs.writeFile);

//------- LIST OF MODULES ------
const readconfigModule = require('./readconfig.js');
const getkeyModule = require('./getkey.js');
const writecredModule = require('./writecred.js');

proxyserver = process.env.http_proxy;


process.on("unhandledRejection", (reason,p) => { console.log(p) }); 


//------ THE INITIAL CALL TO READ CONFIG FILE -----
if (proxyserver != undefined){
    hostname = proxyserver.substring(7,proxyserver.length-5);
    port = proxyserver.substring(proxyserver.length-4, proxyserver.length);
    var tunnelingAgent = tunnel.httpsOverHttp({
        proxy: {
            host: hostname,
            port: port
        }
    });
    AWS.config.httpOptions = { agent: tunnelingAgent };
    callConfig();
}
else{
    console.log("[Error: ] The proxy is not defined");
}

var timeouts = [];

//------- HAVE A WATCH FUNCTION THAT MONITOR CHANGE ----
fs.watchFile(config, (curr, prev) => {
  if (prev.mtime) callConfig();
});


//------- GET PROFILE FROM CONFIG FILE -----
function callConfig(){
    readconfigModule.read_config().then(datacsv => {

        //-------- WHEN CONFIG IS MODIFIED, MODIFY TIMEOUT -----
        var timeoutTarget = timeouts.map(x => x.target);
        var datacsvTarget = datacsv.map(x => x.target);

        //------- IF USER REMOVE A PROFILE ON CONFIG --------
        timeouts = timeouts.filter(x => {
            if (!datacsvTarget.includes(x.target))
                clearTimeout(x.timeout);
            return datacsvTarget.includes(x.target);
        });


        //------ IF USER ADD A NEW PROFILE ON CONFIG ------
        datacsv.forEach(p => {
            if (!timeoutTarget.includes(p.target)){
                if (p.target != undefined){
                    timeouts.push({
                        target: p.target,
                        setTimeout: setTimeout(Processor, 0, [p, datacsv])
                    });
                }
            }
        });
    }).catch(err => {
        console.log(err);
        reject(err);
    });
}

//----- WRITE TO CRED FILE -----
async function execute(args){
    writecredModule.writeFile(args);
}

function Processor(args){
    // console.log("The number should not increase", timeouts.length);
    var localargs = args
     console.log("args is ", args[0]);
    return getkeyModule.getJSON(localargs).then(async function (retVal){


        //------------- EXTRACT RELEVANT PARAMETERS ------------
        var target = retVal.target;
        var access = retVal.AccessKeyId;
        var secret = retVal.SecretAccessKey;
        var token = retVal.SessionToken; //? optional
        var exp = retVal.Expiration; //? optional

        console.log("Return value", retVal);

        if (access && secret){

            //-------------- IF EXPIRATION EXIST, THEN CALCULTE WHEN IT EXPIRES ---------
            if (exp){
                var now = moment();
                var expiration = moment(retVal.Expiration);
                var timetoRun = expiration.subtract(1, 'minutes'); //run 5 minute before date expires
                var delayMoment = moment.duration(timetoRun.diff(now)); //calculate how much time to delay from now
                var delay = parseFloat(delayMoment.asSeconds())*1000; //convert to miliseconds

                console.log("Time this will run", timetoRun.format('LLLL'));

                //------------- IF TIME ALREADY EXPIRED, HANDLE ERROR -------
                if (delay < 0){
                    delay = 1000;
                    console.log("[Warning: ] This has already expired");
                    console.log("Expiration date: ", expiration.format('LLLL'));
                    console.log("Current time ", now.format('LLLL'));
                }
                await execute([target, access, secret, token, exp]);
                timeouts.push({
                    target: target,
                    timeout: setTimeout(Processor, delay, localargs)
                });
            }

            //---------- IF THERE ARE NO EXPIRATION, TIME LAST FOREVRE -------
            else{
                console.log('This does not have any expiration date');
                await execute([target, access, secret, token, exp]);
            }
            console.log("-----------------------------------------");
        }
    }).catch((err) => {
        console.error(err);
        reject(err);
    });
}
