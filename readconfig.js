const program = require('commander');
const fs = require('fs');
const util = require('util');
const read_promise = util.promisify(fs.readFile);
const moment = require('moment');
const os = require('os');
const config = os.homedir() + "//.aws/config";


//----- OPTIONS PARSING -------
program
    .version('0.1.0')
    .option('-v, --verbose', 'Verbose')
    .option('-s, --silent', 'Silent')
    .parse(process.argv);


//------ HELPER EXTRACT FUNCTION ------
function ext(str, type, i){
    if (type == 'f') return str.substring(0, str.indexOf('=')).trim();
    if (type == 'p') return str.substring(i, str.length-1).trim();
    else return str.substring(str.indexOf('=')+1, str.length).trim();
}


//-------- READ PROMISE -------
function read_config(){
    return new Promise(function(resolve, reject) {
        return read_promise(config, 'utf8').then((content) => {
            let data = content.split('\n').filter(n => { return n != '';});
            let p = [];
            let profiles = [];
            let credentials = [];
            let duplicate = [];

            //-------- CREATE AN ARRAY THAT CONTAIN SUBARRAY OF PROFILE ------
            for (var i = 0; i < data.length; i++)
                if (data[i].indexOf("[profile") != -1) p.push(i);
            for (var j = 0; j < p.length; j++)
                profiles.push(data.slice(p[j], p[j+1]));

            //------- CREATE A CONFIG PROFILE OBJECT -------
            profiles.forEach((profile,p) => {
                let profile_obj = {};
                let mock_arr = [];
                let mock_obj = {};

                //----- LOOP THROUGH EACH ITEM IN THE ARRAY -----
                profile.forEach((item,i) => {
                    if (item.indexOf("[profile") != -1)
                        profile_obj.source = ext(item, "p", 8);
                    else if (item.indexOf("mock_credentials") != -1){
                        index_of_mock_cred = i;
                        mock_arr = ext(item).split(",");
                        mock_arr.forEach((x,i) => mock_arr[i] = mock_arr[i].trim());

                        //------- CHECK DUPLCIATE -----
                        mock_arr.forEach(x => {
                            if (duplicate.indexOf(x) != -1)
                                console.error("[Error:] Duplicate at credential ", x);
                            else duplicate.push(x);
                        });
                    }
                    var key = ext(item, 'f');
                    if (mock_arr.indexOf(key) != -1)
                        mock_obj[key] = i;

                });

                //-------- CREATE A PROFILE --------
                profile_obj.index = p;
                profile_obj.info = profiles[p];
                mock_arr.forEach(m => {
                    if (Object.keys(mock_obj).indexOf(m) == -1)
                        mock_obj[m] = undefined;
                });
                profile_obj.mock_obj = mock_obj;
                credentials.push(profile_obj);
            });



            //--------- ONLY LOOK INTO PROFILE WITH MOCK CREDENTIALS -----
            let result = [];
            credentials.forEach(cred => {
                let nocred_obj = {};

                //--- APPEND IMPORTANT ATT FOR EACH MOCK PROFILE ---
                for (var key in cred.mock_obj){
                    let cred_obj = {};
                    var i = cred.mock_obj[key];
                    cred_obj.source = cred.source;
                    cred_obj.assume_role_arn = "";
                    cred_obj.role_session_name = "";

                    //------- ATTRIBUTE FOR EACH MOCK PROFILE ------
                    cred.info.forEach((att, a) => {

                        //------- BOOLEAN VALUES ------
                        let arn = att.indexOf("assume_role_arn");
                        let role = att.indexOf("role_session_name");
                        let mock = att.indexOf("mock_credentials");
                        let prof =  att.indexOf("[profile");

                        //------- IF ELSE STATEMENT -----
                        if (arn == -1 && role == -1 && mock == -1  && prof == -1 && ext(att) != '')
                            cred_obj[ext(att, "f")] = ext(att);
                        else if (arn != -1 && i + 1 == a) cred_obj.assume_role_arn = ext(att);
                        else if (role != -1 && i + 2 == a) cred_obj.role_session_name = ext(att);
                    });
                    cred_obj.target = key;
                    result.push(cred_obj);
                }

                //---------- IF OBJECT HAS NO TARGET -------
                if (Object.keys(cred.mock_obj).length == 0){
                    cred.info.forEach((att2, a2) => {
                        if (att2.indexOf("[profile") == -1)
                            nocred_obj[ext(att2, "f")] = ext(att2);
                    });
                    nocred_obj.source = cred.source;
                    result.push(nocred_obj);
                }
            });

        //------  CHECKING FOR SOURCE PROFILE INFINITE LOOP ------
        let nodes = {};
        let chain = false;
        result.forEach((prof) => {
            if (prof.source_profile)
                nodes[prof.source] = prof.source_profile;
            });
        for (var key in nodes){
          let l = [key];
          let curr = key;
          while (curr){
              if (nodes.hasOwnProperty(curr)){
                  let par = nodes[curr];
                  if (l.indexOf(par) == -1){
                     l.push(par);
                     curr = par;
                  }
                  else{
                    chain = true;
                    if (program.verbose)
                        console.error('[Error: ] Source profile linked back to each other');
                    break;
                  }
              }
              else break;
          }
        }

        //-------- IF EVERYTHING IS GOOD, RESOLVE RESULT -----
        if (chain == false){
            console.log('[Success: ] Configuration file has no duplicate source profile');
            resolve(result);
        }
        }).catch(err => {
            if (program.verbose)
            console.error('Error: No config file');
            reject(err);
        });
    });
}
exports.read_config = read_config;
