from src.transcriber import transcribe_audio
import os
from dotenv import load_dotenv
import pika, sys, os
import json

def publish_failure(ch, properties, job_id, error):
    ch.basic_publish(
        exchange='pipeline',
        routing_key='speech_to_text.failed',
        body=json.dumps({"jobId": job_id, "error": error}).encode('utf-8'),
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2,
            correlation_id=properties.correlation_id,
        ),
    )

def callback(ch, method, properties, body):
    print(f" [x] Received {body}")

    try:
        message = json.loads(body.decode("utf-8"))
        job_id = message["jobId"]
        audio_filepath = message["filePath"]
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Invalid message: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    if not os.path.exists(audio_filepath):
        print(f"Audio file not found: {audio_filepath}")
        publish_failure(ch, properties, job_id, f"Audio file not found: {audio_filepath}") # notify the failure to the pipeline
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    try: 
        print(f"Transcribing: {audio_filepath}")
        text = transcribe_audio(audio_filepath)
    except Exception as e:
        print(f"Error during transcription: {e}")
        publish_failure(ch, properties, job_id, str(e)) # notify the failure to the pipeline
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    # send transcribed text to another queue
    payload = {
        "jobId": job_id,
        "text": text,
    }

    # Publish the transcription on the other queue
    ch.basic_publish(
        exchange='pipeline',                 # topic exchange: routed to every queue bound to the routing key
        routing_key='audio.processed',
        body=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2,         # persistent message
            correlation_id=properties.correlation_id,  # propagate the ID if the API sends it
        ),
    )

    # Ack only after the result has been published
    ch.basic_ack(delivery_tag=method.delivery_tag)
    print(f" [x] Transcription sent to 'audio.processed'")

def main():

    load_dotenv()  # Load environment variables from .env file
    connection_url = os.getenv('RABBITMQ_URL')

    if not connection_url:
        raise RuntimeError("RABBITMQ_URL environment variable is not set")

    connection = pika.BlockingConnection(pika.URLParameters(connection_url))
    channel = connection.channel()

    channel.exchange_declare(exchange='pipeline', exchange_type='topic', durable=True)
    
    channel.queue_declare(
        queue='speech_to_text.processing',
        durable=True
    )

    channel.basic_consume(
        queue='speech_to_text.processing', 
        on_message_callback=callback, 
        auto_ack=False
    )

    print(' [*] Waiting for messages. To exit press CTRL+C')
    channel.start_consuming()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('Interrupted')
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)
