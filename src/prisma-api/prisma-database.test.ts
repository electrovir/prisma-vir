import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {testPrismaConfig2Path, testPrismaConfigPath} from '../file-paths.mock.js';
import {createSqliteDatabaseUrl} from '../prisma-client/sqlite-client.js';
import {prismaApi} from './prisma-api.js';
import {clearTestDatabaseOutputs} from './prisma-database.mock.js';

describe(prismaApi.database.hasDiff.name, () => {
    it('has diff after a db reset', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            withMigrations: true,
            env,
        });

        assert.isTrue(
            await prismaApi.database.hasDiff({
                configPath: testPrismaConfigPath,
                env,
            }),
        );
    });
    it('has no diff after migrate', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };

        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            withMigrations: true,
            env,
        });
        await prismaApi.migration.create({
            migrationName: 'init',
            configPath: testPrismaConfigPath,
            env,
        });

        assert.isFalse(
            await prismaApi.database.hasDiff({
                configPath: testPrismaConfigPath,
                env,
            }),
        );
    });
    it('resets a database', async (testContext) => {
        await clearTestDatabaseOutputs();
        await assert.doesNotThrow(
            prismaApi.database.resetDev({
                configPath: testPrismaConfigPath,
                withMigrations: false,
                env: {
                    DATABASE_URL: createSqliteDatabaseUrl({
                        test: testContext,
                    }).url,
                },
            }),
        );
    });
    it('has diff from other schema file', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };

        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            withMigrations: true,
            env,
        });
        await prismaApi.migration.create({
            migrationName: 'init',
            configPath: testPrismaConfigPath,
            env,
        });

        assert.isTrue(
            await prismaApi.database.hasDiff({
                configPath: testPrismaConfig2Path,
                env,
            }),
        );
    });
});
