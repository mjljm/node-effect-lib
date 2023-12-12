import { IoOs, IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import * as FileSystem from '@effect/platform/FileSystem';
import { MEffect, MError, MPredicate, Tree } from '@mjljm/effect-lib';
import {
	Chunk,
	Context,
	Data,
	Effect,
	Equal,
	Hash,
	Layer,
	Predicate,
	ReadonlyArray,
	Stream,
	Tuple,
	pipe
} from 'effect';
import { Concurrency } from 'effect/Types';
import * as NodeFs from 'node:fs';
import * as NodeFsPromises from 'node:fs/promises';

const moduleTag = '@mjljm/node-effect-lib/IoFs/';
const PlatformNodeFsTag = PlatformNodeFs.FileSystem;
type PlatformNodeFsInterface = Context.Tag.Service<typeof PlatformNodeFsTag>;

export class FileInfo extends Data.Class<{
	readonly fullName: string;
	readonly baseName: string;
	readonly dirName: string;
	readonly stat: FileSystem.File.Info;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof FileInfo
			? Equal.equals(this.fullName, that.fullName)
			: false;
	[Hash.symbol] = (): number => Hash.hash(this.fullName);
}

export class ReadFileStringParams extends Data.Class<{
	readonly path: string;
	readonly encoding?: string | undefined;
}> {}

export class ReadDirectoryWithInfoParams extends Data.Class<{
	readonly path: string;
	readonly options?: FileSystem.ReadDirectoryOptions | undefined;
	readonly concurrencyOptions?:
		| { readonly concurrency?: Concurrency | undefined }
		| undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof ReadDirectoryWithInfoParams
			? this.path === that.path &&
			  ((this.options !== undefined &&
					that.options !== undefined &&
					this.options.recursive === that.options.recursive) ||
					(this.options === undefined && that.options === undefined))
			: false;
	[Hash.symbol] = (): number =>
		Hash.hash(this.path) + Hash.hash(this.options?.recursive);
}

export class readDirectoryWithInfoAndFiltersParams extends Data.Class<{
	path: string;
	readonly options?: FileSystem.ReadDirectoryOptions | undefined;
	readonly filesInclude: Predicate.Predicate<string>;
	readonly dirsExclude: Predicate.Predicate<string>;
	readonly concurrencyOptions?:
		| { readonly concurrency?: Concurrency | undefined }
		| undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof readDirectoryWithInfoAndFiltersParams
			? this.path === that.path &&
			  this.options?.recursive === that.options?.recursive &&
			  this.filesInclude === that.filesInclude && // functions are considered equal only if same object
			  this.dirsExclude === that.dirsExclude // functions are considered equal only if same object
			: false;
	[Hash.symbol] = (): number =>
		Hash.hash(this.path) +
		Hash.hash(this.options?.recursive) +
		Hash.hash(this.filesInclude) +
		Hash.hash(this.dirsExclude);
}

export interface ServiceInterface
	extends Omit<PlatformNodeFsInterface, 'readFileString'> {
	/**
	 * Same as readFileString but the result can be memoize
	 */
	readFileString: (
		params: ReadFileStringParams,
		memoize?: boolean | undefined
	) => Effect.Effect<never, PlatformError, string>;

	/**
	 * List the contents of a directory. You can recursively list the contents of nested directories by setting the recursive option. Can be memoize.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfo: (
		params: ReadDirectoryWithInfoParams,
		memoize?: boolean | undefined
	) => Effect.Effect<never, PlatformError, Chunk.Chunk<FileInfo>>;

	/**
	 * List the contents of a directory.
	 * You can recursively list the contents of nested directories by setting the recursive option. Unlike readDirRecursivelyWithFilters, dirsExclude is applied after reading the directories, i.e. it is never called if you sey the recursive option.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfoAndFilters: (
		params: readDirectoryWithInfoAndFiltersParams,
		memoize?: boolean | undefined
	) => Effect.Effect<never, PlatformError, Chunk.Chunk<FileInfo>>;

	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than readDirectoryWithInfoAndFilters that reads all subdirectories and filters afterwards.
	 * @param path The path of the directory to read
	 * @param filesInclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @param dirsExclude A predicate function that receives a directory name and returns false to keep it, true to filter it out.
	 * @returns An array containing the fileInfo of each found file
	 */
	readDirRecursivelyWithFilters: (
		params: {
			startPath: FileInfo;
			filesInclude: Predicate.Predicate<string>;
			dirsExclude: Predicate.Predicate<string>;
			concurrencyOptions?:
				| { readonly concurrency?: Concurrency | undefined }
				| undefined;
		},
		memoize?: boolean
	) => Effect.Effect<
		never,
		PlatformError | MError.General,
		Chunk.Chunk<FileInfo>
	>;

	/**
	 * Reads the directory tree upward starting at path until either stopPredicate returns true or the user's home directory is reached.
	 * @param path The start path (must be a directory path, not a file path)
	 * @param condition Function that receives all files (after filtering) of the currently read directory and returns an effectful false to stop the search, or an effectful true to continue
	 * @param filesInclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @returns the matching path in an Option.some if any. Option.none otherwise.
	 */
	readDirectoriesUpwardWhile: <R, E>(
		params: {
			path: string;
			isTargetDir: MPredicate.PredicateEffect<Chunk.Chunk<FileInfo>, R, E>;
			filesInclude: Predicate.Predicate<string>;
			concurrencyOptions?:
				| { readonly concurrency?: Concurrency | undefined }
				| undefined;
		},
		memoize?: boolean | undefined
	) => Effect.Effect<R, PlatformError | E, Chunk.Chunk<FileInfo>>;

	/**
	 * Port of Node js fsPromises.watch function - Only the function that returns FileChangeInfo<string>'s has been ported.
	 * @param filename The file or directory to watch
	 * @param options See Node js's WatchOptions.
	 * @returns
	 */
	watch: (params: {
		filename: string;
		options?: NodeFs.WatchOptions | BufferEncoding | undefined;
	}) => Stream.Stream<
		never,
		MError.FunctionPort,
		NodeFs.promises.FileChangeInfo<string>
	>;
}

export const Service = Context.Tag<ServiceInterface>(
	Symbol.for(moduleTag + 'Service')
);

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const platformFs = yield* _(PlatformNodeFsTag);
		const ioPath = yield* _(IoPath.Service);
		const ioOs = yield* _(IoOs.Service);

		const cachedReadFileString = yield* _(
			Effect.cachedFunction(({ path, encoding }: ReadFileStringParams) =>
				platformFs.readFileString(path, encoding)
			)
		);

		const readFileString: ServiceInterface['readFileString'] = (
			params,
			memoize
		) =>
			memoize ?? false
				? cachedReadFileString(params)
				: platformFs.readFileString(params.path, params.encoding);

		const normalReadDirectoryWithInfo = ({
			path,
			options,
			concurrencyOptions
		}: ReadDirectoryWithInfoParams) =>
			Effect.gen(function* (_) {
				const paths = yield* _(platformFs.readDirectory(path, options));
				const realPaths = yield* _(
					ReadonlyArray.map(paths, (relativePath) =>
						Effect.gen(function* (_) {
							const fullName = yield* _(
								ioPath.resolve(path, relativePath),
								platformFs.realPath
							);
							const fileInfo = yield* _(platformFs.stat(fullName));
							return Tuple.make(fullName, fileInfo);
						})
					),
					Effect.allWith(concurrencyOptions)
				);
				return pipe(
					ReadonlyArray.map(
						realPaths,
						([fullName, stat]) =>
							new FileInfo({
								fullName,
								baseName: ioPath.basename(fullName),
								dirName: ioPath.dirname(fullName),
								stat
							})
					),
					Chunk.unsafeFromArray
				);
			});
		/*const cachedReadDirectoryWithInfo =yield* _(
					MEffect.cachedFunctionWithLogging(
						normalReadDirectoryWithInfo,
						(p,_,event) =>
								Effect.logDebug(
									IoLogger.messageWithKey(
										`${p.path} read from ${event==='onRecalc'?'disk':'cache'}`,
										'readDirectoryWithInfo' + p.path
									)
								),
						ReadDirectoryWithInfoParamsEq
					));*/
		const cachedReadDirectoryWithInfo = yield* _(
			Effect.cachedFunction(normalReadDirectoryWithInfo)
		);

		const readDirectoryWithInfo: ServiceInterface['readDirectoryWithInfo'] = (
			params,
			memoize
		) =>
			memoize
				? cachedReadDirectoryWithInfo(params)
				: normalReadDirectoryWithInfo(params);

		const readDirectoryWithInfoAndFilters: ServiceInterface['readDirectoryWithInfoAndFilters'] =
			(
				{
					path,
					options,
					filesInclude = () => true,
					dirsExclude = () => false,
					concurrencyOptions
				},
				memoize
			) =>
				pipe(
					readDirectoryWithInfo(
						new ReadDirectoryWithInfoParams({
							path,
							options,
							concurrencyOptions
						}),
						memoize
					),
					Effect.map(
						Chunk.filter(
							(fileInfo) =>
								(fileInfo.stat.type === 'Directory' &&
									!dirsExclude(fileInfo.fullName)) ||
								(fileInfo.stat.type === 'File' &&
									filesInclude(fileInfo.fullName))
						)
					)
				);
		return {
			...platformFs,
			readFileString,
			readDirectoryWithInfo,
			readDirectoryWithInfoAndFilters,
			readDirRecursivelyWithFilters: (
				{
					startPath,
					filesInclude = () => true,
					dirsExclude = () => false,
					concurrencyOptions
				},
				memoize
			) =>
				pipe(
					MEffect.treeUnfold<
						never,
						MError.General | PlatformError,
						Chunk.Chunk<FileInfo>,
						FileInfo
					>(
						startPath,
						(nextSeed, isCircular) =>
							pipe(
								isCircular
									? new MError.General({
											message: `Circularity detected in ${moduleTag}readDirRecursivelyWithFilters from path: ${startPath.fullName}`
									  })
									: nextSeed.stat.type === 'Directory'
									  ? Effect.map(
												readDirectoryWithInfoAndFilters(
													new readDirectoryWithInfoAndFiltersParams({
														path: nextSeed.fullName,
														options: { recursive: false },
														filesInclude,
														dirsExclude,
														concurrencyOptions
													}),
													memoize
												),
												(files) =>
													Chunk.partition(
														files,
														(fileInfo) => fileInfo.stat.type === 'Directory'
													)
									    )
									  : new MError.General({
												message: `${moduleTag}readDirRecursivelyWithFilters was called with a path that is not a directory: ${startPath.fullName}`
									    })
							),
						memoize,
						undefined,
						concurrencyOptions
					),
					Effect.map(
						Tree.reduce(Chunk.empty<FileInfo>(), (acc, a) =>
							Chunk.appendAll(acc, a)
						)
					)
				),

			readDirectoriesUpwardWhile: (
				{ path, isTargetDir, filesInclude = () => true, concurrencyOptions },
				memoize
			) =>
				pipe(
					Stream.iterate(path, (path) => ioPath.join(path, '..')),
					Stream.takeUntil(
						(path) => path === ioOs.homeDir || path === ioOs.rootDir
					),
					Stream.mapEffect((path) =>
						readDirectoryWithInfoAndFilters(
							new readDirectoryWithInfoAndFiltersParams({
								path,
								options: { recursive: false },
								filesInclude,
								dirsExclude: () => true,
								concurrencyOptions
							}),
							memoize
						)
					),
					Stream.takeUntilEffect(isTargetDir),
					Stream.runCollect,
					Effect.map(Chunk.flatten)
				),
			watch: ({ filename, options }) =>
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
		};
	})
);
