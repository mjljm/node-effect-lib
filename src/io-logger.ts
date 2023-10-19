import * as Logger from 'effect/Logger';
import jsunescape from 'jsunescape';
import { inspect } from 'node:util';

export class LoggerError {
	constructor(
		public message: string,
		public property: unknown
	) {}
}

export const live = Logger.replace(
	Logger.defaultLogger,
	Logger.make(({ date, message }) => {
		try {
			if (message instanceof LoggerError) {
				console.log(`${date.toISOString()}: ${message.message}`);
				console.log(jsunescape(inspect(message.property, false, null)));
			} else console.log(`${date.toISOString()}:`, message);
		} catch (e) {
			console.log(`Error logging: ${(e as Error).message}`);
		}
	})
);
