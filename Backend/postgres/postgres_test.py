import psycopg2
from decouple import config

conn = psycopg2.connect(
    host=config('DB_HOST'),
    port=config('DB_PORT'),
    database=config('DB_NAME'),
    user=config('DB_USERNAME'),
    password=config('DB_PASSWORD')
)
cursor = conn.cursor()

# To check if the table exists, this query gets the table and prints all of the corresponding columns
cursor.execute("""
    SELECT column_name
    FROM information_schema.columns 
    WHERE table_name = 'parking_availability_data'
    ORDER BY ordinal_position;
""")
columns = cursor.fetchall()
print("All columns:")
for column in columns:
    print(f"- {column[0]}")

cursor.close()
conn.close()