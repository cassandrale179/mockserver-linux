const AWS = require('aws-sdk');
const sns = new AWS.SNS({apiVersion: '2010-03-31', region:'us-east-1'});
const request = require("request");

//------------- GETTING INSTANCE DETAILS -------------
function getHostName(_error) {
	var hostname = "";
	var endpoint = "http://169.254.169.254/latest/meta-data/hostname";
	var options = {
        method: 'GET',
        url: endpoint,
        timeout: 5000,
	 };

	request(options, function (error, response, body) {
	  if (error){
		if(error.code=="ESOCKETTIMEDOUT" || error.code=="ETIMEDOUT"){
			var host_name=require('os').hostname();
			hostname=host_name;
		}
		else{
			throw new Error(_error).message;
		}
	  }
	  else{
		hostname=body; 
		console.log("hostname no error", hostname); 
	  }
	  console.log("Hostname", hostname);
	  sendNotification(_error,hostname);
	});
}


//------------ SENDING A NOTIFICATION ---------------------
function sendNotification(_error,hostname) {
	var subject = "Mockserver Error Notification--"+hostname;
	var msg={
		"Subject":subject,
		"Error":_error
	};
	var endpoint="https://sqs.us-east-1.amazonaws.com/315327487940/mock-service-error-messages?Action=SendMessage&MessageBody="+JSON.stringify(msg)+"";
	console.log(endpoint);
	var options = {
        method: 'GET',
        url: endpoint
	 };
	request(options, function (error, response, body) {
	  if (error){
		throw new Error(_error).message;
	  }
	  else{
		  console.log(body);
	  }
	});
}

exports.getHostName = getHostName;
