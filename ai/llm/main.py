from src.llm import execute_llm
import os
from dotenv import load_dotenv
import pika, sys, os
import json

def callback(ch, method, properties, body):
    print(f" [x] Received {body}")

    # Decode the JSON message
    incoming_payload = json.loads(body.decode('utf-8'))

    # send everything to the LLM to generate the new record
    budget_record = execute_llm(incoming_payload['prompt'], incoming_payload['text'])

    payload = {
        "jobId": incoming_payload["jobId"],
        "budgetRecord": budget_record,
    }

    # Publish the budget record on the pipeline exchange: it is routed to every queue
    # bound to 'llm.processed' (the next step and the progress notifications)
    ch.basic_publish(
        exchange='pipeline',
        routing_key='llm.processed',
        body=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2,         # persistent message
            correlation_id=properties.correlation_id,  # propagate the ID if the API sends it
        ),
    )

    # Ack only after the result has been published
    ch.basic_ack(delivery_tag=method.delivery_tag)
    print(f" [x] Nuovo budget record generato")

def main():

    print(" [*] Starting LLM service...")
    load_dotenv()  # Load environment variables from .env file
    connection_url = os.getenv('RABBITMQ_URL')

    if not connection_url:
        raise RuntimeError("RABBITMQ_URL environment variable is not set")

    connection = pika.BlockingConnection(pika.URLParameters(connection_url))
    channel = connection.channel()

    channel.exchange_declare(exchange='pipeline', exchange_type='topic', durable=True)

    channel.queue_declare(
        queue='llm.processing',
        durable=True
    )

    channel.basic_consume(
        queue='llm.processing', 
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
