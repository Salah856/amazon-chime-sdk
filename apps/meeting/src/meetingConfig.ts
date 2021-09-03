// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  ConsoleLogger,
  LogLevel,
  VideoPriorityBasedPolicy
} from 'amazon-chime-sdk-js';
import { SDK_LOG_LEVELS } from './constants';

const urlParams = new URLSearchParams(window.location.search);
const queryLogLevel = urlParams.get('logLevel') || 'warn';
const logLevel = SDK_LOG_LEVELS[queryLogLevel] || SDK_LOG_LEVELS.warn;

const BASE_URL: string = [
  location.protocol,
  '//',
  location.host,
  location.pathname.replace(/\/*$/, '/'),
].join('');

const postLogConfig = {
  name: 'SDK_LOGS',
  batchSize: 85,
  intervalMs: 2000,
  url: `${BASE_URL}logs`,
  logLevel: SDK_LOG_LEVELS.info,
};
const simulcastEnabled = true;
const logger = new ConsoleLogger('SDK', LogLevel.INFO);
export const priorityBasedPolicy = new VideoPriorityBasedPolicy(logger);

const enableWebAudio = true;

const config = {
  logLevel,
  postLogConfig,
  enableWebAudio,
  simulcastEnabled,
  logger,
  videoDownlinkBandwidthPolicy: priorityBasedPolicy,
};

export default config;
