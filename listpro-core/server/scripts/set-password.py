#!/usr/bin/env python3
import getpass, hashlib, os, pathlib, sys
file=pathlib.Path(sys.argv[1])
if file.exists():
    raise SystemExit('Config already exists; refusing to replace credentials.')
password=getpass.getpass('Новый пароль для входа в ListPro (не root, минимум 12 символов): ')
if len(password)<12 or password!=getpass.getpass('Повторите пароль: '):
    raise SystemExit('Пароли не совпали или пароль слишком короткий. Файл не создан.')
salt=os.urandom(16)
hash=hashlib.scrypt(password.encode('utf-8'),salt=salt,n=16384,r=8,p=1,dklen=64)
fd=os.open(file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:
    f.write('LISTPRO_USER=owner\nLISTPRO_PASSWORD_SALT='+salt.hex()+'\nLISTPRO_PASSWORD_HASH='+hash.hex()+'\nLISTPRO_PORT=3127\nLISTPRO_DATA_DIR=/var/lib/listpro\n')
print('Пользователь сайта: owner. Пароль не выводится и не передаётся в чат.')
