import {join} from 'node:path';
import {notCommittedDirPath, repoDirPath} from './file-paths.js';

export const testFilesDir = join(repoDirPath, 'test-files');
export const testSqliteDbPath = join(notCommittedDirPath, 'dev.db');
export const generatedPrismaClientDirPath = join(testFilesDir, 'generated');
export const testPrismaMigrationsDirPath = join(testFilesDir, 'migrations');
export const dbDirPath = join(notCommittedDirPath, 'db');

export const simplePrismaSchemaPath = join(testFilesDir, 'simple-schema.prisma');
export const testInvalidPrismaSchemaPath = join(testFilesDir, 'invalid-schema.prisma');
export const testPrismaSchema2Path = join(testFilesDir, 'schema2.prisma');
export const testPrismaSchemaPath = join(testFilesDir, 'schema.prisma');
export const testPrismaSchemaPostgresPath = join(testFilesDir, 'schema-postgres.prisma');
export const testPrismaSchemaMultiRelation = join(testFilesDir, 'schema-multi-relation.prisma');
