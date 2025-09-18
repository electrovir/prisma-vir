import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {existsSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {testPrismaSchemaPath} from '../file-paths.mock.js';
import {createTempSchema} from './temp-schema.js';

describe(createTempSchema.name, () => {
    it('works without a transform', async () => {
        const {tempSchemaPath} = await createTempSchema({
            originalSchemaPath: testPrismaSchemaPath,
        });
        assert.isTrue(existsSync(tempSchemaPath));
        await rm(tempSchemaPath, {force: true});
        assert.isFalse(existsSync(tempSchemaPath));
    });
});
