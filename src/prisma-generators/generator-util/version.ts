import {assertWrap} from '@augment-vir/assert';
import {readPackageJson} from '@augment-vir/node';
import {repoDirPath} from '../../file-paths.js';

export const generatorVersion: string = assertWrap.isDefined(
    (await readPackageJson(repoDirPath)).version,
);
