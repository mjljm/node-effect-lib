import { IoOs, IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import * as FileSystem from '@effect/platform/FileSystem';
import { MEffect, MError, MPredicate } from '@mjljm/effect-lib';
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

const PlatformFsTag = PlatformNodeFs.FileSystem;
type PlatformFsInterface = Context.Tag.Service<typeof PlatformFsTag>;

export interface FileInfo {
	readonly fullName: string;
	readonly baseName: string;
	readonly dirName: string;
	stat: FileSystem.File.Info;
}

const readDirectoryWithInfo =
	(platformFs: PlatformFsInterface, ioPath: IoPath.Interface) =>
	(
		path: string,
		options?: FileSystem.ReadDirectoryOptions,
		filesExclude: Predicate.Predicate<string> = () => false,
		dirsExclude: Predicate.Predicate<string> = () => false
	) =>
		Effect.flatMap(platformFs.readDirectory(path, options), (files) =>
			pipe(
				files,
				ReadonlyArray.map((relativeName) =>
					pipe(ioPath.join(path, relativeName), (fullName) =>
						Effect.map(platformFs.stat(fullName), (stat) =>
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

const implementation = (
	platformFs: PlatformFsInterface,
	ioPath: IoPath.ServiceInterface,
	ioOs: IoOs.ServiceInterface
) => ({
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
				new MError.FunctionPort({
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
	readDirectoryWithInfo: readDirectoryWithInfo(platformFs, ioPath),

	/**
	 * Reads the directory tree upward starting at path until either stopPredicate returns true or the user's home directory is reached.
	 * @param path The start path (must be a directory path, not a file path)
	 * @param condition Function that receives all files (after filtering) of the currently read directory and returns an effectful false to stop the search, or an effectful true to continue
	 * @param filesExclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @returns the matching path in an Option.some if any. Option.none otherwise.
	 */
	readDirectoriesUpwardWhile: <R, E>(
		path: string,
		condition: MPredicate.PredicateEffect<Array<FileInfo>, R, E>,
		filesExclude: Predicate.Predicate<string> = () => false
	) =>
		Effect.gen(function* (_) {
			const relativePath = ioPath.relative(ioOs.homeDir(), path);
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
				MEffect.iterateFullEffect(
					{ path, distance },
					{
						while: ({ path, distance }) =>
							distance < 0
								? Effect.succeed(false)
								: pipe(
										readDirectoryWithInfo(platformFs, ioPath)(
											path,
											{ recursive: false },
											filesExclude,
											() => true
										),
										Effect.flatMap(condition)
								  ),
						body: ({ path, distance }) =>
							Effect.succeed({
								path: ioPath.join(path, '..'),
								distance: distance - 1
							})
					}
				),
				Effect.map((sLast) =>
					distance >= 0 ? Option.some(sLast.path) : Option.none()
				)
			);
		}),

	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than reading all subdirectories and filtering afterwards.
	 * @param path The path of the directory to read
	 * @param filesExclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @param dirsExclude A predicate function that receives a directory name and returns true to keep it, false to filter it out.
	 * @returns An array containing the fileInfo of each found file
	 */
	readDirRecursivelyWithFilters: (
		path: string,
		filesExclude: Predicate.Predicate<string> = () => false,
		dirsExclude: Predicate.Predicate<string> = () => false
	) =>
		Effect.map(
			Effect.iterate(
				{
					pathsToExplore: dirsExclude(path)
						? ReadonlyArray.empty<string>()
						: [path],
					fileList: ReadonlyArray.empty<FileInfo>()
				},
				{
					while: ({ pathsToExplore }) => pathsToExplore.length > 0,
					body: ({ pathsToExplore, fileList }) =>
						pipe(
							pathsToExplore,
							ReadonlyArray.map((path) =>
								readDirectoryWithInfo(platformFs, ioPath)(
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
										file.stat.type === 'Directory'
											? Either.left(file.fullName)
											: Either.right(file)
									),
									(t) => ({
										pathsToExplore: t[0],
										fileList: ReadonlyArray.appendAll(fileList, t[1])
									})
								)
							)
						)
				}
			),
			(sLast) => sLast.fileList
		)
});

export interface ServiceInterface
	extends PlatformFsInterface,
		Readonly<ReturnType<typeof implementation>> {}

export const Service = Context.Tag<ServiceInterface>(
	Symbol.for('#internal/IoFs.ts')
);

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const platformFs = yield* _(PlatformFsTag);
		const ioPath = yield* _(IoPath.Service);
		const ioOs = yield* _(IoOs.Service);
		return { ...platformFs, ...implementation(platformFs, ioPath, ioOs) };
	})
);
