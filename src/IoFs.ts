import { IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import * as PlatformFs from '@effect/platform/FileSystem';
import { MEffect, MError, Tree } from '@mjljm/effect-lib';
import { TypedPath } from '@mjljm/js-lib';
import {
	Cause,
	Context,
	Effect,
	Either,
	Equal,
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
	 * Get information about a path. Always follows symbolic links
	 */
	readonly stat: (path: TypedPath.ResolvablePath) => Effect.Effect<never, PlatformError, PlatformNodeFs.File.Info>;

	/**
	 * Get information about a path. Does not follow symbolic links
	 */
	readonly lstat: (
		path: TypedPath.ResolvablePath
	) => Effect.Effect<never, PlatformError, PlatformNodeFs.File.Info>;

	/**
	 * Reads the contents of a file. See default value for encoding in NodeJs readfile doc.
	 */
	readonly readFileString: (
		path: TypedPath.ResolvableFilePath,
		encoding?: string
	) => Effect.Effect<never, PlatformError, string>;

	/**
	 * Lists the contents of a directory.
	 */
	readonly readDirectory: (
		path: TypedPath.ResolvableFolderPath
	) => Effect.Effect<never, PlatformError, ReadonlyArray<TypedPath.PathFragment>>;

	/**
	 * Same as readDirectory but also returns files' stats
	 */
	readonly readDirectoryWithStats: (
		path: TypedPath.ResolvableFolderPath,
		concurrencyOptions?: { readonly concurrency?: Concurrency }
	) => Effect.Effect<
		never,
		PlatformError,
		ReadonlyArray<[fragment: TypedPath.PathFragment, stat: PlatformNodeFs.File.Info]>
	>;

	/**
	 * Reads the contents of the directory at path and all directories (including symlinks) below except these excluded by dirsExclude. If useCachedReadDirectory is set, it's preferable to use a RealAbsoluteFolderPath (see cachedReadDirectory)
	 */
	readonly glob: <P extends Exclude<TypedPath.PathPositionType, 'fragment'>>(params: {
		readonly path: TypedPath.TypedPath<TypedPath.PathLinkType, P, 'folder'>;
		readonly dirsExclude: Predicate.Predicate<TypedPath.FolderPathFragment>;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency };
	}) => Effect.Effect<
		never,
		PlatformError | MError.General,
		ReadonlyArray<[path: TypedPath.TypedPath<TypedPath.PathLinkType, P, 'file'>, stat: PlatformNodeFs.File.Info]>
	>;

	/**
	 * Reads the directory tree upward starting at path until either stopPredicate returns true or the user's home directory is reached.
	 * @param path The path to the directory where to start the search from. Needs to be absolute so comparison to the user's home directory makes sense.
	 * @param isTargetDir Function that returns an effectful false to stop the search, or an effectful true to continue
	 * @returns the matching path if found. Returns Cause.NoSuchElementException otherwise
	 */
	readonly readDirectoriesUpwardWhile: <R, E, L extends TypedPath.PathLinkType>(params: {
		readonly path: TypedPath.TypedPath<L, 'absolute', 'folder'>;
		readonly isTargetDir: MEffect.Predicate<
			[
				currentPath: TypedPath.TypedPath<
					[L] extends ['real'] ? 'real' : TypedPath.PathLinkType,
					'absolute',
					'folder'
				>,
				contents: ReadonlyArray<[name: TypedPath.PathFragment, stat: PlatformNodeFs.File.Info]>
			],
			R,
			E
		>;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency };
	}) => Effect.Effect<
		R,
		PlatformError | E | Cause.NoSuchElementException,
		TypedPath.TypedPath<[L] extends ['real'] ? 'real' : TypedPath.PathLinkType, 'absolute', 'folder'>
	>;

	/**
	 * Port of Node js fs watch function - Only the function that returns FileChangeInfo<string>'s has been ported. If the persistent option is set (default is not set), the program will not exit if the watch function is the last thing going on.
	 * @param filePath The file or directory to watch
	 * @param options See Node js's WatchOptions.
	 * @returns
	 */
	readonly watch: (
		path: TypedPath.ResolvablePath,
		options?: { readonly recursive?: boolean; readonly encoding?: BufferEncoding }
	) => Stream.Stream<never, MError.FunctionPort, [eventType: string, filename: string]>;

	/**
	 * Checks if a path can be accessed. You can optionally specify the level of access to check for.
	 */
	readonly access: (
		path: TypedPath.ResolvablePath,
		options?: PlatformFs.AccessFileOptions
	) => Effect.Effect<never, PlatformError, void>;

	/**
	 * Copy a directory from `fromPath` to `toPath`.
	 *
	 * Equivalent to `cp -r`.
	 */
	readonly copy: (
		fromPath: TypedPath.ResolvableFolderPath,
		toPath: TypedPath.ResolvableFolderPath,
		options?: PlatformFs.CopyOptions
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Copy a file from `fromPath` to `toPath`.
	 */
	readonly copyFile: (
		fromPath: TypedPath.ResolvableFolderPath,
		toPath: TypedPath.ResolvablePath
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Change the permissions of a path.
	 */
	readonly chmod: (path: TypedPath.ResolvablePath, mode: number) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Change the owner and group of a path.
	 */
	readonly chown: (
		path: TypedPath.ResolvablePath,
		uid: number,
		gid: number
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Check if a path exists.
	 */
	readonly exists: (path: TypedPath.ResolvablePath) => Effect.Effect<never, PlatformError, boolean>;
	/**
	 * Create a hard link from `fromPath` to `toPath`.
	 */
	readonly link: (
		fromPath: TypedPath.ResolvableFilePath,
		toPath: TypedPath.ResolvableFilePath
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Create a directory at `path`. You can optionally specify the mode and
	 * whether to recursively create nested directories.
	 */
	readonly makeDirectory: (
		path: TypedPath.ResolvableFolderPath,
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
		path: TypedPath.ResolvableFilePath,
		options?: PlatformNodeFs.OpenFileOptions
	) => Effect.Effect<Scope.Scope, PlatformError, PlatformNodeFs.File>;
	/**
	 * Read the contents of a file.
	 */
	readonly readFile: (path: TypedPath.ResolvableFilePath) => Effect.Effect<never, PlatformError, Uint8Array>;
	/**
	 * Read the destination of a symbolic link.
	 */
	readonly readLink: (path: TypedPath.ResolvableSymbolicPath) => Effect.Effect<never, PlatformError, string>;
	/**
	 * Remove a file or directory.
	 *
	 * By setting the `recursive` option to `true`, you can recursively remove
	 * nested directories.
	 */
	readonly remove: (
		path: TypedPath.ResolvablePath,
		options?: PlatformNodeFs.RemoveOptions
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Rename a file or directory.
	 */
	readonly rename: <T extends TypedPath.PathTargetType>(
		oldPath: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, T>,
		newPath: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, T>
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Create a writable `Sink` for the specified `path`.
	 */
	readonly sink: (
		path: TypedPath.ResolvableFilePath,
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
		path: TypedPath.ResolvableFilePath,
		options?: PlatformNodeFs.StreamOptions
	) => Stream.Stream<never, PlatformError, Uint8Array>;
	/**
	 * Create a symbolic link from `fromPath` to `toPath`.
	 */
	readonly symlink: <T extends TypedPath.PathTargetType>(
		fromPath: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, T>,
		toPath: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, T>
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Truncate a file to a specified length. If the `length` is not specified,
	 * the file will be truncated to length `0`.
	 */
	readonly truncate: (
		path: TypedPath.ResolvableFilePath,
		length?: PlatformFs.SizeInput
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Change the file system timestamps of path.
	 */
	readonly utimes: (
		path: TypedPath.ResolvablePath,
		atime: Date | number,
		mtime: Date | number
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Write data to a file at `path`.
	 */
	readonly writeFile: (
		path: TypedPath.ResolvableFilePath,
		data: Uint8Array,
		options?: PlatformNodeFs.WriteFileOptions
	) => Effect.Effect<never, PlatformError, void>;
	/**
	 * Write a string to a file at `path`.
	 */
	readonly writeFileString: (
		path: TypedPath.ResolvableFilePath,
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

		const stat: ServiceInterface['stat'] = (path) =>
			pipe(path, ioPath.toRealAbsolutePath, Effect.flatMap(fs.stat));

		const lstat: ServiceInterface['lstat'] = fs.stat;

		const readFileString: ServiceInterface['readFileString'] = fs.readFileString;

		const readDirectory: ServiceInterface['readDirectory'] = (path) => fs.readDirectory(path) as never;

		const readDirectoryWithStats: ServiceInterface['readDirectoryWithStats'] = (path, concurrencyOptions) =>
			Effect.flatMap(readDirectory(path), (fragments) =>
				pipe(
					fragments,
					ReadonlyArray.map((fragment) =>
						pipe(
							stat(ioPath.resolve(path, fragment)),
							Effect.map((info) => Tuple.make(fragment, info))
						)
					),
					Effect.allWith(concurrencyOptions)
				)
			);

		const glob: ServiceInterface['glob'] = ({ concurrencyOptions, dirsExclude, path }) =>
			pipe(
				MEffect.unfoldTree({
					seed: path,
					unfoldfunction: (nextSeed, isCircular) =>
						Effect.gen(function* (_) {
							if (isCircular)
								yield* _(
									new MError.General({
										message: `Circularity detected from directory:'${path}' in function 'glob' of module '${moduleTag}'. Path '${nextSeed}' was met twice.`
									})
								);
							const dirContentsWithInfo = yield* _(readDirectoryWithStats(nextSeed));
							return pipe(
								dirContentsWithInfo,
								ReadonlyArray.partition(([_, stat]) => stat.type === 'Directory'),
								([files, folders]) =>
									Tuple.make(
										ReadonlyArray.map(files, ([name, stat]) =>
											Tuple.make(ioPath.join(nextSeed, name as TypedPath.FilePathFragment), stat)
										),
										ReadonlyArray.filterMap(folders, ([name]) =>
											pipe(
												name as TypedPath.FolderPathFragment,
												Option.liftPredicate((name) => !dirsExclude(name)),
												Option.map((name) => ioPath.join(nextSeed, name))
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
				Stream.iterate(path as TypedPath.AbsoluteFolderPath, (currentPath) => ioPath.dirname(currentPath)),
				Stream.takeUntil((path) => Equal.equals(path, ioPath.homeDir) || Equal.equals(path, ioPath.rootDir)),
				Stream.mapEffect((currentPath) =>
					pipe(
						readDirectoryWithStats(currentPath, concurrencyOptions),
						Effect.flatMap((filesWithStats) => isTargetDir(Tuple.make(currentPath as never, filesWithStats))),
						Effect.map((isTargetDir) => Tuple.make(currentPath, isTargetDir))
					)
				),
				Stream.takeUntil(([_, isTargetDir]) => isTargetDir),
				Stream.runLast,
				Effect.flatMap(Option.flatMap(Option.liftPredicate(([_, isTargetDir]) => isTargetDir))),
				Effect.map(([path]) => path as never)
			);

		const watch: ServiceInterface['watch'] = (path, options) =>
			Stream.asyncInterrupt<never, MError.FunctionPort, [eventType: string, filename: string]>((emit) => {
				const watcher = nodeFs.watch(path, { ...options, persistent: false });

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
			lstat,
			readFileString,
			readDirectory,
			readDirectoryWithStats,
			glob,
			readDirectoriesUpwardWhile,
			watch,
			access: (path, options) => fs.access(path, options),
			copy: (fromPath, toPath, options) => fs.copy(fromPath, toPath, options),
			copyFile: (fromPath, toPath) => fs.copyFile(fromPath, toPath),
			chmod: (path, mode) => fs.chmod(path, mode),
			chown: (path, uid, gid) => fs.chown(path, uid, gid),
			exists: (path) => fs.exists(path),
			link: (fromPath, toPath) => fs.link(fromPath, toPath),
			makeDirectory: (path, options) => fs.makeDirectory(path, options),
			makeTempDirectory: (options) => fs.makeTempDirectory(options),
			makeTempDirectoryScoped: (options) => fs.makeTempDirectoryScoped(options),
			makeTempFile: (options) => fs.makeTempFile(options),
			makeTempFileScoped: (options) => fs.makeTempFileScoped(options),
			open: (path, options) => fs.open(path, options),
			readFile: (path) => fs.readFile(path),
			readLink: (path) => fs.readLink(path),
			remove: (path, options) => fs.remove(path, options),
			rename: (oldPath, newPath) => fs.rename(oldPath, newPath),
			sink: (path, options) => fs.sink(path, options),
			stream: (path, options?) => fs.stream(path, options),
			symlink: (fromPath, toPath) => fs.symlink(fromPath, toPath),
			truncate: (path, length) => fs.truncate(path, length),
			utimes: (path, atime, mtime) => fs.utimes(path, atime, mtime),
			writeFile: (path, data, options) => fs.writeFile(path, data, options),
			writeFileString: (path, data, options) => fs.writeFileString(path, data, options)
		};
	})
);
