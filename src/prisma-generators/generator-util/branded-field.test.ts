import {describe, itCases} from '@augment-vir/test';
import {createBrandedTypeName} from './branded-field.js';

describe(createBrandedTypeName.name, () => {
    itCases(createBrandedTypeName, [
        {
            it: 'handles camel case inputs',
            input: {
                fileModelName: 'UserPost',
                fieldName: 'id',
            },
            expect: {
                originalFieldName: 'id',
                originalModelName: 'UserPost',
                brandedFieldName: 'UserPostId',
            },
        },
    ]);
});
