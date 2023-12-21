import { PathInfo } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import * as FileSystem from '@effect/platform/FileSystem';
import { MError } from '@mjljm/effect-lib';
import { Chunk, Context, Data, Effect, Equal, Hash, Option, Predicate, Stream } from 'effect';
import { Concurrency } from 'effect/Types';
import * as NodeFs from 'node:fs';

const moduleTag = '@mjljm/node-effect-lib/IoFs/';
const PlatformNodeFsService = PlatformNodeFs.FileSystem;
type PlatformNodeFsInterface = Context.Tag.Service<typeof PlatformNodeFsService>;

export class FullStatParams extends Data.Class<{
	readonly path: string;
	readonly resolveSymLinks?: boolean | undefined;
	readonly memoize?: boolean | undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof FullStatParams ? this.path === that.path && this.resolveSymLinks === that.resolveSymLinks : false;
	[Hash.symbol] = (): number => Hash.hash(this.path) + Hash.hash(this.path);
}

export class ReadFileStringParams extends Data.Class<{
	readonly filePath: string;
	readonly encoding?: string | undefined;
	readonly memoize?: boolean | undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof ReadFileStringParams ? this.filePath === that.filePath && this.encoding === that.encoding : false;
	[Hash.symbol] = (): number => Hash.hash(this.filePath) + Hash.hash(this.encoding);
}

export class ReadDirectoryWithInfoParams extends Data.Class<{
	readonly dirPath: string;
	readonly options?:
		| (FileSystem.ReadDirectoryOptions & {
				resolveSymLinks?: boolean | undefined;
		  })
		| undefined;
	readonly concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
	readonly memoize?: boolean | undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean => {
		return that instanceof ReadDirectoryWithInfoParams
			? this.dirPath === that.dirPath &&
					(this.options?.recursive ?? false) === (that.options?.recursive ?? false) &&
					(this.options?.resolveSymLinks ?? false) === (that.options?.resolveSymLinks ?? false)
			: false;
	};
	[Hash.symbol] = (): number => Hash.hash(this.dirPath) + Hash.hash(this.options?.recursive);
}

export class readDirectoryWithInfoAndFiltersParams extends Data.Class<{
	dirPath: string;
	readonly options?:
		| (FileSystem.ReadDirectoryOptions & {
				resolveSymLinks?: boolean | undefined;
		  })
		| undefined;
	readonly filesInclude: Predicate.Predicate<string>;
	readonly dirsExclude: Predicate.Predicate<string>;
	readonly concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
	readonly memoize?: boolean | undefined;
}> {
	[Equal.symbol] = (that: Equal.Equal): boolean =>
		that instanceof readDirectoryWithInfoAndFiltersParams
			? this.dirPath === that.dirPath &&
			  (this.options?.recursive ?? false) === (that.options?.recursive ?? false) &&
			  (this.options?.resolveSymLinks ?? false) === (that.options?.resolveSymLinks ?? false) &&
			  this.filesInclude === that.filesInclude && // functions are considered equal only if same object
			  this.dirsExclude === that.dirsExclude // functions are considered equal only if same object
			: false;
	[Hash.symbol] = (): number =>
		Hash.hash(this.dirPath) +
		Hash.hash(this.options?.recursive) +
		Hash.hash(this.filesInclude) +
		Hash.hash(this.dirsExclude);
}

export interface ServiceInterface extends Omit<PlatformNodeFsInterface, 'readFileString'> {
	/**
	 * Combines fs.stat, path.resolve, path.basename, path.dirPath to provide a PathInfo on the given path
	 */
	readonly fullStat: (params: FullStatParams) => Effect.Effect<never, PlatformError, PathInfo.Type>;

	/**
	 * Same as readFileString but the result can be memoize
	 */
	readonly readFileString: (params: ReadFileStringParams) => Effect.Effect<never, PlatformError, string>;

	/**
	 * Lists the contents of a directory. You can recursively list the contents of nested directories by setting the recursive option. Can be memoized. If resolveSymLinks is false, symbolic links are ignored. Otherwise, they are transformed to real paths.
	 *
	 * @returns a pathInfo.
	 */
	readonly readDirectoryWithInfo: (
		params: ReadDirectoryWithInfoParams
	) => Effect.Effect<never, PlatformError, Chunk.Chunk<PathInfo.Type>>;

