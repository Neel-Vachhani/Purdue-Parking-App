import psycopg2
from decouple import config

# Connect to Postgres
conn = psycopg2.connect(
    host=config('DB_HOST'),
    port=config('DB_PORT'),
    database=config('DB_NAME'),
    user=config('DB_USERNAME'),
    password=config('DB_PASSWORD')
)

cursor = conn.cursor()

# Query columns from your user table
cursor.execute("""
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns 
    WHERE table_name = 'boiler_park_backend_user'
    ORDER BY ordinal_position;
""")

columns = cursor.fetchall()

print("Columns for boiler_park_backend_user:")
for name, nullable, dtype in columns:
    print(f"- {name} | NULL: {nullable} | TYPE: {dtype}")

cursor.close()
conn.close()
