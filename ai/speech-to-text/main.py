from src.transcriber import transcribe_audio
import os
from dotenv import load_dotenv
import pika, sys, os
import json

def callback(ch, method, properties, body):
    print(f" [x] Received {body}")

    try:
        message = json.loads(body.decode("utf-8"))
        job_id = message["jobId"]
        audio_filepath = message["filePath"]
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Messaggio non valido: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    if not os.path.exists(audio_filepath):
        print(f"Audio file non trovato: {audio_filepath}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    try: 
        print(f"Trascrivo: {audio_filepath}")
        text = transcribe_audio(audio_filepath)
    except Exception as e:
        print(f"Errore durante la trascrizione: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    # send transcribed text to another queue
    payload = {
        "jobId": job_id,
        "text": text,
    }

    # Invia la trascrizione sull'altra coda
    ch.basic_publish(
        exchange='',                 # default exchange: routing_key = nome della coda
        routing_key='transcriptions',
        body=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2,         # messaggio persistente
            correlation_id=properties.correlation_id,  # propaga l'ID se l'API lo manda
        ),
    )

    # Ack solo dopo aver pubblicato il risultato
    ch.basic_ack(delivery_tag=method.delivery_tag)
    print(f" [x] Trascrizione inviata su 'transcriptions'")

def main():

    load_dotenv()  # Load environment variables from .env file
    connection_url = os.getenv('RABBITMQ_URL')

    if not connection_url:
        raise RuntimeError("RABBITMQ_URL environment variable is not set")

    connection = pika.BlockingConnection(pika.URLParameters(connection_url))
    channel = connection.channel()

    channel.queue_declare(
        queue='speech_to_text',
        durable=True
    )

    channel.basic_consume(
        queue='speech_to_text', 
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
