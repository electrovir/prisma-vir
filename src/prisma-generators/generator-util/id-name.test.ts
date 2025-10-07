import {describe, itCases} from '@augment-vir/test';
import {createIdTypeName} from './id-name.js';

describe(createIdTypeName.name, () => {
    itCases(createIdTypeName, [
        {
            it: 'handles camel case inputs',
            input: {
                modelName: 'UserPost',
                fieldName: 'id',
            },
            expect: 'UserPostId',
        },
    ]);
});
