# mockserver-linux
Mockserver is a Node.js program that allow user to refresh their AWS credential file based on a given configuration file on EC2 instances. 

## Prerequesites 
1. [Node v.8.11](https://nodejs.org/en/) or higher
2. [curl](https://curl.haxx.se/) or just do *yum install curl* on Amazon Linux  
3. Once Node is installed, make sure to have these packages:   

```
npm install moment
npm install request
npm install tunnel
npm install aws-sdk 
``` 

Before running the program, please set the proxy, for example, on Linux:
```
export http_proxy=http://name-of-your-proxy.com:8080
export https_proxy=http://name-of-your-proxy.com:8080 
``` 

A configuration file name “config”, a credential file “credentials” (can be blank), TempCredScript.js, and its node modules must be located at your home directory under .aws folder. To check, change directory to that folder and list the content (for example, on Mac OS):  

```
cd $HOME/.aws && ls 
> config    credentials   TempCredScript.js    node_modules 
``` 

To run the program simply located the folder and type: 
 ```
 $ node mock.js 
 ``` 
 
If you want to browse a list of profile, and set a default AWS_PROFILE:
On Windows, run execute.bat 
```
execute
``` 
On Linux, run execute.sh 
```
$ . execute.sh 
``` 

Also, if you want to run the mockserver globally, do:
```
npm install -g file:mockserver.tar
```

Then simply type mockserver to run the program 



## Folder structure:
    mockserver/
    ├── mock.js                   # main files 
    ├── readconfig.js             # Read configuration 
    ├── getkey.js                 # Source files (alternatively `lib` or `app`)
    ├── writecred.js              # Write credentials file                    
    ├── package.json                   
    ├── LICENSE
    └── README.md
    
    .aws/ 
    ├── config                   
    ├── credentials             
    ├── TempCredScript.js                                     
    └── node_modules    
    
  
