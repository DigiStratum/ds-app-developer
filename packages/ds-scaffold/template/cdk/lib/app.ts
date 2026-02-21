#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { {{APP_NAME_PASCAL}}Stack } from './stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};

new {{APP_NAME_PASCAL}}Stack(app, '{{APP_NAME_PASCAL}}Stack', {
  env,
  description: '{{APP_NAME}} - DigiStratum Application',
});
