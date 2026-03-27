from django.db import migrations, models


def default_json():
    return {}


class Migration(migrations.Migration):

    dependencies = [
        ("boiler_park_backend", "0026_userpark"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="favorite_lot_alerts_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="favorite_lot_threshold",
            field=models.PositiveSmallIntegerField(default=25),
        ),
        migrations.AddField(
            model_name="user",
            name="favorite_lot_cooldown_minutes",
            field=models.PositiveSmallIntegerField(default=5),
        ),
        migrations.AddField(
            model_name="user",
            name="favorite_lot_last_notified",
            field=models.JSONField(blank=True, default=default_json, null=True),
        ),
        migrations.AddField(
            model_name="parkinglot",
            name="capacity",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
