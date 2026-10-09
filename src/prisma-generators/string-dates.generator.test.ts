import {describe} from '@augment-vir/test';
import {
    stringDatesCustomDatasourcePrismaConfigPath,
    stringDatesPrismaConfigPath,
} from '../file-paths.mock.js';
import {createGeneratorTest} from './test-generator.mock.js';

describe('string-dates generator', () => {
    describe('with @db.Date', () => {
        createGeneratorTest(import.meta, stringDatesPrismaConfigPath);
    });
    /** Shares the same snapshot as `@db.Date` because the output must be identical. */
    describe('with a custom datasource name', () => {
        createGeneratorTest(import.meta, stringDatesCustomDatasourcePrismaConfigPath);
    });
});
