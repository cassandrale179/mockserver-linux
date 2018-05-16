tar -cvf mockserver.tar .
aws s3 cp mockserver.tar s3://mockmeta-libs-uat/bmslibs/mockserver.tar --profile bmsis
