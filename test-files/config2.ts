import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: './schema2.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
