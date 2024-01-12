/**
 * Use Typescript's type-checking system to make system paths safer!
 *
 * Why ?
 *
 * With TypedPath, make it clear what path is expected by each function.
 *
 * Some functions accept a general path, like fs.stat. Others require that path to be a file path, like fs.readFile. Others need a folder path, like fs.readdir. Sometimes, you write a function that needs to receive an absolute file path, or even a real absolute file path, for instance because you use one of the path segments, or because you compare this path with another AbsoluteFilePath.
 *
 * Paths types
 *
 * A path has a link type (`symbolic, `real`). Note that some relative paths can be viewed has both `symbolic` and `real`.
 *
 * A path has a target type (`file`, `folder`).
 *
 * A path has a position type (`absolute`, `relative`, `fragment`). `relative` means `relative to the current working directory`. `fragment` means relative to another directory. It is usually used to represent path fragments that will be joined together to make an `absolute` or `relative` path. A filename for instance would be an `FragmentFilePath`.
 *
 */

import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import * as PlatformNodePath from '@effect/platform-node/Path';
import { BadArgument, PlatformError } from '@effect/platform/Error';
import { MEffect } from '@mjljm/effect-lib';
import { Context, Effect, Layer, Predicate, pipe } from 'effect';
import { NoSuchElementException } from 'effect/Cause';
import { homedir } from 'node:os';

const moduleTag = '@mjljm/node-effect-lib/IoPath/';

const PlatformNodePathService = PlatformNodePath.Path;
const PlatformNodeFsService = PlatformNodeFs.FileSystem;

const TypeId: unique symbol = Symbol.for(moduleTag + 'TypeId');
type TypeId = typeof TypeId;
const LinkTypeId: unique symbol = Symbol.for(moduleTag + 'LinkTypeId');
type LinkTypeId = typeof LinkTypeId;
const PositionTypeId: unique symbol = Symbol.for(moduleTag + 'PositionTypeId');
type PositionTypeId = typeof PositionTypeId;
const TargetTypeId: unique symbol = Symbol.for(moduleTag + 'TargetTypeId');
type TargetTypeId = typeof TargetTypeId;

export type PathLinkType = 'real' | 'symbolic';
export type PathPositionType = 'absolute' | 'relative' | 'fragment';
export type PathTargetType = 'file' | 'folder';

/**
 * Model
 * */

export type GenericPath<L extends PathLinkType, P extends PathPositionType, T extends PathTargetType> = string & {
	[TypeId]: TypeId;
} & { [LinkTypeId]: L } & { [PositionTypeId]: P } & { [TargetTypeId]: T };

export type Path = GenericPath<PathLinkType, PathPositionType, PathTargetType>;
export type AbsoluteFilePath = GenericPath<PathLinkType, 'absolute', 'file'>;
export type AbsoluteFolderPath = GenericPath<PathLinkType, 'absolute', 'folder'>;
export type RelativeFilePath = GenericPath<PathLinkType, 'relative', 'file'>;
export type RelativeFolderPath = GenericPath<PathLinkType, 'relative', 'folder'>;
export type FragmentFilePath = GenericPath<PathLinkType, 'fragment', 'file'>;
export type FragmentFolderPath = GenericPath<PathLinkType, 'fragment', 'folder'>;
export type RealAbsoluteFilePath = GenericPath<'real', 'absolute', 'file'>;
export type RealAbsoluteFolderPath = GenericPath<'real', 'absolute', 'folder'>;

export type ResolvableFilePath = AbsoluteFilePath | RelativeFilePath;
export type ResolvableFolderPath = AbsoluteFolderPath | RelativeFolderPath;
export type ResolvablePath = ResolvableFilePath | ResolvableFolderPath;

/**
 * Utility types
 */
export type PathLink<G extends Path> = G extends GenericPath<infer L, PathPositionType, PathTargetType>
	? L
	: never;
export type PathPosition<G extends Path> = G extends GenericPath<PathLinkType, infer P, PathTargetType>
	? P
	: never;
