import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {existsSync} from 'node:fs';
import {readdir, rename, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {
    testInvalidPrismaConfigPath,
    testPrismaConfig2Path,
    testPrismaConfigPath,
    testPrismaMigrationsDirPath,
} from '../file-paths.mock.js';
import {createSqliteDatabaseUrl} from '../prisma-client/sqlite-client.js';
import {testWithNonCiEnv} from './disable-ci-env.mock.js';
import {prismaApi} from './prisma-api.js';
import {clearTestDatabaseOutputs} from './prisma-database.mock.js';
import {
    PrismaMigrationNeededError,
    PrismaResetNeededError,
    PrismaSchemaError,
} from './prisma-errors.js';

describe(prismaApi.migration.status.name, () => {
    it('fails without a database', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();

        await assert.throws(
            prismaApi.migration.status({
                configPath: testPrismaConfigPath,
                env,
            }),
            {
                matchMessage: 'does not exist',
                matchConstructor: PrismaSchemaError,
            },
        );
    });
    it('works', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });
        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
        });

        const status = await prismaApi.migration.status({
            configPath: testPrismaConfigPath,
            env,
        });
        assert.strictEquals(status.totalMigrations, 1);
        assert.isLengthExactly(status.unappliedMigrations, 0);
    });
});

describe(prismaApi.migration.create.name, () => {
    it('creates an unapplied migration', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });
        assert.deepEquals(
            await prismaApi.migration.status({
                configPath: testPrismaConfigPath,
                env,
            }),
            {
                totalMigrations: 0,
                unappliedMigrations: [],
            },
        );

        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
            createOnly: true,
        });

        assert.isTrue(existsSync(testPrismaMigrationsDirPath));
        assert.isLengthExactly(await readdir(testPrismaMigrationsDirPath), 2);
        const status = await prismaApi.migration.status({
            configPath: testPrismaConfigPath,
            env,
        });
        assert.strictEquals(status.totalMigrations, 1);
        assert.isLengthExactly(status.unappliedMigrations, 1);
        assert.endsWith(status.unappliedMigrations[0], '_init');
    });

    it('creates and applies a migration', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });
        assert.deepEquals(
            await prismaApi.migration.status({
                configPath: testPrismaConfigPath,
                env,
            }),
            {
                totalMigrations: 0,
                unappliedMigrations: [],
            },
        );

        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
        });

        assert.isTrue(existsSync(testPrismaMigrationsDirPath));
        assert.isLengthExactly(await readdir(testPrismaMigrationsDirPath), 2);
        const status = await prismaApi.migration.status({
            configPath: testPrismaConfigPath,
            env,
        });
        assert.strictEquals(status.totalMigrations, 1);
        assert.isLengthExactly(status.unappliedMigrations, 0);
    });
    it('errors with invalid inputs', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });
        await assert.throws(
            prismaApi.migration.create({
                configPath: testPrismaConfigPath,
                env,
                migrationName: "in' --boggle='it",
            }),
        );
    });
});

