import { FileInfo, IoOs, IoPath } from '#mjljm/node-effect-lib/index';
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
	Option,
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

export class ReadFileStringParams extends Data.Class<{
	readonly filename: string;
	readonly encoding?: string | undefined;
	readonly memoize?: boolean | undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof ReadFileStringParams
			? this.filename === that.filename && this.encoding === that.encoding
			: false;
	[Hash.symbol] = (): number =>
		Hash.hash(this.filename) + Hash.hash(this.encoding);
}

export class ReadDirectoryWithInfoParams extends Data.Class<{
	readonly dir: string;
	readonly options?:
		| (FileSystem.ReadDirectoryOptions & {
				resolveSymLinks?: boolean | undefined;
		  })
		| undefined;
	readonly concurrencyOptions?:
		| { readonly concurrency?: Concurrency | undefined }
		| undefined;
	readonly memoize?: boolean | undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean => {
		return that instanceof ReadDirectoryWithInfoParams
			? this.dir === that.dir &&
					(this.options?.recursive ?? false) ===
						(that.options?.recursive ?? false) &&
					(this.options?.resolveSymLinks ?? false) ===
						(that.options?.resolveSymLinks ?? false)
			: false;
	};
	[Hash.symbol] = (): number =>
		Hash.hash(this.dir) + Hash.hash(this.options?.recursive);
}

export class readDirectoryWithInfoAndFiltersParams extends Data.Class<{
	dir: string;
	readonly options?:
		| (FileSystem.ReadDirectoryOptions & {
				resolveSymLinks?: boolean | undefined;
		  })
		| undefined;
	readonly filesInclude: Predicate.Predicate<string>;
	readonly dirsExclude: Predicate.Predicate<string>;
	readonly concurrencyOptions?:
		| { readonly concurrency?: Concurrency | undefined }
		| undefined;
	readonly memoize?: boolean | undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof readDirectoryWithInfoAndFiltersParams
			? this.dir === that.dir &&
			  (this.options?.recursive ?? false) ===
					(that.options?.recursive ?? false) &&
			  (this.options?.resolveSymLinks ?? false) ===
					(that.options?.resolveSymLinks ?? false) &&
			  this.filesInclude === that.filesInclude && // functions are considered equal only if same object
			  this.dirsExclude === that.dirsExclude // functions are considered equal only if same object
			: false;
	[Hash.symbol] = (): number =>
		Hash.hash(this.dir) +
		Hash.hash(this.options?.recursive) +
		Hash.hash(this.filesInclude) +
		Hash.hash(this.dirsExclude);
}