export type PathTarget<G extends Path> = G extends GenericPath<PathLinkType, PathPositionType, infer T>
	? T
	: never;

export type ToFile<G extends Path> = G extends GenericPath<infer L, infer P, PathTargetType>
	? GenericPath<L, P, 'file'>
	: never;

export type ToFolder<G extends Path> = G extends GenericPath<infer L, infer P, PathTargetType>
	? GenericPath<L, P, 'folder'>
	: never;

// All possible negative paths types
/*export type NotFilePath = GenericPath<PathLinkType, Exclude<PathTargetType, 'file'>>;
export type NotFolderPath = GenericPath<PathLinkType, Exclude<PathTargetType, 'folder'>>;
export type NotSymbolicPath = GenericPath<Exclude<PathLinkType, 'symbolic'>, PathTargetType>;
export type NotRealPath = GenericPath<Exclude<PathLinkType, 'real'>, PathTargetType>;
export type NotSymbolicFilePath = NotSymbolicPath | NotFilePath;
export type NotSymbolicFolderPath = NotSymbolicPath | NotFolderPath;
export type NotRealFilePath = NotRealPath | NotFilePath;
export type NotRealFolderPath = NotRealPath | NotFolderPath;*/

/**
 * Unsafe constructors
 */

const unsafeGenericPath = <L extends PathLinkType, P extends PathPositionType, T extends PathTargetType>(
	p: string
): GenericPath<L, P, T> => p as GenericPath<L, P, T>;

export const unsafeAbsoluteFilePath = unsafeGenericPath<PathLinkType, 'absolute', 'file'>;
export const unsafeAbsoluteFolderPath = unsafeGenericPath<PathLinkType, 'absolute', 'folder'>;
export const unsafeRelativeFilePath = unsafeGenericPath<PathLinkType, 'relative', 'file'>;
export const unsafeRelativeFolderPath = unsafeGenericPath<PathLinkType, 'relative', 'folder'>;
export const unsafeFragmentFilePath = unsafeGenericPath<PathLinkType, 'fragment', 'file'>;
export const unsafeFragmentFolderPath = unsafeGenericPath<PathLinkType, 'fragment', 'folder'>;
export const unsafeRealAbsoluteFilePath = unsafeGenericPath<'real', 'absolute', 'file'>;
export const unsafeRealAbsoluteFolderPath = unsafeGenericPath<'real', 'absolute', 'folder'>;

export interface ServiceInterface {
	/** Current working directory */
	readonly currentDirectory: AbsoluteFolderPath;

	/**
	 * User's home directory
	 */
	readonly homeDir: RealAbsoluteFolderPath;

	/**
	 * System root directory
	 */
	readonly rootDir: RealAbsoluteFolderPath;

	/**
	 * Safe constructors
	 */
	readonly AbsoluteFilePath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, AbsoluteFilePath>;
	readonly AbsoluteFolderPath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, AbsoluteFolderPath>;
	readonly RelativeFilePath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, RelativeFilePath>;
	readonly RelativeFolderPath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, RelativeFolderPath>;
	/*readonly RealAbsoluteFilePath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, RealAbsoluteFilePath>;
	readonly RealAbsoluteFolderPath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, RealAbsoluteFolderPath>;*/

