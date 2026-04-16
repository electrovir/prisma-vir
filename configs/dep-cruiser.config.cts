import {defineConfig} from '@virmator/deps/configs/dep-cruiser.config.base.js';
import {type IConfiguration} from 'dependency-cruiser';

const baseConfig = defineConfig({
    fileExceptions: {
        // enter file exceptions by rule name here
        'no-orphans': {
            from: [
                'src/index\\.ts$',
            ],
        },
        'not-to-unresolvable': {
            to: [
                /** This is used in some tests and it might not be generated yet. */
                'test-files/generated/client\\.js',
            ],
        },
    },
    omitRules: [
        // enter rule names here to omit
    ],
});

const depCruiserConfig: IConfiguration = {
    ...baseConfig,
};

module.exports = depCruiserConfig;
