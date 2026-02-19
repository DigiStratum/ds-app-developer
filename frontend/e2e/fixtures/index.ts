/**
 * E2E Test Fixtures Index
 * 
 * Re-exports all fixtures for convenient importing
 */

export {
  test,
  expect,
  TEST_USERS,
  mockApiResponse,
  mockCurrentUser,
  mockCurrentTenant,
  waitForAuth,
  expectLoginRedirect,
} from './auth.fixture';

export type { TestUser } from './auth.fixture';

export {
  NavigationPO,
  DashboardPO,
  HomePO,
  AuthPO,
  createPageObjects,
  testWithPO,
} from './page-objects';
