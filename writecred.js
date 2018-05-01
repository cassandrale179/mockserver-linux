const fs = require('fs');
const util = require('util');
const moment = require('moment');
const os = require('os');

//--------- WRITE CREDENTIALS MODIFICATION ------ 
var cred = "";
if (process.platform == 'win32')
    cred = os.homedir() + "//.aws/credentials";
else{
    cred = os.homedir() + "/.aws/credentials";
}
const read_promise = util.promisify(fs.readFile);
const write_promise = util.promisify(fs.writeFile);

/* jshint ignore:start */
async function writeFile(args){
    let target = "[" + args[0] + "]";
    let access = "aws_access_key_id = " + args[1];
    let secret = "aws_secret_access_key = " + args[2];

    if (args[3]) var token = "aws_session_token = " + args[3];

    //---- MODIFYING THE CREDENTIALS FILE ---
    return read_promise(cred, 'utf8').then((cred_content) => {
        let cred_arr = cred_content.split('\n');
        for (let i = 0; i < cred_arr.length; i++){
            cred_arr[i] = cred_arr[i].trim();
        }

        //---FIND THE PROFILE TO MODIFY ---
        let c = cred_arr.indexOf(target);
        if (c == -1){
            console.log('[Warning: ]: Credential does not exist, creating a new one');
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
            console.log("Create a write promise for this credential ", target);
            cred_write = write_promise(cred, cred_str, 'utf8');
            return cred_write;
        }
        else{
            console.log('[Error: ] There is nothing to write to credentials file');
        }
    }).catch((err) => {
        console.log(err);
    })
}
/* jshint ignore:start */
exports.writeFile = writeFile;
