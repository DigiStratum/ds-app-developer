/**
 * Test Fixtures
 *
 * Reusable test data factories for common entities
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique ID for test data
 */
export function testId(prefix = 'test'): string {
  const id = randomUUID();
  return `${prefix}-${id.slice(0, 8)}`;
}

/**
 * User fixture for testing
 */
export interface UserFixture {
  id: string;
  email: string;
  name: string;
  tenants: string[];
  createdAt: string;
}

/**
 * Create a user fixture with sensible defaults
 */
export function createUserFixture(overrides: Partial<UserFixture> = {}): UserFixture {
  const id = testId('user');
  return {
    id,
    email: `${id}@test.local`,
    name: `Test User ${id}`,
    tenants: ['tenant-test'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Tenant fixture for testing
 */
export interface TenantFixture {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Create a tenant fixture with sensible defaults
 */
export function createTenantFixture(overrides: Partial<TenantFixture> = {}): TenantFixture {
  const id = testId('tenant');
  return {
    id,
    name: `Test Tenant ${id}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Session fixture for testing
 */
export interface SessionFixture {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Create a session fixture with sensible defaults
 */
export function createSessionFixture(
  userId: string,
  overrides: Partial<SessionFixture> = {}
): SessionFixture {
  return {
    id: testId('session'),
    userId,
    tenantId: 'tenant-test',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory function type for creating fixtures
 */
export type FixtureFactory<T> = (overrides?: Partial<T>) => T;

/**
 * Create a fixture factory with default values
 */
export function createFixtureFactory<T>(
  defaultValues: () => T
): FixtureFactory<T> {
  return (overrides = {}) => ({
    ...defaultValues(),
    ...overrides,
  });
}

/**
 * Test data builder for complex scenarios
 */
export class TestDataBuilder<T> {
  private data: Partial<T> = {};

  constructor(private factory: FixtureFactory<T>) {}

  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value;
    return this;
  }

  build(): T {
    return this.factory(this.data);
  }
}

/**
 * Create a test data builder
 */
export function builder<T>(factory: FixtureFactory<T>): TestDataBuilder<T> {
  return new TestDataBuilder(factory);
}

/**
 * Standard test users for E2E/integration tests
 */
export const TEST_USERS = {
  standard: createUserFixture({
    id: 'user-e2e-001',
    email: 'e2e-test@digistratum.com',
    name: 'E2E Test User',
    tenants: ['tenant-test-001'],
  }),
  multiTenant: createUserFixture({
    id: 'user-e2e-002',
    email: 'multi-tenant@digistratum.com',
    name: 'Multi-Tenant User',
    tenants: ['tenant-test-001', 'tenant-test-002'],
  }),
  noTenant: createUserFixture({
    id: 'user-e2e-003',
    email: 'personal@digistratum.com',
    name: 'Personal User',
    tenants: [],
  }),
} as const;
