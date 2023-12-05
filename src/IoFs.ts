import { IoOs, IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import * as FileSystem from '@effect/platform/FileSystem';
import { MError, MFunction, MPredicate, MStream } from '@mjljm/effect-lib';
import {
	Chunk,
	Context,
	Effect,
	Either,
	Equivalence,
	Layer,
	Predicate,
	ReadonlyArray,
	Stream,
	pipe
} from 'effect';
import { Concurrency } from 'effect/Types';
import * as NodeFs from 'node:fs';
import * as NodeFsPromises from 'node:fs/promises';

const PlatformNodeFsTag = PlatformNodeFs.FileSystem;
type PlatformNodeFsInterface = Context.Tag.Service<typeof PlatformNodeFsTag>;

export interface FileInfo {
	readonly fullName: string;
	readonly baseName: string;
	readonly dirName: string;
	readonly stat: FileSystem.File.Info;
}
export const FileInfo = MFunction.makeReadonly<FileInfo>;

interface ReadFileStringParams {
	readonly path: string;
	readonly encoding?: string | undefined;
}
const ReadFileStringParamsEq = Equivalence.make<ReadFileStringParams>(
	(self, that) => self.path === that.path && self.encoding === that.encoding
);

interface ReadDirectoryWithInfoParams {
	readonly path: string;
	readonly options?: FileSystem.ReadDirectoryOptions | undefined;
	readonly concurrencyOptions?:
		| { readonly concurrency?: Concurrency | undefined }
		| undefined;
}
const ReadDirectoryWithInfoParamsEq =
	Equivalence.make<ReadDirectoryWithInfoParams>(
		(self, that) =>
			self.path === that.path &&
			self.options === that.options &&
			self.options?.recursive === that.options?.recursive
	);

interface readDirectoryWithInfoAndFiltersParams {
	path: string;
	options?: FileSystem.ReadDirectoryOptions | undefined;
	filesInclude: Predicate.Predicate<string>;
	dirsExclude: Predicate.Predicate<string>;
	concurrencyOptions?:
		| { readonly concurrency?: Concurrency | undefined }
		| undefined;
}

export interface ServiceInterface
	extends Omit<PlatformNodeFsInterface, 'readFileString'> {
	/**
	 * Same as readFileString but the result can be memoized
	 */
	readFileString: (
		params: ReadFileStringParams & { memoized?: boolean | undefined }
	) => Effect.Effect<never, PlatformError, string>;

	/**
	 * List the contents of a directory. You can recursively list the contents of nested directories by setting the recursive option. Can be memoized.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfo: (
		params: ReadDirectoryWithInfoParams & {
			memoized?: boolean | undefined;
		}
	) => Effect.Effect<never, PlatformError, Chunk.Chunk<Readonly<FileInfo>>>;

	/**
	 * List the contents of a directory.
	 * You can recursively list the contents of nested directories by setting the recursive option. Unlike readDirRecursivelyWithFilters, dirsExclude is applied after reading the directories, i.e. it is never called if you sey the recursive option.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfoAndFilters: (
		params: readDirectoryWithInfoAndFiltersParams & {
			memoized?: boolean | undefined;
		}
	) => Effect.Effect<never, PlatformError, Chunk.Chunk<Readonly<FileInfo>>>;

	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than readDirectoryWithInfoAndFilters that reads all subdirectories and filters afterwards.
	 * @param path The path of the directory to read
	 * @param filesInclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @param dirsExclude A predicate function that receives a directory name and returns false to keep it, true to filter it out.
	 * @returns An array containing the fileInfo of each found file
	 */
	readDirRecursivelyWithFilters: (params: {
		startPath: FileInfo;
		filesInclude: Predicate.Predicate<string>;
		dirsExclude: Predicate.Predicate<string>;
		concurrencyOptions?:
			| { readonly concurrency?: Concurrency | undefined }
			| undefined;
		memoized?: boolean;
	}) => Effect.Effect<never, PlatformError, Chunk.Chunk<Readonly<FileInfo>>>;

	/**
	 * Reads the directory tree upward starting at path until either stopPredicate returns true or the user's home directory is reached.
	 * @param path The start path (must be a directory path, not a file path)
	 * @param condition Function that receives all files (after filtering) of the currently read directory and returns an effectful false to stop the search, or an effectful true to continue
	 * @param filesInclude A predicate function that receives a filename and returns true to keep it, false to filter it out.
	 * @returns the matching path in an Option.some if any. Option.none otherwise.
	 */
	readDirectoriesUpwardWhile: <R, E>(params: {
		path: string;
		isTargetDir: MPredicate.PredicateEffect<Chunk.Chunk<FileInfo>, R, E>;
		filesInclude: Predicate.Predicate<string>;
		concurrencyOptions?:
			| { readonly concurrency?: Concurrency | undefined }
			| undefined;
		memoized?: boolean | undefined;
	}) => Effect.Effect<R, PlatformError | E, Chunk.Chunk<FileInfo>>;

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
	Symbol.for('#internal/IoFs.ts')
);

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const platformFs = yield* _(PlatformNodeFsTag);
		const ioPath = yield* _(IoPath.Service);
		const ioOs = yield* _(IoOs.Service);

		const cachedReadFileString = yield* _(
			Effect.cachedFunction(
				({ path, encoding }: ReadFileStringParams) =>
					platformFs.readFileString(path, encoding),
				ReadFileStringParamsEq
			)
		);

		const readFileString: ServiceInterface['readFileString'] = (params) =>
			params.memoized ?? false
				? cachedReadFileString(params)
				: platformFs.readFileString(params.path, params.encoding);

		const normalReadDirectoryWithInfo = ({
			path,
			options,
			concurrencyOptions
		}: ReadDirectoryWithInfoParams) =>
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
					Effect.allWith(concurrencyOptions),
					Effect.map(Chunk.unsafeFromArray)
				)
			);
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
			Effect.cachedFunction(
				normalReadDirectoryWithInfo,
				ReadDirectoryWithInfoParamsEq
			)
		);

		const readDirectoryWithInfo: ServiceInterface['readDirectoryWithInfo'] = (
			params
		) =>
			params.memoized
				? cachedReadDirectoryWithInfo(params)
				: normalReadDirectoryWithInfo(params);

		const readDirectoryWithInfoAndFilters: ServiceInterface['readDirectoryWithInfoAndFilters'] =
			({
				path,
				options,
				filesInclude = () => true,
				dirsExclude = () => false,
				concurrencyOptions,
				memoized
			}) =>
				pipe(
					readDirectoryWithInfo({
						path,
						options,
						concurrencyOptions,
						memoized
					}),
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
			readDirRecursivelyWithFilters: ({
				startPath,
				filesInclude = () => true,
				dirsExclude = () => false,
				concurrencyOptions,
				memoized
			}) =>
				pipe(
					MStream.fromLeavesOfGraphWithOrigin({
						origin: startPath,
						getChildren: (path) =>
							path.stat.type === 'Directory'
								? Either.right(
										readDirectoryWithInfoAndFilters({
											path: path.fullName,
											options: { recursive: false },
											filesInclude,
											dirsExclude,
											concurrencyOptions,
											memoized
										})
								  )
								: Either.left(Effect.succeed(path)),
						concurrencyOptions
					}),
					Stream.runCollect
				),
			readDirectoriesUpwardWhile: ({
				path,
				isTargetDir,
				filesInclude = () => true,
				concurrencyOptions,
				memoized
			}) =>
				pipe(
					Stream.iterate(path, (path) => ioPath.join(path, '..')),
					Stream.takeUntil(
						(path) => path === ioOs.homeDir || path === ioOs.rootDir
					),
					Stream.mapEffect((path) =>
						readDirectoryWithInfoAndFilters({
							path,
							options: { recursive: false },
							filesInclude,
							dirsExclude: () => true,
							concurrencyOptions,
							memoized
						})
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
