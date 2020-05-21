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

const axios = require('axios')
const qs = require('querystring')

let response;

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */
exports.handler = async (event, context) => {

    console.log(event)


    var app_url = process.env.AuthingAppUrl
    var authing_oidc_token_url = app_url
    var app_id = process.env.AuthingAppId
    var app_secret = process.env.AuthingAppSecret

    var inputredirect_uri

    try {
        // var querystr
        var id_token
        var code


        if (event.body) {
            var body = JSON.parse(event.body)
            console.log(body)
            if (body.code){
                code = body.code;
                console.log(code);
            }
            if (body.redirect_uri)  
            {
                inputredirect_uri=body.redirect_uri;
                console.log(inputredirect_uri);
            } 
            console.log(qs.stringify({
                    "client_id" : app_id,
                    "client_secret" : app_secret,
                    "grant_type" : "authorization_code",
                    "redirect_uri" : inputredirect_uri,
                    "code" : code
                }));
                
            console.log(authing_oidc_token_url);
            //start exchange token from authing
            let response_authing = await axios.post( 
                authing_oidc_token_url+"/token",
                qs.stringify({
                    "client_id" : app_id,
                    "client_secret" : app_secret,
                    "grant_type" : "authorization_code",
                    "redirect_uri" : inputredirect_uri,
                    "code" : code
                }),
                {
                    headers: {
                        "Content-Type" : "application/x-www-form-urlencoded"
                    }
                });
            
            console.log(response_authing) 
            id_token = response_authing.data['id_token']
            if(id_token)
            {
                response = {
                    statusCode: 200,
                    body: JSON.stringify({
                        'id_token' : id_token
                    })
                } 
            }
            else{
                response = {
                    statusCode: 400,
                    body: JSON.stringify('Get ID Token from authing failed')
                };

            }    
        }
        else {
            response = {
                statusCode: 400,
                body: JSON.stringify('Missing Code')
            };
        }


        response.headers = {
            'Access-Control-Allow-Origin' : '*'
        }
        return response
        
    } catch (err) {
        console.log(err);
        return err;
    }
}