	/**
	 * Lists the contents of a directory.
	 * You can recursively list the contents of nested directories by setting the recursive option. Unlike readDirRecursivelyWithFilters, dirsExclude is applied after reading the directories, i.e. it is never called if you set the recursive option because directories are are opened and not returned. Memoization is handled before filtering by readDirectoryWithInfo. If resolveSymLinks is false, symbolic links are ignored. Otherwise, they are transformed to real paths.
	 *
	 * @returns a PathInfo.
	 */
	readonly readDirectoryWithInfoAndFilters: (
		params: readDirectoryWithInfoAndFiltersParams
	) => Effect.Effect<never, PlatformError, Chunk.Chunk<PathInfo.Type>>;

	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than readDirectoryWithInfoAndFilters that reads all subdirectories and filters afterwards. Memoization is handled at directory level by readDirectoryWithInfo. If resolveSymLinks is false, symbolic links are ignored. Otherwise, they are transformed to real paths.
	 * @param dirPath The path of the directory to read
	 * @param filesInclude A predicate function that receives a filePath and returns true to keep it, false to filter it out.
	 * @param dirsExclude A predicate function that receives a directory name and returns false to keep it, true to filter it out.
	 * @returns An array containing the pathInfo of each found file
	 */
	readonly readDirRecursivelyWithFilters: (params: {
		dirPath: string;
		filesInclude: Predicate.Predicate<string>;
		dirsExclude: Predicate.Predicate<string>;
		resolveSymLinks?: boolean | undefined;
		concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
		memoize?: boolean;
	}) => Effect.Effect<never, PlatformError | MError.General, Chunk.Chunk<PathInfo.Type>>;

	/**
	 * Reads the directory tree upward starting at path until either stopPredicate returns true or the user's home directory is reached.
	 * @param dirPath The path to the directory where to start the search from
	 * @param isTargetDir Function that receives all files (after filtering) of the currently read directory and returns an effectful false to stop the search, or an effectful true to continue
	 * @param filesInclude A predicate function that receives a filePath and returns true to keep it, false to filter it out.
	 * @returns the matching path in an Option.some if any. Option.none otherwise.
	 */
	readonly readDirectoriesUpwardWhile: <R, E>(params: {
		dirPath: string;
		isTargetDir: MPredicate.PredicateEffect<Chunk.Chunk<PathInfo.Type>, R, E>;
		filesInclude: Predicate.Predicate<string>;
		resolveSymLinks?: boolean | undefined;
		concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
		memoize?: boolean | undefined;
	}) => Effect.Effect<R, PlatformError | E, Option.Option<string>>;

	/**
	 * Port of Node js fsPromises.watch function - Only the function that returns FileChangeInfo<string>'s has been ported.
	 * @param filePath The file or directory to watch
	 * @param options See Node js's WatchOptions.
	 * @returns
	 */
	readonly watch: (params: {
		filePath: string;
		options?: NodeFs.WatchOptions | BufferEncoding | undefined;
	}) => Stream.Stream<never, MError.FunctionPort, NodeFs.promises.FileChangeInfo<string>>;
}

