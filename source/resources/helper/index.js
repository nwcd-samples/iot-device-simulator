/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
const https = require('https');
const url = require('url');
const moment = require('moment');
const DynamoDBHelper = require('./lib/dynamodb-helper.js');
const S3Helper = require('./lib/s3-helper.js');
const IotHelper = require('./lib/iot-helper.js');
const IamCognitoHelper = require('./lib/iam-cognito-helper.js');
const UsageMetrics = require('usage-metrics');
const UUID = require('node-uuid');

/**
 * Request handler.
 */
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    let responseStatus = 'FAILED';
    let responseData = {};

    if (event.RequestType === 'Delete') {

        sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        return;

    }

    if (event.RequestType === 'Create') {
        if (event.ResourceProperties.customAction === 'saveDdbItem') {
            let _ddbHelper = new DynamoDBHelper();
            console.log(event.ResourceProperties.ddbItem);
            _ddbHelper.saveItem(event.ResourceProperties.ddbItem, event.ResourceProperties.ddbTable).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = setting;
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Saving item to DyanmoDB table ${event.ResourceProperties.ddbTable} failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        }
        else if (event.ResourceProperties.customAction === 'putConfigFile') {
            let _s3Helper = new S3Helper();
            console.log(event.ResourceProperties.configItem);
            _s3Helper.putConfigFile(event.ResourceProperties.configItem, event.ResourceProperties.destS3Bucket, event.ResourceProperties.destS3key).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = setting;
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Saving config file to ${event.ResourceProperties.destS3Bucket}/${event.ResourceProperties.destS3key} failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        }
        else if (event.ResourceProperties.customAction === 'copyS3assets') {
            let _s3Helper = new S3Helper();

            _s3Helper.copyAssets(event.ResourceProperties.manifestKey,
                event.ResourceProperties.sourceS3Bucket, event.ResourceProperties.sourceS3key,
                event.ResourceProperties.destS3Bucket).then((data) => {
                    responseStatus = 'SUCCESS';
                    responseData = {};
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                }).catch((err) => {
                    responseData = {
                        Error: `Copy of website assets failed`
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                });
        }
        //
        else if (event.ResourceProperties.customAction === 'AttachCognitoIdentityrole') {
            console.log('attach  AttachCognitoIdentityrole')

            let identitypoolid = event.ResourceProperties.identitypoolid[0].value;
            let cognitorolarn = event.ResourceProperties.cognitorolarn[0].value;


            let _iamcognitohelper = new IamCognitoHelper();
            _iamcognitohelper.attachCognitoIdentityPoolRole(identitypoolid, cognitorolarn).then((data) => {
                console.log('Attach role Success' + data)
                responseStatus = 'SUCCESS';
                responseData = data;
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                console.log('Create Failed.')
                responseData = {
                    Error: `failed to AttachCognitoIdentityrole`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });;

        }
        //
        else if (event.ResourceProperties.customAction === 'createUuid') {
            responseStatus = 'SUCCESS';
            responseData = {
                UUID: UUID.v4()
            };
            sendResponse(event, callback, context.logStreamName, responseStatus, responseData);

        } else if (event.ResourceProperties.customAction === 'getIotEndpoint') {
            let _iotHelper = new IotHelper();
            _iotHelper.getIotEndpoint().then((data) => {
                responseStatus = 'SUCCESS';
                responseData = {
                    endpoint: data
                };
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Retrieving the regional IoT Endpoint failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });
        } else if (event.ResourceProperties.customAction === 'sendMetric') {
            if (event.ResourceProperties.anonymousData === 'Yes') {
                let _metric = {
                    Solution: event.ResourceProperties.solutionId,
                    UUID: event.ResourceProperties.UUID,
                    TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                    Data: {
                        Version: event.ResourceProperties.version,
                        Launch: moment().utc().format()
                    }
                };

                let _usageMetrics = new UsageMetrics();
                _usageMetrics.sendAnonymousMetric(_metric).then((data) => {
                    console.log(data);
                    console.log('Annonymous metrics successfully sent.');
                    responseStatus = 'SUCCESS';
                    responseData = {};
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                }).catch((err) => {
                    responseData = {
                        Error: 'Sending anonymous launch metric failed'
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                });
            } else {
                sendResponse(event, callback, context.logStreamName, 'SUCCESS');
            }

        } else if (event.ResourceProperties.customAction === 'CreateIAMAndCognito') {
            console.log('start CreateIAMAndCognito')
            console.log(event.ResourceProperties)
            console.log(event.ResourceProperties.authing_thumb[0].value)
            console.log(event.ResourceProperties.authing_app_id[0].value)

            let authing_thumb = event.ResourceProperties.authing_thumb[0].value;
            let authing_app_url = event.ResourceProperties.authing_app_url[0].value;
            let authing_app_id = event.ResourceProperties.authing_app_id[0].value;
            let identity_pool_name = event.ResourceProperties.identity_pool_name[0].value;

            let _iamcognitohelper = new IamCognitoHelper();
            _iamcognitohelper.createIdentityProvider(authing_thumb, authing_app_url, authing_app_id, identity_pool_name).then((data) => {
                console.log('Create Success' + data)
                responseStatus = 'SUCCESS';
                responseData = data;
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                console.log('Create Failed.')
                responseData = {
                    Error: `failed to CreateIAMAndCognito`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });;

        } else {
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        }
    }

    if (event.RequestType === 'Update') {
        if (event.ResourceProperties.customAction === 'copyS3assets') {
            let _s3Helper = new S3Helper();

            _s3Helper.copyAssets(event.ResourceProperties.manifestKey,
                event.ResourceProperties.sourceS3Bucket, event.ResourceProperties.sourceS3key,
                event.ResourceProperties.destS3Bucket).then((data) => {
                    responseStatus = 'SUCCESS';
                    responseData = {};
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                }).catch((err) => {
                    responseData = {
                        Error: `Copy of website assets failed`
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                });

        } else if (event.ResourceProperties.customAction === 'getIotEndpoint') {
            let _iotHelper = new IotHelper();
            _iotHelper.getIotEndpoint().then((data) => {
                responseStatus = 'SUCCESS';
                responseData = {
                    endpoint: data
                };
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Retrieving the regional IoT Endpoint failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });
        } else if (event.ResourceProperties.customAction === 'putConfigFile') {
            let _s3Helper = new S3Helper();
            console.log(event.ResourceProperties.configItem);
            _s3Helper.putConfigFile(event.ResourceProperties.configItem, event.ResourceProperties.destS3Bucket, event.ResourceProperties.destS3key).then((data) => {
                responseStatus = 'SUCCESS';
                responseData = setting;
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            }).catch((err) => {
                responseData = {
                    Error: `Saving config file to ${event.ResourceProperties.destS3Bucket}/${event.ResourceProperties.destS3key} failed`
                };
                console.log([responseData.Error, ':\n', err].join(''));
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else {
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        }
    }


};

/**
 * Sends a response to the pre-signed S3 URL
 */
let sendResponse = function (event, callback, logStreamName, responseStatus, responseData) {
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: `See the details in CloudWatch Log Stream: ${logStreamName}`,
        PhysicalResourceId: logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData,
    });

    console.log('RESPONSE BODY:\n', responseBody);
    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'Content-Type': '',
            'Content-Length': responseBody.length,
        }
    };

    const req = https.request(options, (res) => {
        console.log('STATUS:', res.statusCode);
        console.log('HEADERS:', JSON.stringify(res.headers));
        callback(null, 'Successfully sent stack response!');
    });

    req.on('error', (err) => {
        console.log('sendResponse Error:\n', err);
        callback(err);
    });

    req.write(responseBody);
    req.end();
};