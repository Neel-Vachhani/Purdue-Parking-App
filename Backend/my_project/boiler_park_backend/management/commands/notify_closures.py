from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Scan upcoming lot closures and send notifications (stub)."

    def handle(self, *args, **options):
        # TODO: query LotEvent and select closures for tomorrow
        self.stdout.write(self.style.SUCCESS("notify_closures: stub run complete."))


