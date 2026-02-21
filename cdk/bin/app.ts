#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DeveloperStack } from '../lib/developer-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};

new DeveloperStack(app, 'DSAppDeveloperStack', {
  env,
  domainName: 'developer.digistratum.com',
  hostedZoneId: 'Z2HSQ1OB6HFLSJ', // digistratum.com zone
  dsAccountUrl: 'https://account.digistratum.com',
  dsAccountAppId: 'developer',
  // Note: DSACCOUNT_APP_SECRET is injected post-deploy by GitHub Actions
  // Secret ARN: arn:aws:secretsmanager:us-west-2:171949636152:secret:ds-app-developer/dsaccount-app-secret-LxwIA9
});
