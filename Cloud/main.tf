resource "google_compute_firewall" "api_firewall" {
  name = "api-firewall"
  network = "default"

  allow {
    protocol = "tcp"
    ports = var.app_ports
  }

  target_tags = ["api-node"]
  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_instance" "api_instance" {
  name = var.instance_name
  machine_type = "e2-micro"
  zone = data.google_compute_zones.available.names[0]
  tags = ["api-node"]
  desired_status = "RUNNING"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size = 10
    }
  }

  network_interface {
    network = "default"
    access_config {
    }
  }
}

output "external_ip" {
  value = google_compute_instance.api_instance.network_interface[0].access_config[0].nat_ip
}