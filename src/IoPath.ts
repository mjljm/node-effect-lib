import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import * as PlatformNodePath from '@effect/platform-node/Path';
import { BadArgument, PlatformError } from '@effect/platform/Error';
import { MEffect } from '@mjljm/effect-lib';
import { TypedPath } from '@mjljm/js-lib';
import { Context, Effect, Layer, Predicate, pipe } from 'effect';
import { NoSuchElementException } from 'effect/Cause';
import { homedir } from 'node:os';

const moduleTag = '@mjljm/node-effect-lib/IoPath/';

const PlatformNodePathService = PlatformNodePath.Path;
const PlatformNodeFsService = PlatformNodeFs.FileSystem;

export interface ServiceInterface {
	/** Current working directory */
	readonly currentDirectory: TypedPath.AbsoluteFolderPath;

	/**
	 * User's home directory
	 */
	readonly homeDir: TypedPath.RealAbsoluteFolderPath;

	/**
	 * System root directory
	 */
	readonly rootDir: TypedPath.RealAbsoluteFolderPath;

	/**
	 * Safe constructors
	 */
	readonly AbsoluteFilePath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, TypedPath.AbsoluteFilePath>;
	readonly AbsoluteFolderPath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, TypedPath.AbsoluteFolderPath>;
	readonly RelativeFilePath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, TypedPath.RelativeFilePath>;
	readonly RelativeFolderPath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, TypedPath.RelativeFolderPath>;
	// To finish when Tim Smart has corrected fs.stat
	/*readonly RealAbsoluteFilePath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, RealAbsoluteFilePath>;
	readonly TypedPath.RealAbsoluteFolderPath: (
		p: string
	) => Effect.Effect<never, PlatformError | NoSuchElementException, TypedPath.RealAbsoluteFolderPath>;*/

	/**
	 * Join all arguments together and normalize the resulting path. Joining negative fragments to a real path always yields a real path. Joining positive fragments to a symbolic path always yields a symbolic path. We usually don't know if a fragment is real or symbolic. So we simplify the function type by returning a path whose link type is unknown.
	 */
	readonly join: {
		<P1 extends TypedPath.PathPositionType, TN extends TypedPath.PathTargetType>(
			path1: TypedPath.TypedPath<TypedPath.PathLinkType, P1, 'folder'>,
			pathN: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', TN>
		): TypedPath.TypedPath<TypedPath.PathLinkType, P1, TN>;
		<P1 extends TypedPath.PathPositionType, TN extends TypedPath.PathTargetType>(
			path1: TypedPath.TypedPath<TypedPath.PathLinkType, P1, 'folder'>,
			path2: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', 'folder'>,
			pathN: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', TN>
		): TypedPath.TypedPath<TypedPath.PathLinkType, P1, TN>;
		<P1 extends TypedPath.PathPositionType, TN extends TypedPath.PathTargetType>(
			path1: TypedPath.TypedPath<TypedPath.PathLinkType, P1, 'folder'>,
			path2: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', 'folder'>,
			path3: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', 'folder'>,
			pathN: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', TN>
		): TypedPath.TypedPath<TypedPath.PathLinkType, P1, TN>;
		<P1 extends TypedPath.PathPositionType, TN extends TypedPath.PathTargetType>(
			path1: TypedPath.TypedPath<TypedPath.PathLinkType, P1, 'folder'>,
			path2: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', 'folder'>,
			path3: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', 'folder'>,
			path4: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', 'folder'>,
			pathN: TypedPath.TypedPath<TypedPath.PathLinkType, 'fragment', TN>
		): TypedPath.TypedPath<TypedPath.PathLinkType, P1, TN>;
	};

	/**
	 * If lastSegment isn't already absolute, previousSegments are prepended in right to left order, until an absolute path is found. If after using all previousSegments paths still no absolute path is found, the current working directory is used as well. The resulting path is normalized, and trailing slashes are removed unless the path gets resolved to the root directory. If you know that the first segment is absolute, prefer using join
	 */
	readonly resolve: {
		<TN extends TypedPath.PathTargetType>(
			path1: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			pathN: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, TN>
		): TypedPath.TypedPath<TypedPath.PathLinkType, 'absolute', TN>;
		<TN extends TypedPath.PathTargetType>(
			path1: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			path2: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			pathN: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, TN>
		): TypedPath.TypedPath<TypedPath.PathLinkType, 'absolute', TN>;
		<TN extends TypedPath.PathTargetType>(
			path1: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			path2: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			path3: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			pathN: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, TN>
		): TypedPath.TypedPath<TypedPath.PathLinkType, 'absolute', TN>;
		<TN extends TypedPath.PathTargetType>(
			path1: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			path2: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			path3: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			path4: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, 'folder'>,
			pathN: TypedPath.TypedPath<TypedPath.PathLinkType, TypedPath.PathPositionType, TN>
		): TypedPath.TypedPath<TypedPath.PathLinkType, 'absolute', TN>;
	};

