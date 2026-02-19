#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SkeletonStack } from '../lib/skeleton-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};

new SkeletonStack(app, 'DSAppSkeletonStack', {
  env,
  domainName: 'skeleton.digistratum.com',
  hostedZoneId: 'Z0223347L2MY5WGPNH7V', // digistratum.com zone
  dsAccountUrl: 'https://account.digistratum.com',
});
