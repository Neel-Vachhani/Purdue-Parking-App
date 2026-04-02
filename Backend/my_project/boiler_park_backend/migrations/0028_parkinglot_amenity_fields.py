from django.db import migrations, models
import django.contrib.postgres.fields


class Migration(migrations.Migration):

    dependencies = [
        ("boiler_park_backend", "0027_user_favorite_lot_alerts"),
    ]

    operations = [
        migrations.AddField(
            model_name="parkinglot",
            name="covered",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="parkinglot",
            name="shaded",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="parkinglot",
            name="ev_ports",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="parkinglot",
            name="accessible_spots",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="parkinglot",
            name="height_clearance_meters",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="parkinglot",
            name="amenities",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=50),
                blank=True,
                default=list,
                size=None,
            ),
        ),
    ]
