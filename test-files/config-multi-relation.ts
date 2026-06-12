import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: './schema-multi-relation.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