	/**
	 * The underlying path is converted to an absolute path based on the current directory.
	 */
	readonly toAbsolutePath: <T extends TypedPath.PathTargetType>(
		p: TypedPath.TypedPath<TypedPath.PathLinkType, Exclude<TypedPath.PathPositionType, 'absolute'>, T>
	) => TypedPath.TypedPath<TypedPath.PathLinkType, 'absolute', T>;
	/**
	 * The underlying path is converted to a path relative to the current working directory .
	 */
	readonly toRelativePath: <T extends TypedPath.PathTargetType>(
		p: TypedPath.TypedPath<TypedPath.PathLinkType, 'absolute', T>
	) => TypedPath.TypedPath<TypedPath.PathLinkType, 'relative', T>;
	/**
	 * The underlying path is converted to a fully resolved path.
	 */
	readonly toRealAbsolutePath: <T extends TypedPath.PathTargetType>(
		path: TypedPath.TypedPath<TypedPath.PathLinkType, Exclude<TypedPath.PathPositionType, 'fragment'>, T>
	) => Effect.Effect<never, PlatformError, TypedPath.TypedPath<'real', 'absolute', T>>;

	/**
	 * Solves the relative path from {from} to {to}. If to or from is the zero-length string (with 'unknown' TypedPath.PathLinkType), the current working directory is used instead. At times we have two absolute paths, and we need to derive the relative path from one to the other. This is actually the reverse transform of path.resolve. If to or from is symbolic, the result is symbolic (but can be real at the same time). If to and from are real, the result is real. If to and from are both unknown, the resulting path has unknown TypedPath.PathLinkType.
	 */
	readonly relative: <
		L1 extends TypedPath.PathLinkType,
		L2 extends TypedPath.PathLinkType,
		T2 extends TypedPath.PathTargetType
	>(
		from: TypedPath.TypedPath<L1, TypedPath.PathPositionType, TypedPath.PathTargetType>,
		to: TypedPath.TypedPath<L2, TypedPath.PathPositionType, T2>
	) => TypedPath.TypedPath<
		[L1, L2] extends ['real', 'real']
			? 'real'
			: [L1, L2] extends ['real', 'symbolic'] | ['symbolic' | 'real']
				? 'symbolic'
				: TypedPath.PathLinkType,
		'relative',
		T2
	>;

	/**
	 * Returns all the segments of a path but the last.
	 */
	readonly dirname: <L extends TypedPath.PathLinkType, P extends TypedPath.PathPositionType>(
		p: TypedPath.TypedPath<L, P, TypedPath.PathTargetType>
	) => TypedPath.TypedPath<[L] extends ['real'] ? 'real' : TypedPath.PathLinkType, P, 'folder'>;

	/**
	 * Returns the last segment of a path.
	 */
	readonly lastSegment: <L extends TypedPath.PathLinkType, T extends TypedPath.PathTargetType>(
		p: TypedPath.TypedPath<L, TypedPath.PathPositionType, T>
	) => TypedPath.TypedPath<L, 'fragment', T>;

	/**
	 * The platform-specific file separator. '\\' or '/'.
	 */
	readonly sep: string;
	readonly fromFileUrl: (url: URL) => Effect.Effect<never, BadArgument, TypedPath.RealAbsoluteFilePath>;
	readonly toFileUrl: (path: TypedPath.ResolvablePath) => Effect.Effect<never, BadArgument, URL>;
}

export const Service = Context.Tag<ServiceInterface>(Symbol.for(moduleTag + 'Service'));

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const path = yield* _(PlatformNodePathService);
		const fs = yield* _(PlatformNodeFsService);

		const currentDirectoryStr = path.resolve();
		const homeDirStr = homedir();

		const currentDirectory = TypedPath.unsafeAbsoluteFolderPath(currentDirectoryStr);
		const homeDir = TypedPath.unsafeRealAbsoluteFolderPath(homeDirStr);
		const rootDir = TypedPath.unsafeRealAbsoluteFolderPath(path.parse(homeDirStr).root);

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
			join: (...segments: ReadonlyArray<TypedPath.Path>) => path.join(...segments) as never,
			resolve: (...segments: ReadonlyArray<TypedPath.Path>) => path.resolve(...segments) as never,
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
