from src.transcriber import transcribe_audio
import os
import pika, sys, os

def callback(ch, method, properties, body):
    print(f" [x] Received {body}")

    audio_filepath = body.decode("utf-8")

    if not os.path.exists(audio_filepath):
        raise FileNotFoundError(f"Audio file non trovato: {audio_filepath}")

    print(f"Trascrivo: {audio_filepath}")
    text = transcribe_audio(audio_filepath)
    send_message(text)

def main():
    credentials = pika.PlainCredentials('admin', 'admin')
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost', credentials=credentials))
    channel = connection.channel()

    channel.queue_declare(
        queue='speech_to_text',
        durable=True
    )

    channel.basic_consume(
        queue='speech_to_text', 
        on_message_callback=callback, 
        auto_ack=True
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
