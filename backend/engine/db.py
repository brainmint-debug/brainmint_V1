import pymysql

def get_db():
    return pymysql.connect(
        host="localhost",
        user="django_user",
        password="Django@123",
        database="brainmint",
        cursorclass=pymysql.cursors.DictCursor
    )