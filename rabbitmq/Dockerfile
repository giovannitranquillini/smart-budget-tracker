FROM rabbitmq:management

# Environment variables (override at runtime or in docker-compose)
ENV RABBITMQ_DEFAULT_USER=admin
ENV RABBITMQ_DEFAULT_PASS=admin

#COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
#COPY definitions.json /etc/rabbitmq/definitions.json
#COPY enabled_plugins /etc/rabbitmq/enabled_plugins

# Default RabbitMQ port
EXPOSE 5672 15672