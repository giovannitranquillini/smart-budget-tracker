import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const packageDefinition = protoLoader.loadSync('../protos/ai.proto');
const aiProto = grpc.loadPackageDefinition(packageDefinition).ai.backend;

export function startGrpcServer({ onTranscription, onBudgetRecord, host = '0.0.0.0:50051' }) {
  const server = new grpc.Server();
  server.addService(aiProto.AIService.service, {
    SubmitTranscription(call, callback) {
      const { audio_id, transcription } = call.request;
      try {
        onTranscription({ audioId: audio_id, transcription });
        callback(null, { ok: true, message: 'transcription received' });
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: String(err) });
      }
    },
    SubmitBudgetRecord(call, callback) {
      const { audio_id, payload } = call.request;
      try {
        onBudgetRecord({ audioId: audio_id, payload });
        callback(null, { ok: true, message: 'budget record received' });
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: String(err) });
      }
    },
  });
  server.bindAsync(host, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) throw err;
    console.log(` [x] gRPC server in ascolto su ${host} (porta ${port})`);
  });
  return server;
}