import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: './simple-schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
