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

export const testPrismaConfigPath = join(testFilesDir, 'config.ts');
export const testPrismaConfig2Path = join(testFilesDir, 'config2.ts');
export const testPrismaConfigPostgresPath = join(testFilesDir, 'config-postgres.ts');
export const testInvalidPrismaConfigPath = join(testFilesDir, 'config-invalid.ts');
export const simplePrismaConfigPath = join(testFilesDir, 'config-simple.ts');
export const testPrismaConfigMultiRelation = join(testFilesDir, 'config-multi-relation.ts');
