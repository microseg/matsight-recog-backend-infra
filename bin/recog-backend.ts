#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RecogBackendStack } from '../lib/recog-backend-stack';

const app = new cdk.App();
const account = app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT;
const region  = app.node.tryGetContext('region')  || process.env.CDK_DEFAULT_REGION;

new RecogBackendStack(app, 'RecogBackendStack', { env: { account, region } });
