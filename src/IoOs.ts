import { Context, Layer } from 'effect';
import { homedir } from 'node:os';

const implementation = () => ({
	/**
	 * Port of Node Js's os.homedir function
	 * @returns
	 */
	homeDir: () => homedir()
});

// type Interface = typeof implementation works but leads to verbose type display
export interface ServiceInterface
	extends Readonly<ReturnType<typeof implementation>> {}

export const Service = Context.Tag<ServiceInterface>(
	Symbol.for('#internal/IoOs.ts')
);

export const live = Layer.succeed(Service, implementation());
