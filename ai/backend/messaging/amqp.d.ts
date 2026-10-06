export type MessageCallback = (message: string) => void;

export function sendMessage(queue: string, message: string | Buffer): void;
export type ReadSettings = {
  queue: string;
  exchange?: string;
  binding?: string;
};

export function readMessage(settings: ReadSettings, callback: MessageCallback): void;
