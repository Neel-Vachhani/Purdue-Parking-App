data "google_client_openid_userinfo" "me" {
}

data "google_compute_zones" "available" {
  region = var.region
}

