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

/**
 * @author Solution Builders
 */

'use strict';

let moment = require('moment');
let AWS = require('aws-sdk');
const UUID = require('node-uuid');

/**
 * Helper function to interact with AWS IoT for cfn custom resource.
 *
 * @class iotHelper
 */
class IamCognitoHelper {

    /**
     * @class IamCognitoHelper
     * @constructor
     */
    constructor() {
        this.creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
    }

    createIdentityProvider(authing_thumb, authing_app_url, authing_app_id, identity_pool_name) {
        return new Promise((resolve, reject) => {

            console.log('Start Create Identity Provider,In China Soltuion, we would like to use authing');
            console.log(authing_app_id, authing_app_url, authing_thumb, identity_pool_name)

            var AWS = require("aws-sdk");
            var defualt_region = 'cn-north-1';

            var responseStatus = "SUCCESS";
            var responseData = {};

            var iam = new AWS.IAM({
                region: defualt_region
            });

            let iam_identity_params = {
                ClientIDList: [
                    authing_app_id
                ],
                ThumbprintList: [
                    authing_thumb
                ],
                Url: authing_app_url
            };

            iam.createOpenIDConnectProvider(iam_identity_params, function (err, data) {
                if (err) {
                    //data(err);
                    reject(err);
                    console.log(err, err.stack);
                } else {
                    var idprovider = (data.OpenIDConnectProviderArn).toString();
                    var responseStatus = "SUCCESS";

                    responseData['OpenIdConnectProviderARN'] = idprovider;

                    var cognitoidentity = new AWS.CognitoIdentity({ region: defualt_region });

                    var paracognito_paramsms = {
                        AllowUnauthenticatedIdentities: false,
                        IdentityPoolName: "IoT_Sim_Identity_pool_" + UUID.v4(),
                        OpenIdConnectProviderARNs: [idprovider]
                    };

                    cognitoidentity.createIdentityPool(paracognito_paramsms, function (err, data) {
                        if (err) {
                            console.log(err, err.stack);
                        } // an error occurred
                        else {
                            var IdentityPoolId_str = data.IdentityPoolId;
                            var IdentityPoolARN = data.OpenIdConnectProviderARNs[0];
                            responseData['CognitoIdentityPoolID'] = IdentityPoolId_str;
                            responseData['CognitoIdentityPoolARN'] = IdentityPoolARN;
                            resolve(responseData);
                        }
                    });
                }
            });



        });
    };

    attachCognitoIdentityPoolRole(identitypoolid, cognitorolarn) {
        return new Promise((resolve, reject) => {

            console.log('Attach Cognito Identity Pool Role');
            var AWS = require("aws-sdk");
            //Because Cognito identity only GA in BJS region
            var defualt_region = 'cn-north-1';

            var responseData = {};
            var params = {
                IdentityPoolId: identitypoolid,
                //only need authenticated role, and need not to set unauthenticated role
                Roles: {
                    'authenticated': cognitorolarn,
                },
            };

            var cognitoidentity = new AWS.CognitoIdentity({
                region: defualt_region
            });

            cognitoidentity.setIdentityPoolRoles(params, function (err, data) {
                if (err) {
                    data(err);
                    console.log('Attach Cognito Identity Pool Role Failed');
                    console.log(err, err.stack);
                }
                else {
                    var responseStatus = "SUCCESS";
                    responseData['CognitoIdentityPoolRole'] = data;
                    console.log('Attach Cognito Identity Pool Role Success');
                    console.log(data);
                    resolve(data);
                }
            });

        });
    };






}

module.exports = IamCognitoHelper;