export const Service = Context.Tag<ServiceInterface>(Symbol.for(moduleTag + 'Service'));

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const fs = yield* _(PlatformNodeFsService);
		const ioPath = yield* _(IoPath.Service);
		const ioOs = yield* _(IoOs.Service);

		const normalFullStat = ({ path: absolutePath, resolveSymLinks = false }: FullStatParams) =>
			Effect.gen(function* (_) {
				const realAbsolutePath = resolveSymLinks ? yield* _(fs.realPath(absolutePath)) : absolutePath;
				const stat = yield* _(realAbsolutePath, fs.stat);
				return new PathInfo.Type({
					absolutePath,
					realAbsolutePath,
					basename: ioPath.basename(absolutePath),
					dirPath: ioPath.dirname(absolutePath),
					stat
				});
			});

		const cachedFullStat = yield* _(Effect.cachedFunction(normalFullStat));

		const fullStat: ServiceInterface['fullStat'] = ({ path, resolveSymLinks = false, memoize = false }) => {
			// In case we use memoization, we make sure the path is absolute to avoid issues in case the
			// current directory would change
			const absoluteParams = new FullStatParams({
				path: ioPath.resolve(path),
				resolveSymLinks,
				memoize
			});
			return memoize ? cachedFullStat(absoluteParams) : normalFullStat(absoluteParams);
		};

		const cachedReadFileString = yield* _(
			Effect.cachedFunction(({ filePath: absoluteFilePath, encoding }: ReadFileStringParams) =>
				fs.readFileString(absoluteFilePath, encoding)
			)
		);

		const readFileString: ServiceInterface['readFileString'] = ({ filePath, encoding, memoize = false }) =>
			memoize
				? // In case we use memoization, we make sure the path is absolute to avoid issues in case the
				  // current directory would change
				  cachedReadFileString(
						new ReadFileStringParams({
							filePath: ioPath.resolve(filePath),
							encoding,
							memoize
						})
				  )
				: fs.readFileString(filePath, encoding);

		const normalReadDirectoryWithInfo = ({
			dirPath: absoluteDirPath,
			options,
			concurrencyOptions,
			memoize
		}: ReadDirectoryWithInfoParams) =>
			Effect.gen(function* (_) {
				const paths = yield* _(fs.readDirectory(absoluteDirPath, options));
				const infos = yield* _(
					paths,
					ReadonlyArray.map((path) =>
						fullStat(
							new FullStatParams({
								path: ioPath.resolve(absoluteDirPath, path),
								resolveSymLinks: options?.resolveSymLinks,
								memoize
							})
						)
					),
					Effect.allWith(concurrencyOptions)
				);
				return Chunk.unsafeFromArray(infos);
			});
		const cachedReadDirectoryWithInfo = yield* _(
			MEffect.cachedFunctionWithLogging(
				normalReadDirectoryWithInfo,
				(p, _, event) =>
					Effect.logDebug(
						IoLogger.messageWithKey(
							`${p.dir} read from ${event === 'onRecalc' ? 'disk' : 'cache'}`,
							'readDirectoryWithInfo' + p.dir
						)
					),
				ReadDirectoryWithInfoParamsEq
			)
		);
		const cachedReadDirectoryWithInfo = yield* _(Effect.cachedFunction(normalReadDirectoryWithInfo));

		const readDirectoryWithInfo: ServiceInterface['readDirectoryWithInfo'] = ({
			dirPath,
			options,
			concurrencyOptions,
			memoize = false
		}) => {
			// In case we use memoization, we make sure the path is absolute to avoid issues in case the
			// current directory would change
			const absoluteParams = new ReadDirectoryWithInfoParams({
				dirPath: ioPath.resolve(dirPath),
				options,
				concurrencyOptions,
				memoize
			});
			return memoize ? cachedReadDirectoryWithInfo(absoluteParams) : normalReadDirectoryWithInfo(absoluteParams);
		};
		const readDirectoryWithInfoAndFilters: ServiceInterface['readDirectoryWithInfoAndFilters'] = ({
			dirPath,
			options,
			filesInclude = () => true,
			dirsExclude = () => false,
			concurrencyOptions,
			memoize
		}) =>
			pipe(
				readDirectoryWithInfo(
					new ReadDirectoryWithInfoParams({
						dirPath,
						options,
						concurrencyOptions,
						memoize
					})
				),
				Effect.map(
					Chunk.filter(
						(pathInfo) =>
							(pathInfo.stat.type === 'Directory' && !dirsExclude(pathInfo.absolutePath)) ||
							(pathInfo.stat.type === 'File' && filesInclude(pathInfo.absolutePath))
					)
				)
			);
		return {
			...fs,
			fullStat,
			readFileString,
			readDirectoryWithInfo,
			readDirectoryWithInfoAndFilters,
			readDirRecursivelyWithFilters: ({
				dirPath,
				filesInclude = () => true,
				dirsExclude = () => false,
				resolveSymLinks = false,
				concurrencyOptions,
				memoize = false
			}) =>
				pipe(
					new FullStatParams({ path: dirPath, memoize }),
					fullStat,
					Effect.flatMap((dirInfo) =>
						MEffect.treeUnfold<never, MError.General | PlatformError, Chunk.Chunk<PathInfo.Type>, PathInfo.Type>(
							dirInfo,
							(nextSeed, isCircular) =>
								pipe(
									isCircular
										? new MError.General({
												message: `Circularity detected in ${moduleTag}readDirRecursivelyWithFilters from directory: ${dirInfo.absolutePath}`
										  })
										: nextSeed.stat.type === 'Directory'
										  ? Effect.map(
													readDirectoryWithInfoAndFilters(
														new readDirectoryWithInfoAndFiltersParams({
															dirPath: nextSeed.absolutePath,
															options: { recursive: false, resolveSymLinks },
															filesInclude,
															dirsExclude,
															concurrencyOptions,
															memoize
														})
													),
													(files) => Chunk.partition(files, (pathInfo) => pathInfo.stat.type === 'Directory')
										    )
										  : new MError.General({
													message: `${moduleTag}readDirRecursivelyWithFilters was called with a path that is not a directory: ${dirInfo.absolutePath}`
										    })
								),
							memoize,
							undefined,
							concurrencyOptions
						)
					),
					Effect.map(Tree.reduce(Chunk.empty<PathInfo.Type>(), (acc, a) => Chunk.appendAll(acc, a)))
				),

			readDirectoriesUpwardWhile: ({
				dirPath,
				isTargetDir,
				filesInclude = () => true,
				resolveSymLinks = false,
				concurrencyOptions,
				memoize = false
			}) =>
				pipe(
					Stream.iterate(dirPath, (currentDirPath) => ioPath.join(currentDirPath, '..')),
					Stream.takeUntil((currentDirPath) => currentDirPath === ioOs.homeDir || currentDirPath === ioOs.rootDir),
					Stream.mapEffect((currentDirPath) =>
						pipe(
							readDirectoryWithInfoAndFilters(
								new readDirectoryWithInfoAndFiltersParams({
									dirPath: currentDirPath,
									options: { recursive: false, resolveSymLinks },
									filesInclude,
									dirsExclude: () => true,
									concurrencyOptions,
									memoize
								})
							),
							Effect.flatMap((files) => isTargetDir(files)),
							Effect.map((isTargetDir) => Tuple.make(currentDirPath, isTargetDir))
						)
					),
					Stream.takeUntil(([_, isTargetDir]) => isTargetDir),
					Stream.runLast,
					Effect.map(
						Option.flatMap(([lastDirPath, isTargetDir]) => (isTargetDir ? Option.some(lastDirPath) : Option.none()))
					)
				),
			watch: ({ filePath, options }) =>
				Stream.fromAsyncIterable(
					NodeFsPromises.watch(filePath, options),
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
