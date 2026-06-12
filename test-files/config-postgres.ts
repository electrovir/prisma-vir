import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: './schema-postgres.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
