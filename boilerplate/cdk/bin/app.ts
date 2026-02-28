#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};

// Main application stack
// NOTE: All "developer" references will be replaced by create-app.sh
new AppStack(app, 'DSAppDeveloperStack', {
  env,
  domainName: 'developer.digistratum.com',
  hostedZoneId: 'Z2HSQ1OB6HFLSJ', // digistratum.com zone
  dsAccountUrl: 'https://account.digistratum.com',
  dsAccountAppId: 'developer',
  appName: 'ds-app-developer',
  // Note: DSACCOUNT_APP_SECRET is injected post-deploy by GitHub Actions
});
