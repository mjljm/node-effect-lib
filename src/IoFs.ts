import { IoOs, IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import * as FileSystem from '@effect/platform/FileSystem';
import { MEffect, MError, MPredicate, MStruct } from '@mjljm/effect-lib';
import {
	Context,
	Effect,
	Either,
	Equivalence,
	Layer,
	Option,
	Predicate,
	ReadonlyArray,
	Stream,
	String,
	pipe
} from 'effect';
import { Concurrency } from 'effect/Types';
import type * as NodeFs from 'node:fs';
import * as NodeFsPromises from 'node:fs/promises';

interface ReadFileStringParam {
	readonly path: string;
	readonly encoding?: string | undefined;
}
const ReadFileStringParam = MStruct.make<ReadFileStringParam>;
const ReadFileStringParamEq = Equivalence.make<ReadFileStringParam>(
	(self, that) => self.path === that.path && self.encoding === that.encoding
);
type ReadFileString = (
	p: ReadFileStringParam
) => Effect.Effect<never, PlatformError, string>;

interface ReadDirectoryWithInfoParam {
	readonly path: string;
	readonly options?: FileSystem.ReadDirectoryOptions | undefined;
	readonly concurrencyOptions?:
		| { readonly concurrency?: Concurrency }
		| undefined;
}
const ReadDirectoryWithInfoParam = MStruct.make<ReadDirectoryWithInfoParam>;
const ReadDirectoryWithInfoParamEq =
	Equivalence.make<ReadDirectoryWithInfoParam>(
		(self, that) =>
			self.path === that.path &&
			self.options?.recursive === that.options?.recursive
	);
type ReadDirectoryWithInfo = (
	p: ReadDirectoryWithInfoParam
) => Effect.Effect<never, PlatformError, Readonly<FileInfo>[]>;

const PlatformFsTag = PlatformNodeFs.FileSystem;
type PlatformFsInterface = Context.Tag.Service<typeof PlatformFsTag>;

export interface FileInfo {
	readonly fullName: string;
	readonly baseName: string;
	readonly dirName: string;
	readonly stat: FileSystem.File.Info;
}

export const FileInfo = MStruct.make<FileInfo>;

const readDirectoryWithInfo =
	(platformFs: PlatformFsInterface, ioPath: IoPath.ServiceInterface) =>
	(
		path: string,
		options?: FileSystem.ReadDirectoryOptions,
		concurrencyOptions?: { readonly concurrency?: Concurrency }
	) =>
		Effect.flatMap(platformFs.readDirectory(path, options), (files) =>
			pipe(
				files,
				ReadonlyArray.map((relativeName) =>
					pipe(ioPath.join(path, relativeName), (fullName) =>
						Effect.map(platformFs.stat(fullName), (stat) =>
							FileInfo({
								fullName,
								baseName: ioPath.basename(fullName),
								dirName: ioPath.dirname(fullName),
								stat
							})
						)
					)
				),
				Effect.allWith(concurrencyOptions)
			)
		);

const cacheableReadDirectoryWithInfo =
	(
		platformFs: PlatformFsInterface,
		ioPath: IoPath.ServiceInterface,
		cachedReadDirectoryWithInfo: ReadDirectoryWithInfo
	) =>
	(
		path: string,
		options?: FileSystem.ReadDirectoryOptions,
		concurrencyOptions?: { readonly concurrency?: Concurrency },
		memoized = false
	): Effect.Effect<never, PlatformError, Readonly<FileInfo>[]> =>
		memoized
			? cachedReadDirectoryWithInfo(
					ReadDirectoryWithInfoParam({ path, options, concurrencyOptions })
			  )
			: readDirectoryWithInfo(platformFs, ioPath)(
					path,
					options,
					concurrencyOptions
			  );

const readDirectoryWithInfoAndFilters =
	(
		platformFs: PlatformFsInterface,
		ioPath: IoPath.ServiceInterface,
		cachedReadDirectoryWithInfo: ReadDirectoryWithInfo
	) =>
	(
		path: string,
		options?: FileSystem.ReadDirectoryOptions,
		filesExclude: Predicate.Predicate<string> = () => false,
		dirsExclude: Predicate.Predicate<string> = () => false,
		concurrencyOptions?: { readonly concurrency?: Concurrency },
		memoized?: boolean
	) =>
		pipe(
			cacheableReadDirectoryWithInfo(
				platformFs,
				ioPath,
				cachedReadDirectoryWithInfo
			)(path, options, concurrencyOptions, memoized),
			Effect.map(
				ReadonlyArray.filter(
					(fileInfo) =>
						!(
							(fileInfo.stat.type === 'Directory' &&
								dirsExclude(fileInfo.fullName)) ||
							(fileInfo.stat.type === 'File' && filesExclude(fileInfo.fullName))
						)
				)
			)
		);

const implementation = (
	platformFs: PlatformFsInterface,
	ioPath: IoPath.ServiceInterface,
	ioOs: IoOs.ServiceInterface,
	cachedReadFileString: ReadFileString,
	cachedReadDirectoryWithInfo: ReadDirectoryWithInfo
) => ({
	/**
	 * Same as readFileString but the result can be memoized
	 */
	cacheableReadFileString: (
		path: string,
		encoding?: string,
		memoized = false
	): Effect.Effect<never, PlatformError, string> =>
		memoized
			? cachedReadFileString(ReadFileStringParam({ path, encoding }))
			: platformFs.readFileString(path, encoding),

	/**
	 * List the contents of a directory. You can recursively list the contents of nested directories by setting the recursive option. Can be memoized.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	cacheableReadDirectoryWithInfo: cacheableReadDirectoryWithInfo(
		platformFs,
		ioPath,
		cachedReadDirectoryWithInfo
	),

	/**
	 * List the contents of a directory.
	 * You can recursively list the contents of nested directories by setting the recursive option. Unlike readDirRecursivelyWithFilters, dirsExclude is applied after reading the directories, i.e. it is never called if you sey the recursive option.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfoAndFilters: readDirectoryWithInfoAndFilters(
		platformFs,
		ioPath,
		cachedReadDirectoryWithInfo
	),

	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than readDirectoryWithInfoAndFilters that reads all subdirectories and filters afterwards.
	 * @param path The path of the directory to read
	 * @param filesExclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @param dirsExclude A predicate function that receives a directory name and returns true to keep it, false to filter it out.
	 * @returns An array containing the fileInfo of each found file
	 */
	readDirRecursivelyWithFilters: (
		path: string,
		filesExclude: Predicate.Predicate<string> = () => false,
		dirsExclude: Predicate.Predicate<string> = () => false,
		concurrencyOptions?: { readonly concurrency?: Concurrency },
		memoized?: boolean
	) =>
		Effect.map(
			Effect.iterate(
				{
					fileList: ReadonlyArray.empty<FileInfo>(),
					pathsToExplore: dirsExclude(path)
						? ReadonlyArray.empty<string>()
						: [path]
				},
				{
					while: ({ pathsToExplore }) => pathsToExplore.length > 0,
					body: ({ fileList, pathsToExplore }) =>
						pipe(
							pathsToExplore,
							ReadonlyArray.map((path) =>
								readDirectoryWithInfoAndFilters(
									platformFs,
									ioPath,
									cachedReadDirectoryWithInfo
								)(
									path,
									{ recursive: false },
									filesExclude,
									dirsExclude,
									concurrencyOptions,
									memoized
								)
							),
							Effect.allWith(concurrencyOptions),
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
										fileList: ReadonlyArray.appendAll(fileList, t[1]),
										pathsToExplore: t[0]
									})
								)
							)
						)
				}
			),
			(sLast) => sLast.fileList
		),

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
		filesExclude: Predicate.Predicate<string> = () => false,
		concurrencyOptions?: { readonly concurrency?: Concurrency },
		memoized?: boolean
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
					{ distance, path },
					{
						while: ({ distance, path }) =>
							distance < 0
								? Effect.succeed(false)
								: pipe(
										readDirectoryWithInfoAndFilters(
											platformFs,
											ioPath,
											cachedReadDirectoryWithInfo
										)(
											path,
											{ recursive: false },
											filesExclude,
											() => true,
											concurrencyOptions,
											memoized
										),
										Effect.flatMap(condition)
								  ),
						body: ({ distance, path }) =>
							Effect.succeed({
								distance: distance - 1,
								path: ioPath.join(path, '..')
							})
					}
				),
				Effect.map((sLast) =>
					distance >= 0 ? Option.some(sLast.path) : Option.none()
				)
			);
		}),
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

		// The memoized functions must be built in the layer so it does not get rebuilt with each call to the function
		const cachedReadFileString = yield* _(
			Effect.cachedFunction(
				(p: ReadFileStringParam) =>
					platformFs.readFileString(p.path, p.encoding),
				ReadFileStringParamEq
			)
		);

		const cachedReadDirectoryWithInfo = yield* _(
			Effect.cachedFunction(
				(p: ReadDirectoryWithInfoParam) =>
					readDirectoryWithInfo(platformFs, ioPath)(
						p.path,
						p.options,
						p.concurrencyOptions
					),
				ReadDirectoryWithInfoParamEq
			)
		);

		/*const cachedReadDirectoryWithInfo = yield* _(
			MEffect.cachedFunctionWithLogging(
				(p: ReadDirectoryWithInfoParam) =>
					readDirectoryWithInfo(platformFs, ioPath)(
						p.path,
						p.options,
						p.concurrencyOptions
					),
				(p: ReadDirectoryWithInfoParam, sureNotFromCache: boolean) =>
					Effect.logDebug(
						IoLogger._(
							`${p.path} read from ${sureNotFromCache ? 'disk' : 'cache'}`,
							false,
							false,
							null,
							'readDirectoryWithInfo' + p.path
						)
					),
				ReadDirectoryWithInfoParamEq
			)
		);*/

		return {
			...platformFs,
			...implementation(
				platformFs,
				ioPath,
				ioOs,
				cachedReadFileString,
				cachedReadDirectoryWithInfo
			)
		};
	})
);
