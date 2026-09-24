import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { sendMessage } from "@core/messaging/amqp.js";
import logger from "@core/lib/logger.js";

// Temporary storage shared with the AI group: the speech-to-text worker
// reads the file from the path published on the queue.
const AUDIO_STORAGE_PATH = path.resolve(
    process.env.AUDIO_STORAGE_PATH || path.join(process.cwd(), "..", "audio_files")
);

const AUDIO_PROCESSING_QUEUE = "audio_processing_queue";

export const AudioService = () => {

    async function storeAudio(params: { filename: string; content: Buffer }): Promise<{ filePath: string; audioId: string }> {
        logger.info(`[AudioService] Storing audio file.`);

        await mkdir(AUDIO_STORAGE_PATH, { recursive: true });

        const extension = path.extname(params.filename) || ".webm";
        const audioId = randomUUID();
        const filePath = path.join(AUDIO_STORAGE_PATH, `${audioId}${extension}`);

        await writeFile(filePath, params.content);

        logger.info(`[AudioService] Audio file stored at ${filePath}.`);

        return {filePath, audioId};
    }

    async function requestTranscription(jobId: string, filePath: string) {
        logger.info(`[AudioService] Publishing ${filePath} to queue "${AUDIO_PROCESSING_QUEUE}".`);
        sendMessage(AUDIO_PROCESSING_QUEUE, JSON.stringify({ jobId: jobId, filePath: filePath }));
    }

    return {
        storeAudio,
        requestTranscription
    }
}
