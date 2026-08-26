import { readFailure } from '../core/failure';
import type { Messages } from './i18n';

export function describeFailure(messages: Messages, message: string): string {
  const failure = readFailure(message);
  if (failure === null) return message;
  const text = messages.failure[failure.code];
  return failure.detail === '' ? text : `${text}: ${failure.detail}`;
}