	/**
	 * Join all arguments together and normalize the resulting path. Joining negative fragments to a real path always yields a real path. Joining positive fragments to a symbolic path always yields a symbolic path. We usually don't know if a fragment is real or symbolic. So we simplify the function type by returning a path whose link type is unknown.
	 */
	readonly join: {
		<P1 extends PathPositionType, TN extends PathTargetType>(
			path1: GenericPath<PathLinkType, P1, 'folder'>,
			pathN: GenericPath<PathLinkType, 'fragment', TN>
		): GenericPath<PathLinkType, P1, TN>;
		<P1 extends PathPositionType, TN extends PathTargetType>(
			path1: GenericPath<PathLinkType, P1, 'folder'>,
			path2: GenericPath<PathLinkType, 'fragment', 'folder'>,
			pathN: GenericPath<PathLinkType, 'fragment', TN>
		): GenericPath<PathLinkType, P1, TN>;
		<P1 extends PathPositionType, TN extends PathTargetType>(
			path1: GenericPath<PathLinkType, P1, 'folder'>,
			path2: GenericPath<PathLinkType, 'fragment', 'folder'>,
			path3: GenericPath<PathLinkType, 'fragment', 'folder'>,
			pathN: GenericPath<PathLinkType, 'fragment', TN>
		): GenericPath<PathLinkType, P1, TN>;
		<P1 extends PathPositionType, TN extends PathTargetType>(
			path1: GenericPath<PathLinkType, P1, 'folder'>,
			path2: GenericPath<PathLinkType, 'fragment', 'folder'>,
			path3: GenericPath<PathLinkType, 'fragment', 'folder'>,
			path4: GenericPath<PathLinkType, 'fragment', 'folder'>,
			pathN: GenericPath<PathLinkType, 'fragment', TN>
		): GenericPath<PathLinkType, P1, TN>;
	};

	/**
	 * If lastSegment isn't already absolute, previousSegments are prepended in right to left order, until an absolute path is found. If after using all previousSegments paths still no absolute path is found, the current working directory is used as well. The resulting path is normalized, and trailing slashes are removed unless the path gets resolved to the root directory. If you know that the first segment is absolute, prefer using join
	 */
	readonly resolve: {
		<TN extends PathTargetType>(
			path1: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			pathN: GenericPath<PathLinkType, PathPositionType, TN>
		): GenericPath<PathLinkType, 'absolute', TN>;
		<TN extends PathTargetType>(
			path1: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			path2: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			pathN: GenericPath<PathLinkType, PathPositionType, TN>
		): GenericPath<PathLinkType, 'absolute', TN>;
		<TN extends PathTargetType>(
			path1: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			path2: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			path3: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			pathN: GenericPath<PathLinkType, PathPositionType, TN>
		): GenericPath<PathLinkType, 'absolute', TN>;
		<TN extends PathTargetType>(
			path1: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			path2: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			path3: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			path4: GenericPath<PathLinkType, PathPositionType, 'folder'>,
			pathN: GenericPath<PathLinkType, PathPositionType, TN>
		): GenericPath<PathLinkType, 'absolute', TN>;
	};

	/**
	 * The underlying path is converted to an absolute path based on the current directory.
	 */
	readonly toAbsolutePath: <T extends PathTargetType>(
		p: GenericPath<PathLinkType, Exclude<PathPositionType, 'absolute'>, T>
	) => GenericPath<PathLinkType, 'absolute', T>;
	/**
	 * The underlying path is converted to a path relative to the current working directory .
	 */
	readonly toRelativePath: <T extends PathTargetType>(
		p: GenericPath<PathLinkType, 'absolute', T>
	) => GenericPath<PathLinkType, 'relative', T>;
	/**
	 * The underlying path is converted to a fully resolved path.
	 */
	readonly toRealAbsolutePath: <T extends PathTargetType>(
		path:
			| GenericPath<'real', Exclude<PathPositionType, 'absolute'>, T>
			| GenericPath<Exclude<PathLinkType, 'real'>, PathPositionType, T>
	) => Effect.Effect<never, PlatformError, GenericPath<'real', 'absolute', T>>;

	/**
	 * Solves the relative path from {from} to {to}. If to or from is the zero-length string (with 'unknown' PathLinkType), the current working directory is used instead. At times we have two absolute paths, and we need to derive the relative path from one to the other. This is actually the reverse transform of path.resolve. If to or from is symbolic, the result is symbolic (but can be real at the same time). If to and from are real, the result is real. If to and from are both unknown, the resulting path has unknown PathLinkType.
	 */
	readonly relative: <L1 extends PathLinkType, L2 extends PathLinkType, T2 extends PathTargetType>(
		from: GenericPath<L1, PathPositionType, PathTargetType>,
		to: GenericPath<L2, PathPositionType, T2>
	) => GenericPath<
		[L1, L2] extends ['real', 'real']
			? 'real'
			: [L1, L2] extends ['real', 'symbolic'] | ['symbolic' | 'real']
			  ? 'symbolic'
			  : PathLinkType,
		'relative',
		T2
	>;

