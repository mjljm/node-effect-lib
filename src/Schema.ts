import * as NPath from '#mjljm/node-effect-lib/Path';
import { ParseResult, Schema } from '@effect/schema';

import { Effect } from 'effect';

// New data types
export const resolvablePathFromSelf = Schema.transformOrFail(
	Schema.string,
	Schema.string,
	(s, _, ast) =>
		Effect.gen(function* (_) {
			const nPath = yield* _(NPath.Service);
			const path = yield* _(
				s,
				nPath.ResolvablePath,
				Effect.catchTags({
					BadArgument: (e) =>
						Effect.fail(
							ParseResult.type(
								ast,
								s,
								`Bad argument in method '${e.method}' of module '${e.module}' with message:'${e.message}'`
							)
						),
					SystemError: (e) =>
						Effect.fail(
							ParseResult.type(
								ast,
								s,
								`System error in method '${e.method}' of module '${e.module}' for path '${e.pathOrDescriptor}' with reason:'${e.reason}'. Message:'${e.message}'`
							)
						),
					NoSuchElementException: () => Effect.fail(ParseResult.type(ast, s, `'${s}' is not a valid path`))
				})
			);
			return path as string;
		}),
	(s) => Effect.succeed(s)
);

/*export const resolvablePathFromSelf1 = Schema.string as unknown as Schema.Schema<
	never,
	TypedPath.ResolvablePath,
	TypedPath.ResolvablePath
>;

export const absoluteFilePath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'AbsoluteFilePath',
		[AST.TitleAnnotationId]: 'AbsoluteFilePath',
		[AST.DescriptionAnnotationId]: 'an AbsoluteFilePath string'
	})
) as unknown as Schema.Schema<never, TypedPath.AbsoluteFilePath, TypedPath.AbsoluteFilePath>;
export const absoluteFolderPath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'AbsoluteFolderPath',
		[AST.TitleAnnotationId]: 'AbsoluteFolderPath',
		[AST.DescriptionAnnotationId]: 'an AbsoluteFolderPath string'
	})
) as unknown as Schema.Schema<never, TypedPath.AbsoluteFolderPath, TypedPath.AbsoluteFolderPath>;
export const relativeFilePath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'RelativeFilePath',
		[AST.TitleAnnotationId]: 'RelativeFilePath',
		[AST.DescriptionAnnotationId]: 'a RelativeFilePath string'
	})
) as unknown as Schema.Schema<never, TypedPath.RelativeFilePath, TypedPath.RelativeFilePath>;
export const relativeFolderPath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'RelativeFolderPath',
		[AST.TitleAnnotationId]: 'RelativeFolderPath',
		[AST.DescriptionAnnotationId]: 'a RelativeFolderPath string'
	})
) as unknown as Schema.Schema<never, TypedPath.RelativeFolderPath, TypedPath.RelativeFolderPath>;
export const filePathFragment = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'FilePathFragment',
		[AST.TitleAnnotationId]: 'FilePathFragment',
		[AST.DescriptionAnnotationId]: 'a FilePathFragment string'
	})
) as unknown as Schema.Schema<never, TypedPath.FilePathFragment, TypedPath.FilePathFragment>;
export const folderPathFragment = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'FolderPathFragment',
		[AST.TitleAnnotationId]: 'FolderPathFragment',
		[AST.DescriptionAnnotationId]: 'a FolderPathFragment string'
	})
) as unknown as Schema.Schema<never, TypedPath.FolderPathFragment, TypedPath.FolderPathFragment>;
export const realAbsoluteFilePath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'RealAbsoluteFilePath',
		[AST.TitleAnnotationId]: 'RealAbsoluteFilePath',
		[AST.DescriptionAnnotationId]: 'a RealAbsoluteFilePath string'
	})
) as unknown as Schema.Schema<never, TypedPath.RealAbsoluteFilePath, TypedPath.RealAbsoluteFilePath>;
export const realAbsoluteFolderPath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'RealAbsoluteFolderPath',
		[AST.TitleAnnotationId]: 'RealAbsoluteFolderPath',
		[AST.DescriptionAnnotationId]: 'a RealAbsoluteFolderPath string'
	})
) as unknown as Schema.Schema<never, TypedPath.RealAbsoluteFolderPath, TypedPath.RealAbsoluteFolderPath>;

export const resolvableFilePath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'ResolvableFilePath',
		[AST.TitleAnnotationId]: 'ResolvableFilePath',
		[AST.DescriptionAnnotationId]: 'a ResolvableFilePath string'
	})
) as unknown as Schema.Schema<never, TypedPath.ResolvableFilePath, TypedPath.ResolvableFilePath>;

export const resolvableFolderPath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'ResolvableFolderPath',
		[AST.TitleAnnotationId]: 'ResolvableFolderPath',
		[AST.DescriptionAnnotationId]: 'a ResolvableFolderPath string'
	})
) as unknown as Schema.Schema<never, TypedPath.ResolvableFolderPath, TypedPath.ResolvableFolderPath>;

export const resolvablePath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'ResolvablePath',
		[AST.TitleAnnotationId]: 'ResolvablePath',
		[AST.DescriptionAnnotationId]: 'a ResolvablePath string'
	})
) as unknown as Schema.Schema<never, TypedPath.ResolvablePath, TypedPath.ResolvablePath>;
export const resolvableSymbolicPath = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'ResolvableSymbolicPath',
		[AST.TitleAnnotationId]: 'ResolvableSymbolicPath',
		[AST.DescriptionAnnotationId]: 'a ResolvableSymbolicPath string'
	})
) as unknown as Schema.Schema<never, TypedPath.ResolvableSymbolicPath, TypedPath.ResolvableSymbolicPath>;
export const pathFragment = pipe(
	Schema.string,
	Schema.annotations({
		[AST.IdentifierAnnotationId]: 'PathFragment',
		[AST.TitleAnnotationId]: 'PathFragment',
		[AST.DescriptionAnnotationId]: 'a PathFragment string'
	})
) as unknown as Schema.Schema<never, TypedPath.PathFragment, TypedPath.PathFragment>;*/
