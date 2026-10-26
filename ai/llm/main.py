from src.llm import execute_llm
import os
from dotenv import load_dotenv
import pika, sys, os
import json
from pydantic import BaseModel

class LLMOutput(BaseModel):
    jobId: str
    budgetRecord: dict

def publish_failure(ch, properties, job_id, error):
    ch.basic_publish(
        exchange='pipeline',
        routing_key='llm.failed',
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
        incoming_payload = json.loads(body.decode('utf-8'))
        job_id = incoming_payload["jobId"]
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Invalid message: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return
    
    # send everything to the LLM to generate the new record
    try:
        budget_record = execute_llm(incoming_payload['prompt'], incoming_payload['text'])
    except Exception as e:
        print(f"Error during LLM execution: {e}")
        publish_failure(ch, properties, job_id, str(e))   # routing_key='llm.failed'
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    # check llm output for errors
    try:
        payload = LLMOutput(jobId=job_id, budgetRecord=budget_record)
    except Exception as e:
        print(f"Error validating LLM output: {e}")
        publish_failure(ch, properties, job_id, f"Invalid LLM output: {e}")  # routing_key='llm.failed'
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

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
    print(f" [x] New budget record generated")

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