	/**
	 * Returns all the segments of a path but the last.
	 */
	readonly dirname: <L extends PathLinkType, P extends PathPositionType>(
		p: GenericPath<L, P, PathTargetType>
	) => GenericPath<[L] extends ['real'] ? 'real' : PathLinkType, P, 'folder'>;

	/**
	 * Returns the last segment of a path.
	 */
	readonly lastSegment: <L extends PathLinkType, T extends PathTargetType>(
		p: GenericPath<L, PathPositionType, T>
	) => GenericPath<L, 'fragment', T>;

	/**
	 * The platform-specific file separator. '\\' or '/'.
	 */
	readonly sep: string;
	readonly fromFileUrl: (url: URL) => Effect.Effect<never, BadArgument, RealAbsoluteFilePath>;
	readonly toFileUrl: (path: ResolvablePath) => Effect.Effect<never, BadArgument, URL>;
}

export const Service = Context.Tag<ServiceInterface>(Symbol.for(moduleTag + 'Service'));

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const path = yield* _(PlatformNodePathService);
		const fs = yield* _(PlatformNodeFsService);

		const currentDirectoryStr = path.resolve();
		const homeDirStr = homedir();

		const currentDirectory = unsafeAbsoluteFolderPath(currentDirectoryStr);
		const homeDir = unsafeRealAbsoluteFolderPath(homeDirStr);
		const rootDir = unsafeRealAbsoluteFolderPath(path.parse(homeDirStr).root);

		const checkPath =
			(
				linkStatFunction: (p: string) => Effect.Effect<never, PlatformError, PlatformNodeFs.File.Info>,
				positionFilter: (p: string) => boolean,
				target: 'File' | 'Directory'
			) =>
			(p: string): Effect.Effect<never, PlatformError | NoSuchElementException, string> =>
				pipe(
					p,
					Effect.succeed,
					Effect.filterOrFail(positionFilter, () => new NoSuchElementException()),
					MEffect.filterEffectOrFail(fs.exists, () => new NoSuchElementException()),
					MEffect.filterEffectOrFail(
						(p) =>
							pipe(
								p,
								linkStatFunction,
								Effect.map((info) => info.type === target)
							),
						() => new NoSuchElementException()
					)
				);

		return {
			currentDirectory,
			homeDir,
			rootDir,
			AbsoluteFilePath: checkPath(fs.stat, path.isAbsolute, 'File') as never,
			AbsoluteFolderPath: checkPath(fs.stat, path.isAbsolute, 'Directory') as never,
			RelativeFilePath: checkPath(fs.stat, Predicate.not(path.isAbsolute), 'File') as never,
			RelativeFolderPath: checkPath(fs.stat, Predicate.not(path.isAbsolute), 'Directory') as never,
			join: (...segments: ReadonlyArray<Path>) => path.join(...segments) as never,
			resolve: (...segments: ReadonlyArray<Path>) => path.resolve(...segments) as never,
			toAbsolutePath: (p) => path.resolve(p) as never,
			toRelativePath: (p) => path.relative('', p) as never,
			toRealAbsolutePath: (p) => fs.realPath(p) as never,
			relative: (from, to) => path.relative(from, to) as never,
			dirname: (p) => path.dirname(p) as never,
			lastSegment: (p) => path.basename(p) as never,
			fromFileUrl: (url) => path.fromFileUrl(url) as never,
			sep: path.sep,
			toFileUrl: (p) => path.toFileUrl(p) as never
		};
	})
);
