process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/omni_test';
process.env.JWT_ACCESS_SECRET ??= 'test-jwt-access-secret-min-32-chars';
process.env.JWT_REFRESH_SECRET ??= 'test-jwt-refresh-secret-min-32-chars';
process.env.TMDB_API_KEY ??= 'test-tmdb-api-key';
process.env.NODE_ENV ??= 'test';
