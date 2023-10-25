import * as FileSystem from '@effect/platform/FileSystem';
import { FunctionPortError } from '@mjljm/effect-lib/Errors';
import * as IoFs from '@mjljm/node-effect-lib/IoFs';
import * as IoPath from '@mjljm/node-effect-lib/IoPath';
import {
	Context,
	Effect,
	Either,
	Layer,
	Option,
	Predicate,
	ReadonlyArray,
	Stream,
	String,
	pipe
} from 'effect';
import type * as NodeFs from 'node:fs';
import * as NodeFsPromises from 'node:fs/promises';
import * as os from 'node:os';

export interface FileInfo {
	readonly fullName: string;
	readonly baseName: string;
	readonly dirName: string;
	stat: FileSystem.File.Info;
}

const readDirectoryWithInfo =
	(ioFs: IoFs.Interface, ioPath: IoPath.Interface) =>
	(
		path: string,
		options?: FileSystem.ReadDirectoryOptions,
		filesExclude: Predicate.Predicate<string> = () => false,
		dirsExclude: Predicate.Predicate<string> = () => false
	) =>
		Effect.flatMap(ioFs.readDirectory(path, options), (files) =>
			pipe(
				files,
				ReadonlyArray.map((relativeName) =>
					pipe(ioPath.join(path, relativeName), (fullName) =>
						Effect.map(ioFs.stat(fullName), (stat) =>
							(stat.type === 'Directory' && dirsExclude(fullName)) ||
							(stat.type === 'File' && filesExclude(fullName))
								? Option.none()
								: Option.some({
										fullName,
										baseName: ioPath.basename(fullName),
										dirName: ioPath.dirname(fullName),
										stat
								  } as FileInfo)
						)
					)
				),
				Effect.allWith({ concurrency: 'unbounded' }),
				Effect.map(ReadonlyArray.compact)
			)
		);
const implementation = (ioFs: IoFs.Interface, ioPath: IoPath.Interface) => ({
	/**
	 * Port of Node js fsPromises.watch function - Only the function that returns FileChangeInfo<string>'s has been ported.
	 * @param filename The file or directory to watch
	 * @param options See Node js's WatchOptions.
	 * @returns
	 */

	watch: (filename: string, options?: NodeFs.WatchOptions | BufferEncoding) =>
		Stream.fromAsyncIterable(
			NodeFsPromises.watch(filename, options),
			(e) =>
				new FunctionPortError({
					originalError: e,
					originalFunctionName: 'fsPromises.watch',
					moduleName: import.meta.url,
					libraryName: 'node-effect-lib'
				})
		),

	/**
	 * List the contents of a directory.
	 * You can recursively list the contents of nested directories by setting the recursive option.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfo: readDirectoryWithInfo(ioFs, ioPath),

	/**
	 * Reads the directory tree upward starting at path until either stopPredicate returns true or the user's home directory is reached.
	 * @param path The start path (must be a directory path, not a file path)
	 * @param stopPredicate Function that receives all non filtered files of the currently read directory and returns an effectful true to stop the search, or an effectful false to continue
	 * @param filesExclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @returns
	 */
	readDirectoriesUpwardUntil: <C, E>(
		path: string,
		stopPredicate: (files: Array<FileInfo>) => Effect.Effect<C, E, boolean>,
		filesExclude: Predicate.Predicate<string> = () => false
	) =>
		Effect.gen(function* (_) {
			const relativePath = ioPath.relative(os.homedir(), path);
			const distance = pipe(relativePath, String.startsWith('..'))
				? -1
				: pipe(
						relativePath,
						String.split(ioPath.sep),
						// Handle to===from and front and trailing slashes
						ReadonlyArray.filter((s) => s !== ''),
						ReadonlyArray.length
				  );
			return yield* _(
				pipe(
					Effect.iterate(
						{ path, distance, found: false, first: true },
						{
							while: (sCurrent) => sCurrent.distance >= 0 && !sCurrent.found,
							body: (sIn) =>
								pipe(sIn.first ? sIn.path : ioPath.join(sIn.path, '..'), (pathUp) =>
									pipe(
										readDirectoryWithInfo(ioFs, ioPath)(
											pathUp,
											{ recursive: false },
											filesExclude,
											() => true
										),
										Effect.flatMap(stopPredicate),
										Effect.map((found) => ({
											path: pathUp,
											distance: sIn.distance - 1,
											found,
											first: false
										}))
									)
								)
						}
					),
					Effect.map((sLast) => (sLast.found ? Option.some(sLast.path) : Option.none()))
				)
			);
		}),

	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than reading all subdirectories and filtering afterwards.
	 * @param path The path of the directory to read
	 * @param filesExclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @param dirsExclude A predicate function that receives a directory name and returns true to keep it, false to filter it out.
	 * @returns
	 */
	readDirRecursivelyWithFilters: (
		path: string,
		filesExclude: Predicate.Predicate<string> = () => false,
		dirsExclude: Predicate.Predicate<string> = () => false
	) =>
		Effect.map(
			Effect.iterate(
				{
					paths: dirsExclude(path) ? ReadonlyArray.empty<string>() : [path],
					projectConfigs: ReadonlyArray.empty<FileInfo>()
				},
				{
					while: (sCurrent) => sCurrent.paths.length > 0,
					body: (sIn) =>
						pipe(
							sIn.paths,
							ReadonlyArray.map((path) =>
								readDirectoryWithInfo(ioFs, ioPath)(
									path,
									{ recursive: false },
									filesExclude,
									dirsExclude
								)
							),
							Effect.allWith({ concurrency: 'unbounded' }),
							Effect.map((files) =>
								pipe(
									files,
									ReadonlyArray.flatten,
									ReadonlyArray.partitionMap((file) =>
										file.stat.type === 'Directory' ? Either.left(file.fullName) : Either.right(file)
									),
									(t) => ({
										paths: t[0],
										projectConfigs: ReadonlyArray.appendAll(sIn.projectConfigs, t[1])
									})
								)
							)
						)
				}
			),
			(sLast) => sLast.projectConfigs
		)
});

// type Interface = typeof implementation works but leads to verbose type display
export interface Interface extends Readonly<ReturnType<typeof implementation>> {}

export const Tag = Context.Tag<Interface>(Symbol.for('@mjljm/node-effect-lib/io-fs-plus.ts'));

export const live = Layer.effect(
	Tag,
	Effect.gen(function* (_) {
		const ioFs = yield* _(IoFs.Tag);
		const ioPath = yield* _(IoPath.Tag);
		return implementation(ioFs, ioPath);
	})
);
