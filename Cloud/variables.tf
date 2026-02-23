variable project_id {
  description = "Project ID for GCP BoilerPark Project"
  type = string
  default = "project-5f0a2c25-0e02-4db9-956"
}

variable region {
  description = "Region to host GCP GCE instance"
  type = string
  default = "us-central1"
}

variable instance_name {
  description = "Name of GCE instance"
  type = string
  default = "databases-vm"
}

variable app_ports {
  description = "Ports to remain open for access to the API endpoints"
  type = list(string)
  default = ["7500", "22"]
}