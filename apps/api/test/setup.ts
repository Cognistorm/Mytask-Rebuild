import 'reflect-metadata';

// Test defaults. Integration tests (RUN_INTEGRATION=1, CI) get real DATABASE_URL / REDIS_URL from the environment.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://mytask:mytask@localhost:5432/mytask_test';
process.env.REDIS_URL ??= 'redis://localhost:6379/1';
process.env.APP_URL ??= 'http://localhost:3100';
process.env.ADMIN_URL ??= 'http://localhost:3200';
