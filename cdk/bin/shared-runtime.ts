#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SharedRuntimeStack } from '../lib/shared-runtime-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};

new SharedRuntimeStack(app, 'DSSharedRuntimeStack', {
  env,
  domainName: 'apps.digistratum.com',
  hostedZoneId: 'Z2HSQ1OB6HFLSJ', // digistratum.com zone
  zoneName: 'digistratum.com',
});
