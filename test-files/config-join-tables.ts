import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: './schema-join-tables.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