describe(prismaApi.migration.applyDev.name, () => {
    it('applies migrations', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });

        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
            createOnly: true,
        });

        assert.isTrue(existsSync(testPrismaMigrationsDirPath));
        assert.isLengthExactly(await readdir(testPrismaMigrationsDirPath), 2);
        const status = await prismaApi.migration.status({
            configPath: testPrismaConfigPath,
            env,
        });
        assert.strictEquals(status.totalMigrations, 1);
        assert.isLengthExactly(status.unappliedMigrations, 1);
        assert.endsWith(status.unappliedMigrations[0], '_init');

        await prismaApi.migration.applyDev({
            configPath: testPrismaConfigPath,
            env,
        });
        assert.deepEquals(
            await prismaApi.migration.status({
                configPath: testPrismaConfigPath,
                env,
            }),
            {
                totalMigrations: 1,
                unappliedMigrations: [],
            },
        );
    });
    it('fails on invalid schema', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });

        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
            createOnly: true,
        });

        assert.isTrue(existsSync(testPrismaMigrationsDirPath));
        assert.isLengthExactly(await readdir(testPrismaMigrationsDirPath), 2);
        const status = await prismaApi.migration.status({
            configPath: testPrismaConfigPath,
            env,
        });
        assert.strictEquals(status.totalMigrations, 1);
        assert.isLengthExactly(status.unappliedMigrations, 1);
        assert.endsWith(status.unappliedMigrations[0], '_init');

        await assert.throws(
            prismaApi.migration.applyDev({
                configPath: testInvalidPrismaConfigPath,
                env,
            }),
            {
                matchConstructor: PrismaSchemaError,
                matchMessage: 'Invalid schema file',
            },
        );
    });
    it(
        'fails when a new migration is needed',
        testWithNonCiEnv(async (testContext) => {
            const env = {
                DATABASE_URL: createSqliteDatabaseUrl({
                    test: testContext,
                }).url,
            };
            await clearTestDatabaseOutputs();
            await prismaApi.database.resetDev({
                configPath: testPrismaConfigPath,
                env,
                withMigrations: true,
            });

            await prismaApi.migration.create({
                configPath: testPrismaConfigPath,
                env,
                migrationName: 'init',
            });
            assert.deepEquals(
                await prismaApi.migration.status({
                    configPath: testPrismaConfigPath,
                    env,
                }),
                {
                    totalMigrations: 1,
                    unappliedMigrations: [],
                },
            );

            await assert.throws(
                prismaApi.migration.applyDev({
                    configPath: testPrismaConfig2Path,
                    env,
                }),
                {
                    matchMessage: 'A new Prisma migration is needed for',
                    matchConstructor: PrismaMigrationNeededError,
                },
            );
        }),
    );
    it('fails when a reset is needed', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });

        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
        });
        assert.deepEquals(
            await prismaApi.migration.status({
                configPath: testPrismaConfigPath,
                env,
            }),
            {
                totalMigrations: 1,
                unappliedMigrations: [],
            },
        );
        const migrationFolder = (await readdir(testPrismaMigrationsDirPath)).find(
            (entry) => !entry.endsWith('.toml'),
        );

        assert.isDefined(migrationFolder);

        await rename(
            join(testPrismaMigrationsDirPath, migrationFolder),
            join(testPrismaMigrationsDirPath, '20250311000000_init'),
        );

        await assert.throws(
            prismaApi.migration.applyDev({
                configPath: testPrismaConfig2Path,
                env,
            }),
            {
                matchMessage: 'A database reset is needed for',
                matchConstructor: PrismaResetNeededError,
            },
        );
    });
});

describe(prismaApi.migration.applyProd.name, () => {
    it('applies migrations', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });

        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
            createOnly: true,
        });

        assert.isTrue(existsSync(testPrismaMigrationsDirPath));
        assert.isLengthExactly(await readdir(testPrismaMigrationsDirPath), 2);
        const status = await prismaApi.migration.status({
            configPath: testPrismaConfigPath,
            env,
        });
        assert.strictEquals(status.totalMigrations, 1);
        assert.isLengthExactly(status.unappliedMigrations, 1);
        assert.endsWith(status.unappliedMigrations[0], '_init');

        await prismaApi.migration.applyProd({
            configPath: testPrismaConfigPath,
            env,
        });
        assert.deepEquals(
            await prismaApi.migration.status({
                configPath: testPrismaConfigPath,
                env,
            }),
            {
                totalMigrations: 1,
                unappliedMigrations: [],
            },
        );
    });
    it('ignores schema file changes', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });

        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
        });
        assert.deepEquals(
            await prismaApi.migration.status({
                configPath: testPrismaConfigPath,
                env,
            }),
            {
                totalMigrations: 1,
                unappliedMigrations: [],
            },
        );

        await prismaApi.migration.applyProd({
            configPath: testPrismaConfig2Path,
            env,
        });
    });
    it('ignores when a reset is needed', async (testContext) => {
        const env = {
            DATABASE_URL: createSqliteDatabaseUrl({
                test: testContext,
            }).url,
        };
        await clearTestDatabaseOutputs();
        await prismaApi.database.resetDev({
            configPath: testPrismaConfigPath,
            env,
            withMigrations: true,
        });

        await prismaApi.migration.create({
            configPath: testPrismaConfigPath,
            env,
            migrationName: 'init',
        });
        assert.deepEquals(
            await prismaApi.migration.status({
                configPath: testPrismaConfigPath,
                env,
            }),
            {
                totalMigrations: 1,
                unappliedMigrations: [],
            },
        );
        await rm(testPrismaMigrationsDirPath, {
            force: true,
            recursive: true,
        });

        await prismaApi.migration.applyProd({
            configPath: testPrismaConfig2Path,
            env,
        });
    });
});
