import { IoOs, IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import * as PlatformFs from '@effect/platform/FileSystem';
import { MEffect, MError, Tree } from '@mjljm/effect-lib';
import {
	Cause,
	Context,
	Effect,
	Either,
	Layer,
	Option,
	Predicate,
	ReadonlyArray,
	Scope,
	Sink,
	Stream,
	Tuple,
	pipe
} from 'effect';

import { Concurrency } from 'effect/Types';
import * as nodeFs from 'node:fs';

const moduleTag = '@mjljm/node-effect-lib/IoFs/';
const PlatformNodeFsService = PlatformNodeFs.FileSystem;

export interface ServiceInterface {
	/**
	 * Get information about a path. If resolveSymLinks=true, the info returned is not that of `path` but that of the fully resolved version of `path`
	 */
	readonly stat: (
		path: IoPath.Path,
		resolveSymLinks?: boolean
	) => Effect.Effect<never, PlatformError, PlatformNodeFs.File.Info>;

	/**
	 * Reads the contents of a file. See default value for encoding in NodeJs readfile doc.
	 */
	readonly readFileString: (
		path: IoPath.FilePath,
		encoding?: string
	) => Effect.Effect<never, PlatformError, string>;

	/**
	 * Lists the contents of a directory. Returns the filenames and the stats of those filenames. If resolveSymLinks=true, the info returned is not that of filename but that of the fully resolved version of filename
	 */
	readonly readDirectory: (
		path: IoPath.FolderPath,
		options?: {
			readonly resolveSymLinks?: boolean;
			readonly concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
		}
	) => Effect.Effect<never, PlatformError, ReadonlyArray<[name: string, stat: PlatformNodeFs.File.Info]>>;

	/**
	 * Reads the contents of the directory at path and all directories (including symlinks) below except these excluded by dirsExclude. If useCachedReadDirectory is set, it's preferable to use a RealAbsoluteFolderPath (see cachedReadDirectory)
	 */
	readonly glob: <P extends IoPath.PathPositionType>(params: {
		readonly path: IoPath.GenericPath<IoPath.PathLinkType, P, 'folder'>;
		readonly dirsExclude: Predicate.Predicate<string>;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
	}) => Effect.Effect<
		never,
		PlatformError | MError.General,
		ReadonlyArray<[path: IoPath.GenericPath<'unknown', P, 'file'>, stat: PlatformNodeFs.File.Info]>
	>;

	/**
	 * Reads the directory tree upward starting at path until either stopPredicate returns true or the user's home directory is reached.
	 * @param path The path to the directory where to start the search from
	 * @param isTargetDir Function that receives all files of the currently read directory and returns an effectful false to stop the search, or an effectful true to continue
	 * @returns the matching path if found. Otherwise, returns Cause.NoSuchElementException otherwise
	 */
	readonly readDirectoriesUpwardWhile: <
		R,
		E,
		L extends IoPath.PathLinkType,
		P extends IoPath.PathPositionType
	>(params: {
		readonly path: IoPath.GenericPath<L, P, 'folder'>;
		readonly isTargetDir: MEffect.Predicate<
			[
				currentPath: IoPath.GenericPath<L extends 'real' ? 'real' : 'unknown', P, 'folder'>,
				contents: ReadonlyArray<[name: string, stat: PlatformNodeFs.File.Info]>
			],
			R,
			E
		>;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
	}) => Effect.Effect<
		R,
		PlatformError | E | Cause.NoSuchElementException,
		IoPath.GenericPath<L extends 'real' ? 'real' : 'unknown', P, 'folder'>
	>;

	/**
	 * Port of Node js fs watch function - Only the function that returns FileChangeInfo<string>'s has been ported. If the persistent option is set (default is not set), the program will not exit if the watch function is the last thing going on.
	 * @param filePath The file or directory to watch
	 * @param options See Node js's WatchOptions.
	 * @returns
	 */
	readonly watch: (
		path: IoPath.Path,
		options?: { readonly recursive?: boolean; readonly encoding?: BufferEncoding }
	) => Stream.Stream<never, MError.FunctionPort, [eventType: string, filename: string]>;

	/**
	 * Checks if a path can be accessed. You can optionally specify the level of access to check for.
	 */
	readonly access: (
		path: IoPath.Path,
		options?: PlatformFs.AccessFileOptions
	) => Effect.Effect<never, PlatformError, void>;

	/**
	 * Copy a directory from `fromPath` to `toPath`.
	 *
	 * Equivalent to `cp -r`.
	 */
	readonly copy: (
		fromPath: IoPath.FolderPath,
		toPath: IoPath.FolderPath,
		options?: PlatformFs.CopyOptions
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Copy a file from `fromPath` to `toPath`.
	 */
	readonly copyFile: (
		fromPath: IoPath.FolderPath,
		toPath: IoPath.Path
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Change the permissions of a path.
	 */
	readonly chmod: (path: IoPath.Path, mode: number) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Change the owner and group of a path.
	 */
	readonly chown: (path: IoPath.Path, uid: number, gid: number) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Check if a path exists.
	 */
	readonly exists: (path: IoPath.Path) => Effect.Effect<never, PlatformError, boolean>;
	/**
	 * Create a hard link from `fromPath` to `toPath`.
	 */
	readonly link: (fromPath: IoPath.FilePath, toPath: IoPath.FilePath) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Create a directory at `path`. You can optionally specify the mode and
	 * whether to recursively create nested directories.
	 */
	readonly makeDirectory: (
		path: IoPath.FolderPath,
		options?: PlatformNodeFs.MakeDirectoryOptions
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Create a temporary directory.
	 *
	 * By default the directory will be created inside the system's default
	 * temporary directory, but you can specify a different location by setting
	 * the `directory` option.
	 *
	 * You can also specify a prefix for the directory name by setting the
	 * `prefix` option.
	 */
	readonly makeTempDirectory: (
		options?: PlatformNodeFs.MakeTempDirectoryOptions
	) => Effect.Effect<never, PlatformError, string>;
	/**
	 * Create a temporary directory inside a scope.
	 *
	 * Functionally equivalent to `makeTempDirectory`, but the directory will be
	 * automatically deleted when the scope is closed.
	 */
	readonly makeTempDirectoryScoped: (
		options?: PlatformNodeFs.MakeTempDirectoryOptions
	) => Effect.Effect<Scope.Scope, PlatformError, string>;
	/**
	 * Create a temporary file.
	 * The directory creation is functionally equivalent to `makeTempDirectory`.
	 * The file name will be a randomly generated string.
	 */
	readonly makeTempFile: (
		options?: PlatformNodeFs.MakeTempFileOptions
	) => Effect.Effect<never, PlatformError, string>;
	/**
	 * Create a temporary file inside a scope.
	 *
	 * Functionally equivalent to `makeTempFile`, but the file will be
	 * automatically deleted when the scope is closed.
	 */
	readonly makeTempFileScoped: (
		options?: PlatformNodeFs.MakeTempFileOptions
	) => Effect.Effect<Scope.Scope, PlatformError, string>;
	/**
	 * Open a file at `path` with the specified `options`.
	 *
	 * The file handle will be automatically closed when the scope is closed.
	 */
	readonly open: (
		path: IoPath.FilePath,
		options?: PlatformNodeFs.OpenFileOptions
	) => Effect.Effect<Scope.Scope, PlatformError, PlatformNodeFs.File>;
	/**
	 * Read the contents of a file.
	 */
	readonly readFile: (path: IoPath.FilePath) => Effect.Effect<never, PlatformError, Uint8Array>;
	/**
	 * Read the destination of a symbolic link.
	 */
	readonly readLink: (path: IoPath.SymbolicPath) => Effect.Effect<never, PlatformError, string>;
	/**
	 * Remove a file or directory.
	 *
	 * By setting the `recursive` option to `true`, you can recursively remove
	 * nested directories.
	 */
	readonly remove: (
		path: IoPath.Path,
		options?: PlatformNodeFs.RemoveOptions
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Rename a file or directory.
	 */
	readonly rename: <T extends IoPath.PathTargetType>(
		oldPath: IoPath.GenericPath<IoPath.PathLinkType, IoPath.PathPositionType, T>,
		newPath: IoPath.GenericPath<IoPath.PathLinkType, IoPath.PathPositionType, T>
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Create a writable `Sink` for the specified `path`.
	 */
	readonly sink: (
		path: IoPath.FilePath,
		options?: PlatformNodeFs.SinkOptions
	) => Sink.Sink<never, PlatformError, Uint8Array, never, void>;
	/**
	 * Create a readable `Stream` for the specified `path`.
	 *
	 * Changing the `bufferSize` option will change the internal buffer size of
	 * the stream. It defaults to `4`.
	 *
	 * The `chunkSize` option will change the size of the chunks emitted by the
	 * stream. It defaults to 64kb.
	 *
	 * Changing `offset` and `bytesToRead` will change the offset and the number
	 * of bytes to read from the file.
	 */
	readonly stream: (
		path: IoPath.FilePath,
		options?: PlatformNodeFs.StreamOptions
	) => Stream.Stream<never, PlatformError, Uint8Array>;
	/**
	 * Create a symbolic link from `fromPath` to `toPath`.
	 */
	readonly symlink: <T extends IoPath.PathTargetType>(
		fromPath: IoPath.GenericPath<IoPath.PathLinkType, IoPath.PathPositionType, T>,
		toPath: IoPath.GenericPath<IoPath.PathLinkType, IoPath.PathPositionType, T>
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Truncate a file to a specified length. If the `length` is not specified,
	 * the file will be truncated to length `0`.
	 */
	readonly truncate: (
		path: IoPath.FilePath,
		length?: PlatformFs.SizeInput
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Change the file system timestamps of path.
	 */
	readonly utimes: (
		path: IoPath.Path,
		atime: Date | number,
		mtime: Date | number
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Write data to a file at `path`.
	 */
	readonly writeFile: (
		path: IoPath.FilePath,
		data: Uint8Array,
		options?: PlatformNodeFs.WriteFileOptions
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Write a string to a file at `path`.
	 */
	readonly writeFileString: (
		path: IoPath.FilePath,
		data: string,
		options?: PlatformFs.WriteFileStringOptions
	) => Effect.Effect<never, PlatformError, void>;
}

export const Service = Context.Tag<ServiceInterface>(Symbol.for(moduleTag + 'Service'));

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const fs = yield* _(PlatformNodeFsService);

		const ioPath = yield* _(IoPath.Service);
		const ioOs = yield* _(IoOs.Service);

		const stat: ServiceInterface['stat'] = (path, resolveSymLinks = false) =>
			Effect.gen(function* (_) {
				const finalPath =
					IoPath.isNotRealPath(path) && resolveSymLinks === true
						? yield* _(ioPath.toRealAbsolutePath(path))
						: path;
				return yield* _(finalPath.value, fs.stat);
			});

		const readFileString: ServiceInterface['readFileString'] = (path, encoding) =>
			fs.readFileString(path.value, encoding);

		const readDirectory: ServiceInterface['readDirectory'] = (path, options = { resolveSymLinks: false }) =>
			Effect.gen(function* (_) {
				const subPaths = yield* _(fs.readDirectory(path.value));
				const stats = yield* _(
					subPaths,
					ReadonlyArray.map((subPath) =>
						stat(
							ioPath.resolve({
								previousSegments: ReadonlyArray.of(path),
								lastSegment: IoPath.unsafeRelativeFilePath(subPath)
							}),
							options.resolveSymLinks
						)
					),
					Effect.allWith(options.concurrencyOptions)
				);

				return ReadonlyArray.zip(subPaths, stats);
			});

		const glob: ServiceInterface['glob'] = ({ concurrencyOptions, dirsExclude, path }) =>
			pipe(
				MEffect.unfoldTree({
					seed: path,
					unfoldfunction: (nextSeed, isCircular) =>
						Effect.gen(function* (_) {
							if (isCircular)
								yield* _(
									new MError.General({
										message: `Circularity detected from directory:'${path.value}' in function 'glob' of module '${moduleTag}'. Path '${nextSeed.value}' was met twice.`
									})
								);
							const dirContents = yield* _(readDirectory(nextSeed, { resolveSymLinks: true, concurrencyOptions }));
							return pipe(
								dirContents,
								ReadonlyArray.partition(([_, stat]) => stat.type === 'Directory'),
								([files, folders]) =>
									Tuple.make(
										ReadonlyArray.map(files, ([name, stat]) =>
											Tuple.make(
												ioPath.join({
													firstSegment: nextSeed,
													lastSegment: IoPath.unsafeGenericPath({
														value: name,
														pathLink: 'unknown',
														pathPosition: 'relative',
														pathTarget: 'file'
													})
												}),
												stat
											)
										),
										ReadonlyArray.filterMap(folders, ([name]) =>
											pipe(
												name,
												Option.liftPredicate((name) => !dirsExclude(name)),
												Option.map((name) =>
													ioPath.join({
														firstSegment: nextSeed,
														lastSegment: IoPath.unsafeGenericPath({
															value: name,
															pathLink: 'unknown',
															pathPosition: 'relative',
															pathTarget: 'folder'
														})
													})
												)
											)
										)
									)
							);
						}),
					memoize: false,
					concurrencyOptions
				}),
				Effect.map(Tree.reduce(ReadonlyArray.empty(), (acc, a) => ReadonlyArray.appendAll(acc, a)))
			);

		const readDirectoriesUpwardWhile: ServiceInterface['readDirectoriesUpwardWhile'] = ({
			concurrencyOptions,
			isTargetDir,
			path
		}) =>
			pipe(
				Stream.iterate(path as IoPath.FolderPath, (currentPath) => ioPath.dirname(currentPath)),
				Stream.takeUntil(({ value }) => value === ioOs.homeDir || value === ioOs.rootDir),
				Stream.mapEffect((currentpath) =>
					pipe(
						// Set resolveSymLinks to get more accurate info about the contained paths and share the cache with glob
						readDirectory(currentpath, { resolveSymLinks: true, concurrencyOptions }),
						Effect.flatMap((files) => isTargetDir(Tuple.make(currentpath as never, files))),
						Effect.map((isTargetDir) => Tuple.make(currentpath, isTargetDir))
					)
				),
				Stream.takeUntil(([_, isTargetDir]) => isTargetDir),
				Stream.runLast,
				Effect.flatMap(Option.flatMap(Option.liftPredicate(([_, isTargetDir]) => isTargetDir))),
				Effect.map(([path]) => path as never)
			);

		const watch: ServiceInterface['watch'] = (path, options) =>
			Stream.asyncInterrupt<never, MError.FunctionPort, [eventType: string, filename: string]>((emit) => {
				const watcher = nodeFs.watch(path.value, { ...options, persistent: false });

				watcher.on('change', (eventType, filename) => void emit.single([eventType, filename as string]));
				watcher.on(
					'error',
					(error) =>
						void emit.die(
							new MError.FunctionPort({
								originalError: error,
								originalFunctionName: 'fs.watch',
								moduleName: moduleTag,
								libraryName: 'node-effect-lib'
							})
						)
				);
				watcher.on('close', () => void emit.end());

				return Either.left(Effect.succeed(watcher.close()));
			});

		return {
			stat,
			readFileString,
			readDirectory,
			glob,
			readDirectoriesUpwardWhile,
			watch,
			access: (path, options) => fs.access(path.value, options),
			copy: (fromPath, toPath, options) => fs.copy(fromPath.value, toPath.value, options),
			copyFile: (fromPath, toPath) => fs.copyFile(fromPath.value, toPath.value),
			chmod: (path, mode) => fs.chmod(path.value, mode),
			chown: (path, uid, gid) => fs.chown(path.value, uid, gid),
			exists: (path) => fs.exists(path.value),
			link: (fromPath, toPath) => fs.link(fromPath.value, toPath.value),
			makeDirectory: (path, options) => fs.makeDirectory(path.value, options),
			makeTempDirectory: (options) => fs.makeTempDirectory(options),
			makeTempDirectoryScoped: (options) => fs.makeTempDirectoryScoped(options),
			makeTempFile: (options) => fs.makeTempFile(options),
			makeTempFileScoped: (options) => fs.makeTempFileScoped(options),
			open: (path, options) => fs.open(path.value, options),
			readFile: (path) => fs.readFile(path.value),
			readLink: (path) => fs.readLink(path.value),
			remove: (path, options) => fs.remove(path.value, options),
			rename: (oldPath, newPath) => fs.rename(oldPath.value, newPath.value),
			sink: (path, options) => fs.sink(path.value, options),
			stream: (path, options?) => fs.stream(path.value, options),
			symlink: (fromPath, toPath) => fs.symlink(fromPath.value, toPath.value),
			truncate: (path, length) => fs.truncate(path.value, length),
			utimes: (path, atime, mtime) => fs.utimes(path.value, atime, mtime),
			writeFile: (path, data, options) => fs.writeFile(path.value, data, options),
			writeFileString: (path, data, options) => fs.writeFileString(path.value, data, options)
		};
	})
);
