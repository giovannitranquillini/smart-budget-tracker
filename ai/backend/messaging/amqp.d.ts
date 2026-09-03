export type MessageCallback = (message: string) => void;

export function sendMessage(queue: string, message: string | Buffer): void;
export function readMessage(queue: string, callback: MessageCallback): void;
