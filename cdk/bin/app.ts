#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DeveloperStack } from '../lib/developer-stack';
import { SharedRuntimeStack } from '../lib/shared-runtime-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};

// Main application stack (developer portal)
new DeveloperStack(app, 'DSAppDeveloperStack', {
  env,
  domainName: 'developer.digistratum.com',
  hostedZoneId: 'Z2HSQ1OB6HFLSJ',
  zoneName: 'digistratum.com',
  dsAccountUrl: 'https://account.digistratum.com',
  dsAccountAppId: 'developer',
  // Note: DSACCOUNT_APP_SECRET is injected post-deploy by GitHub Actions
  // Secret ARN: arn:aws:secretsmanager:us-west-2:171949636152:secret:ds-app-developer/dsaccount-app-secret-LxwIA9
});

// Shared Runtime CDN stack (apps.digistratum.com)
// This can be deployed independently to serve @ds/core and shared libraries
new SharedRuntimeStack(app, 'DSSharedRuntimeStack', {
  env,
  domainName: 'apps.digistratum.com',
  hostedZoneId: 'Z2HSQ1OB6HFLSJ',
  zoneName: 'digistratum.com',
});
