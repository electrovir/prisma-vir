import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {existsSync} from 'node:fs';
import {
    generatedPrismaClientDirPath,
    testInvalidPrismaConfigPath,
    testPrismaConfigPath,
} from '../file-paths.mock.js';
import {prismaApi} from './prisma-api.js';
import {clearTestDatabaseOutputs} from './prisma-database.mock.js';

describe(prismaApi.client.generate.name, () => {
    it('generates clients even if the database does not exist', async () => {
        await clearTestDatabaseOutputs();

        assert.isFalse(existsSync(generatedPrismaClientDirPath));

        await prismaApi.client.generate({
            configPath: testPrismaConfigPath,
        });

        assert.isTrue(existsSync(generatedPrismaClientDirPath));
    });
    it('errors on invalid schema path', async () => {
        await clearTestDatabaseOutputs();

        assert.isFalse(existsSync(generatedPrismaClientDirPath));

        await assert.throws(() => {
            return prismaApi.client.generate({
                configPath: testInvalidPrismaConfigPath,
            });
        });

        assert.isFalse(existsSync(generatedPrismaClientDirPath));
    });
});
