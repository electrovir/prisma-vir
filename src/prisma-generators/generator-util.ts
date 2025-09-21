import {assertWrap, check} from '@augment-vir/assert';
import {readPackageJson} from '@augment-vir/node';
import {type EnvValue} from '@prisma/generator-helper';
import {repoDirPath} from '../file-paths.js';

export const generatorVersion: string = assertWrap.isDefined(
    (await readPackageJson(repoDirPath)).version,
);

export function resolveGeneratorOutput(output: string | EnvValue | undefined | null): string {
    if (!output) {
        return '.';
    } else if (check.isString(output)) {
        return output;
    } else {
        return output.value || '.';
    }
}
