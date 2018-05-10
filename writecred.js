const fs = require('fs');
const util = require('util');
const moment = require('moment');
const os = require('os');
const program = require('commander');
const snsqueueModule = require('./snsqueue.js');
const read_promise = util.promisify(fs.readFile);
const write_promise = util.promisify(fs.writeFile);

//----- OPTIONS PARSING -------
program
    .version('0.1.0')
    .option('-v, --verbose', 'Verbose')
    .option('-s, --silent', 'Silent')
    .parse(process.argv);


//--------- WRITE CREDENTIALS MODIFICATION ------
var cred = "";
if (process.platform == 'win32')
    cred = os.homedir() + "//.aws/credentials";
else cred = os.homedir() + "/.aws/credentials";

//-------- CHECK IF FILE EXIST ------
if (fs.existsSync(cred) == false){
    console.log('[Warning: ] Credentail file doesn not exist. Creating a blank one');
    fs.writeFile(cred, "", (err) => {
            if (err) console.error(err);
    });
}


/* jshint ignore:start */
async function writeFile(args){
    let target = "[" + args[0] + "]";
    let access = "aws_access_key_id = " + args[1];
    let secret = "aws_secret_access_key = " + args[2];

    if (args[3]) var token = "aws_session_token = " + args[3];

    //---- MODIFYING THE CREDENTIALS FILE ---
    if (fs.existsSync(cred)){
        return read_promise(cred, 'utf8').then((cred_content) => {
            let cred_arr = cred_content.split('\n');
            for (let i = 0; i < cred_arr.length; i++){
                cred_arr[i] = cred_arr[i].trim();
            }

            //----- IF PROFILE DOESN'T EXIST, CREAT A NEW ONE ------
            let c = cred_arr.indexOf(target);
            if (c == -1){
                cred_arr.push(target, access, secret, token);
            }
            else{
                cred_arr[c+1] = access;
                cred_arr[c+2] = secret;
                if (token) cred_arr[c+3] = token;
            }
            let cred_str = cred_arr.join('\n');

            //---- WRITE THE CREDENTIAL TO THE FILE ---
            var cred_write;
            if (cred_str){
                cred_write = write_promise(cred, cred_str, 'utf8');
                return cred_write;
            }
            else{
                console.error('[Error: ] There is no access key or secret key to write to this profile');
            }
        }).catch((err) => {
            if (program.verbose)
                console.error(err);
        });
    }
    else{
        console.error('[Error: ] Unable to create a new credentials file');
        snsqueueModule.getHostName('[Error: ] No credentials file found and unable to create a blank credential file');
    }
}

/* jshint ignore:start */
exports.writeFile = writeFile;
