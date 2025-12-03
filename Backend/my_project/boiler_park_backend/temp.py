from django.db import connection
from boiler_park_backend.models import User

print("\n=== CHECKING User TABLE ===\n")

# 1. Django model fields
model_fields = {
    f.column: f.get_internal_type()
    for f in User._meta.get_fields()
    if hasattr(f, "column") and f.column
}

print("MODEL fields:")
for col, type_ in sorted(model_fields.items()):
    print(f"  {col}  ->  {type_}")

# 2. DB columns
table = User._meta.db_table
with connection.cursor() as cursor:
    cursor.execute(f"""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = %s;
    """, [table])
    db_info = cursor.fetchall()

db_columns = {col: dtype for col, dtype in db_info}

print("\nDB columns:")
for col, dtype in sorted(db_columns.items()):
    print(f"  {col}  ->  {dtype}")

# 3. Differences
extra = set(db_columns.keys()) - set(model_fields.keys())
missing = set(model_fields.keys()) - set(db_columns.keys())
common = set(db_columns.keys()) & set(model_fields.keys())

mismatches = [
    (col, model_fields[col], db_columns[col])
    for col in common
    if model_fields[col].lower() not in db_columns[col].lower()
]

# 4. Output results
print("\n=== EXTRA columns in DB (not in model) ===")
for col in sorted(extra):
    print(f"  {col}  ({db_columns[col]})")
if not extra:
    print("  None")

print("\n=== MISSING columns in DB (in model but not DB) ===")
for col in sorted(missing):
    print(f"  {col}  ({model_fields[col]})")
if not missing:
    print("  None")

print("\n=== MISMATCHED column types ===")
for col, m, d in mismatches:
    print(f"  {col}: model={m}, db={d}")
if not mismatches:
    print("  None")

print("\nDone.\n")
