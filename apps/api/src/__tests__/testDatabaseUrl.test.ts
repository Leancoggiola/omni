import { describe, expect, it } from 'vitest';

import { assertTestDatabaseUrl } from '../test/integration/testDatabaseUrl';

describe('assertTestDatabaseUrl', () => {
  it('accepts a local database whose name ends in _test', () => {
    const url = 'postgresql://postgres:postgres@127.0.0.1:5433/omni_test';
    expect(assertTestDatabaseUrl(url)).toBe(url);
  });

  it('accepts localhost as well as the loopback address', () => {
    const url = 'postgresql://postgres:postgres@localhost:5433/omni_test';
    expect(assertTestDatabaseUrl(url)).toBe(url);
  });

  it('rejects a remote host even when the database name looks like a test one', () => {
    expect(() => assertTestDatabaseUrl('postgresql://user:pass@db.abcdefg.supabase.co:5432/omni_test')).toThrow(
      /Refusing to run against a non-test database/
    );
  });

  it('rejects a local database whose name does not end in _test', () => {
    expect(() => assertTestDatabaseUrl('postgresql://postgres:postgres@127.0.0.1:5432/omni_dev')).toThrow(
      /must end in _test/
    );
  });

  it('rejects a missing url', () => {
    expect(() => assertTestDatabaseUrl(undefined)).toThrow(/DATABASE_URL is not set/);
  });

  it('rejects a malformed url', () => {
    expect(() => assertTestDatabaseUrl('not-a-url')).toThrow(/not a valid URL/);
  });
});
