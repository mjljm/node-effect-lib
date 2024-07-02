import * as ConfigsManager from '@parischap/configs-manager';
import merge from 'deepmerge';
import { basename, resolve } from 'node:path/win32';

const packageName = basename(resolve());

const packageJson = merge.all([
	ConfigsManager.packageBase(packageName),
	ConfigsManager.packageSubRepo,
	ConfigsManager.packageEffectTags,
	ConfigsManager.packageSubRepoTranspiled,
	{
		version: '1.0.0',
		description: 'A complement to the official @effect/platform library with add-ons for Node.js',
		peerDependencies: {
			...ConfigsManager.params.workspaceDevDep('js-lib'),
			...ConfigsManager.params.workspaceDevDep('effect-lib'),
			'@effect/platform': ConfigsManager.params.effectPlatformVersion,
			'@effect/platform-node': ConfigsManager.params.effectPlatformNodeVersion,
			'@effect/schema': ConfigsManager.params.schemaVersion,
			effect: ConfigsManager.params.effectVersion
		}
	}
]);

export default {
	// Put prettier in first position so the next generated files will get formatted
	[ConfigsManager.params.prettierConfigFileName]: ConfigsManager.prettierConfigTemplate,
	[ConfigsManager.params.gitIgnoreFileName]: ConfigsManager.gitIgnore,
	[ConfigsManager.params.prettierIgoreFileName]: ConfigsManager.prettierIgnore,
	[ConfigsManager.params.projectTsConfigFileName]: ConfigsManager.tsConfigSrcLibrary,
	[ConfigsManager.params.nonProjectTsConfigFileName]: ConfigsManager.tsConfigOthers,
	[ConfigsManager.params.tsConfigFileName]: ConfigsManager.tsConfig,
	[ConfigsManager.params.eslintTsConfigFileName]: ConfigsManager.tsConfigCheck,
	[ConfigsManager.params.eslintConfigFileName]: ConfigsManager.eslintConfigLibraryTemplate,
	[ConfigsManager.params.viteConfigFileName]: 'export default {};',
	[ConfigsManager.params.packageJsonFileName]: packageJson
};
