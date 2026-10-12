from src.ocr import analyze_image
import os
from dotenv import load_dotenv
import pika, sys, os
import json

def callback(ch, method, properties, body):
    print(f" [x] Received {body}")

    try:
        message = json.loads(body.decode("utf-8"))
        job_id = message["jobId"]
        image_filepath = message["filePath"]
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Messaggio non valido: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    if not os.path.exists(image_filepath):
        print(f"Image file non trovato: {image_filepath}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    try: 
        print(f"Analyzing image: {image_filepath}")
        text = analyze_image(image_filepath)
    except Exception as e:
        print(f"Errore durante l'analisi dell'immagine: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    # send extracted text to another queue
    payload = {
        "jobId": job_id,
        "text": text,
    }

    ch.exchange_declare(exchange='pipeline', exchange_type='topic', durable=True)
    
    # Publish the extracted text on the other queue
    ch.basic_publish(
        exchange='pipeline',                 # default exchange: routing_key = queue name
        routing_key='ocr.processed',
        body=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2,         # persistent message
            correlation_id=properties.correlation_id,  # propagate the ID if the API sends it
        ),
    )

    # Ack only after the result has been published
    ch.basic_ack(delivery_tag=method.delivery_tag)
    print(f" [x] Testo inviato a 'ocr.processed'")

def main():

    load_dotenv()  # Load environment variables from .env file
    connection_url = os.getenv('RABBITMQ_URL')

    if not connection_url:
        raise RuntimeError("RABBITMQ_URL environment variable is not set")

    connection = pika.BlockingConnection(pika.URLParameters(connection_url))
    channel = connection.channel()

    channel.queue_declare(
        queue='ocr.processing',
        durable=True
    )

    channel.basic_consume(
        queue='ocr.processing', 
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
