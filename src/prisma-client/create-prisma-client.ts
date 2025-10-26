import {assert} from '@augment-vir/assert';
import {type BasePrismaClient} from '@augment-vir/common';
import {type Constructor} from 'type-fest';
import {createPostgresPrismaClient} from './postgres-client.js';
import {
    PrismaDatabaseEngine,
    type CreatePrismaClientOutput,
    type CreatePrismaClientParams,
} from './prisma-client-types.js';
import {createSqlitePrismaClient} from './sqlite-client.js';

/**
 * Create an Prisma client instance, ensuring the database is setup properly (when applicable and
 * possible).
 *
 * @category Main
 */
export async function createPrismaClient<
    const Engine extends PrismaDatabaseEngine,
    const PrismaClient extends BasePrismaClient,
>(
    engine: Engine,
    prismaClientConstructor: Constructor<PrismaClient>,
    {seedScript, extendScript, ...params}: Readonly<CreatePrismaClientParams<Engine, PrismaClient>>,
): Promise<CreatePrismaClientOutput<PrismaClient>> {
    const {databasePath, basePrismaClient, wasJustInitialized, adapter} =
        engine === PrismaDatabaseEngine.Postgres
            ? await createPostgresPrismaClient<PrismaClient>(
                  prismaClientConstructor,
                  params as Readonly<
                      CreatePrismaClientParams<PrismaDatabaseEngine.Postgres, PrismaClient>
                  >,
              )
            : engine === PrismaDatabaseEngine.Sqlite
              ? await createSqlitePrismaClient<PrismaClient>(
                    prismaClientConstructor,
                    params as Readonly<
                        CreatePrismaClientParams<PrismaDatabaseEngine.Sqlite, PrismaClient>
                    >,
                )
              : assert.never(`Unexpected prisma database engine: '${String(engine)}'`);

    const prismaClient: PrismaClient = extendScript
        ? extendScript({prismaClient: basePrismaClient})
        : basePrismaClient;

    if (wasJustInitialized && seedScript) {
        await seedScript({test: params.connection.dev?.test, prismaClient});
    }

    return {
        adapter,
        prismaClient,
        databasePath,
    };
}