export interface ServiceInterface
	extends Omit<PlatformNodeFsInterface, 'readFileString'> {
	/**
	 * Combines fs.stat, path.resolve, path.basename, path.dirname to provide a FileInfo on the given path
	 */
	fullStat: (
		path: string,
		resolveSymLinks?: boolean | undefined
	) => Effect.Effect<never, PlatformError, FileInfo.Type>;

	/**
	 * Same as readFileString but the result can be memoize
	 */
	readFileString: (
		params: ReadFileStringParams
	) => Effect.Effect<never, PlatformError, string>;

	/**
	 * Lists the contents of a directory. You can recursively list the contents of nested directories by setting the recursive option. Can be memoized. If resolveSymLinks is false, symbolic links are ignored. Otherwise, they are transformed to real paths.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfo: (
		params: ReadDirectoryWithInfoParams
	) => Effect.Effect<never, PlatformError, Chunk.Chunk<FileInfo.Type>>;

	/**
	 * Lists the contents of a directory.
	 * You can recursively list the contents of nested directories by setting the recursive option. Unlike readDirRecursivelyWithFilters, dirsExclude is applied after reading the directories, i.e. it is never called if you set the recursive option because directories are are opened and not returned. Memoization is handled before filtering by readDirectoryWithInfo. If resolveSymLinks is false, symbolic links are ignored. Otherwise, they are transformed to real paths.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfoAndFilters: (
		params: readDirectoryWithInfoAndFiltersParams
	) => Effect.Effect<never, PlatformError, Chunk.Chunk<FileInfo.Type>>;

	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than readDirectoryWithInfoAndFilters that reads all subdirectories and filters afterwards. Memoization is handled at directory level by readDirectoryWithInfo. If resolveSymLinks is false, symbolic links are ignored. Otherwise, they are transformed to real paths.
	 * @param dir The path of the directory to read
	 * @param filesInclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @param dirsExclude A predicate function that receives a directory name and returns false to keep it, true to filter it out.
	 * @returns An array containing the fileInfo of each found file
	 */
	readDirRecursivelyWithFilters: (params: {
		startDir: string;
		filesInclude: Predicate.Predicate<string>;
		dirsExclude: Predicate.Predicate<string>;
		resolveSymLinks?: boolean | undefined;
		concurrencyOptions?:
			| { readonly concurrency?: Concurrency | undefined }
			| undefined;
		memoize?: boolean;
	}) => Effect.Effect<
		never,
		PlatformError | MError.General,
		Chunk.Chunk<FileInfo.Type>
	>;

	/**
	 * Reads the directory tree upward starting at path until either stopPredicate returns true or the user's home directory is reached.
	 * @param dir The path to the directory where to start the search from
	 * @param condition Function that receives all files (after filtering) of the currently read directory and returns an effectful false to stop the search, or an effectful true to continue
	 * @param filesInclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @returns the matching path in an Option.some if any. Option.none otherwise.
	 */
	readDirectoriesUpwardWhile: <R, E>(params: {
		startDir: string;
		isTargetDir: MPredicate.PredicateEffect<Chunk.Chunk<FileInfo.Type>, R, E>;
		filesInclude: Predicate.Predicate<string>;
		resolveSymLinks?: boolean | undefined;
		concurrencyOptions?:
			| { readonly concurrency?: Concurrency | undefined }
			| undefined;
		memoize?: boolean | undefined;
	}) => Effect.Effect<R, PlatformError | E, Option.Option<string>>;

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

		const fullStat = (path: string, resolveSymLinks = false) =>
			Effect.gen(function* (_) {
				const absolutePath = ioPath.resolve(path);
				const realPath = resolveSymLinks
					? yield* _(platformFs.realPath(path))
					: path;
				const realAbsolutePath = ioPath.resolve(realPath);
				const stat = yield* _(absolutePath, platformFs.stat);
				return new FileInfo.Type({
					absolutePath,
					realAbsolutePath,
					basename: ioPath.basename(absolutePath),
					dirname: ioPath.dirname(absolutePath),
					stat
				});
			});

		const cachedReadFileString = yield* _(
			Effect.cachedFunction(({ filename, encoding }: ReadFileStringParams) =>
				platformFs.readFileString(filename, encoding)
			)
		);

		const readFileString: ServiceInterface['readFileString'] = (params) =>
			params.memoize ?? false
				? cachedReadFileString(params)
				: platformFs.readFileString(params.filename, params.encoding);

		const normalReadDirectoryWithInfo = ({
			dir,
			options,
			concurrencyOptions
		}: ReadDirectoryWithInfoParams) =>
			Effect.gen(function* (_) {
				const paths = yield* _(platformFs.readDirectory(dir, options));
				const infos = yield* _(
					paths,
					ReadonlyArray.map((relativePath) =>
						fullStat(
							ioPath.resolve(dir, relativePath),
							options?.resolveSymLinks
						)
					),
					Effect.allWith(concurrencyOptions)
				);
				return Chunk.unsafeFromArray(infos);
			});
		/*const cachedReadDirectoryWithInfo =yield* _(
					MEffect.cachedFunctionWithLogging(
						normalReadDirectoryWithInfo,
						(p,_,event) =>
								Effect.logDebug(
									IoLogger.messageWithKey(
										`${p.dir} read from ${event==='onRecalc'?'disk':'cache'}`,
										'readDirectoryWithInfo' + p.dir
									)
								),
						ReadDirectoryWithInfoParamsEq
					));*/
		const cachedReadDirectoryWithInfo = yield* _(
			Effect.cachedFunction(normalReadDirectoryWithInfo)
		);

		const readDirectoryWithInfo: ServiceInterface['readDirectoryWithInfo'] = (
			params
		) =>
			params.memoize
				? cachedReadDirectoryWithInfo(params)
				: normalReadDirectoryWithInfo(params);

		const readDirectoryWithInfoAndFilters: ServiceInterface['readDirectoryWithInfoAndFilters'] =
			({
				dir,
				options,
				filesInclude = () => true,
				dirsExclude = () => false,
				concurrencyOptions,
				memoize
			}) =>
				pipe(
					readDirectoryWithInfo(
						new ReadDirectoryWithInfoParams({
							dir,
							options,
							concurrencyOptions,
							memoize
						})
					),
					Effect.map(
						Chunk.filter(
							(fileInfo) =>
								(fileInfo.stat.type === 'Directory' &&
									!dirsExclude(fileInfo.absolutePath)) ||
								(fileInfo.stat.type === 'File' &&
									filesInclude(fileInfo.absolutePath))
						)
					)
				);
		return {
			...platformFs,
			fullStat,
			readFileString,
			readDirectoryWithInfo,
			readDirectoryWithInfoAndFilters,
			readDirRecursivelyWithFilters: ({
				startDir,
				filesInclude = () => true,
				dirsExclude = () => false,
				resolveSymLinks = false,
				concurrencyOptions,
				memoize = false
			}) =>
				pipe(
					startDir,
					fullStat,
					Effect.flatMap((startDirWithInfo) =>
						MEffect.treeUnfold<
							never,
							MError.General | PlatformError,
							Chunk.Chunk<FileInfo.Type>,
							FileInfo.Type
						>(
							startDirWithInfo,
							(nextSeed, isCircular) =>
								pipe(
									isCircular
										? new MError.General({
												message: `Circularity detected in ${moduleTag}readDirRecursivelyWithFilters from directory: ${startDirWithInfo.absolutePath}`
										  })
										: nextSeed.stat.type === 'Directory'
										  ? Effect.map(
													readDirectoryWithInfoAndFilters(
														new readDirectoryWithInfoAndFiltersParams({
															dir: nextSeed.absolutePath,
															options: { recursive: false, resolveSymLinks },
															filesInclude,
															dirsExclude,
															concurrencyOptions,
															memoize
														})
													),
													(files) =>
														Chunk.partition(
															files,
															(fileInfo) => fileInfo.stat.type === 'Directory'
														)
										    )
										  : new MError.General({
													message: `${moduleTag}readDirRecursivelyWithFilters was called with a path that is not a directory: ${startDirWithInfo.absolutePath}`
										    })
								),
							memoize,
							undefined,
							concurrencyOptions
						)
					),
					Effect.map(
						Tree.reduce(Chunk.empty<FileInfo.Type>(), (acc, a) =>
							Chunk.appendAll(acc, a)
						)
					)
				),

			readDirectoriesUpwardWhile: ({
				startDir,
				isTargetDir,
				filesInclude = () => true,
				resolveSymLinks = false,
				concurrencyOptions,
				memoize = false
			}) =>
				pipe(
					Stream.iterate(startDir, (dir) => ioPath.join(dir, '..')),
					Stream.takeUntil(
						(dir) => dir === ioOs.homeDir || dir === ioOs.rootDir
					),
					Stream.mapEffect((dir) =>
						pipe(
							readDirectoryWithInfoAndFilters(
								new readDirectoryWithInfoAndFiltersParams({
									dir,
									options: { recursive: false, resolveSymLinks },
									filesInclude,
									dirsExclude: () => true,
									concurrencyOptions,
									memoize
								})
							),
							Effect.flatMap((files) => isTargetDir(files)),
							Effect.map((isTargetDir) => Tuple.make(dir, isTargetDir))
						)
					),
					Stream.takeUntil(([_, isTargetDir]) => isTargetDir),
					Stream.runLast,
					Effect.map(
						Option.flatMap(([dir, isTargetDir]) =>
							isTargetDir ? Option.some(dir) : Option.none()
						)
					)
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
