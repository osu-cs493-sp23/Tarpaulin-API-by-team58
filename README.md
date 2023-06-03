# Tarpaulin API

## Setup
* run `npm i` to install dependencies
* run `npm run dev` to develop
* run `npm start` to view

* run following command to setup mysql server in Docker container
```bash
docker  run -d --name tarpaulin-server `
-p "3306:3306" `
-e "MYSQL_RANDOM_ROOT_PASSWORD=yes" `
-e "MYSQL_DATABASE=tarpaulin" `
-e "MYSQL_USER=team58" `
-e "MYSQL_PASSWORD=58" `
mysql
```

* When the server is started in Docker, run `docker exec -it tarpaulin-server /bin/bash` to enter bash
    * run `mysql -u team58 -p tarpaulin` to access the database