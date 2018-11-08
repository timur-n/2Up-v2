p:
cd P:\Programs\openssl1.0.2p
set OPENSSL_CONF=P:\Programs\openssl1.0.2p\openssl.cfg
rem openssl req -new -x509 -sha256 -key server.key -out server.pem -days 365

openssl req -new -newkey rsa:4096 -nodes -config openssl.cfg -subj "/" -outform pem -out 2up.csr -keyout 2up.key

pause

openssl x509 -req -days 365 -in 2up.csr -signkey 2up.key -out 2up.crt -outform der -extensions v3_req -extfile openssl.cfg

pause

rem openssl x509 -in 2up.crt -out 2up.pem -outform PEM
openssl x509 -in 2up.crt -inform der -outform pem -out 2up.pem

pause