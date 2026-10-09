import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: './string-dates-custom-datasource-schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
