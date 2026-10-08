import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: './string-dates-schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
