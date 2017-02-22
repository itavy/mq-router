#!/bin/bash

checkContainerHealth () {
  RUNNING=$(docker inspect --format="{{ .State.Running }}" $1 2> /dev/null);
  if [ $? -eq 1 ]; then
    echo "Container $1 does not exists";
    return 1;
  fi
  if [ "$RUNNING" == "false" ]; then
    echo "Container $1 is not running";
    return 2;
  fi
  echo "Container $1 is running";
  return 3;
}

startRabbitMq () {
  CONTAINER="mqrouter-rabbit";

  checkContainerHealth ${CONTAINER};

  case $? in
    1)
      echo "Create container ${CONTAINER}";
      CONSTAINER_RESULT=$(docker run -d --hostname ${CONTAINER} --name ${CONTAINER} -p 8080:15672 -p 5672:5672 -p 5671:5671 -p 4370:4369 rabbitmq:management 2> /dev/null);
      echo "${CONTAINER} started";
      ;;
    2)
      echo "Starting container ${CONTAINER}";
      docker start ${CONTAINER}
      echo "${CONTAINER} started";
      ;;
    3)
      echo "Container ${CONTAINER} allready running; nothing to do;";
      ;;
    *)
      echo "Something went wrong";
      exit 1;
      ;;
  esac
  exit 0;
}

case $1 in
  'rabbitmq')
    startRabbitMq
    exit $?;
    ;;
  *)
    echo "Display help";
    exit 0;
esac;
