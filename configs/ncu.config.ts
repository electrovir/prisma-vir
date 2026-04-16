import {baseNcuConfig} from '@virmator/deps/configs/ncu.config.base.js';
import {RunOptions} from 'npm-check-updates';

export const ncuConfig: RunOptions = {
    ...baseNcuConfig,
    // exclude these
    reject: [
        ...baseNcuConfig.reject,
        'prisma',
        '@prisma/*',
    ],
    // include only these
    filter: [],
};
