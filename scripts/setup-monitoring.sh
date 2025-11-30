#!/bin/bash

# OpenTable Clone - Monitoring Setup Script
# Sets up Prometheus and Grafana with dashboards and alerts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 OpenTable Clone - Monitoring Setup${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Configuration
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASS="${GRAFANA_PASS:-admin123}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

# Create monitoring directories
echo -e "${YELLOW}📁 Creating monitoring directories...${NC}"
mkdir -p monitoring/prometheus/config
mkdir -p monitoring/prometheus/rules
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/provisioning/datasources

# Create Prometheus configuration
echo -e "${YELLOW}⚙️  Setting up Prometheus configuration...${NC}"
cat > monitoring/prometheus/config/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "/etc/prometheus/rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'opentable-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/api/metrics'
    scrape_interval: 10s

  - job_name: 'opentable-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

# Create alert rules
echo -e "${YELLOW}🚨 Setting up alert rules...${NC}"
cat > monitoring/prometheus/rules/opentable-alerts.yml << EOF
groups:
- name: opentable-critical
  rules:
  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service {{ \$labels.job }} is down"
      description: "{{ \$labels.job }} has been down for more than 1 minute."

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ \$value }} errors per second over 5 minutes."

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ \$value }} seconds."

  - alert: DatabaseConnectionHigh
    expr: postgresql_connections > 80
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Database connection count high"
      description: "PostgreSQL connection count is {{ \$value }}, approaching limit."

  - alert: RedisMemoryHigh
    expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Redis memory usage high"
      description: "Redis memory usage is {{ \$value | humanizePercentage }}."

  - alert: DiskSpaceHigh
    expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Disk space usage high"
      description: "Disk usage is {{ \$value | humanizePercentage }} on {{ \$labels.device }}."

- name: opentable-business
  rules:
  - alert: ReservationFailureRate
    expr: rate(reservation_failures_total[5m]) / rate(reservation_attempts_total[5m]) > 0.05
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "High reservation failure rate"
      description: "Reservation failure rate is {{ \$value | humanizePercentage }}."

  - alert: NotificationDeliveryFailure
    expr: rate(notification_delivery_failures_total[5m]) > 10
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High notification delivery failure rate"
      description: "Notification delivery failures: {{ \$value }} per second."

  - alert: BlockchainTransactionFailure
    expr: rate(blockchain_transaction_failures_total[5m]) > 1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Blockchain transaction failures detected"
      description: "Blockchain transaction failure rate: {{ \$value }} per second."
EOF

# Create Grafana datasource configuration
echo -e "${YELLOW}📈 Setting up Grafana datasources...${NC}"
cat > monitoring/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

# Create dashboard provisioning configuration
cat > monitoring/grafana/provisioning/dashboards/dashboards.yml << EOF
apiVersion: 1

providers:
  - name: 'OpenTable Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/dashboards
EOF

# Create main application dashboard
echo -e "${YELLOW}📊 Creating Grafana dashboards...${NC}"
cat > monitoring/grafana/dashboards/opentable-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "OpenTable Clone - Overview",
    "tags": ["opentable", "overview"],
    "style": "dark",
    "timezone": "browser",
    "refresh": "30s",
    "schemaVersion": 27,
    "version": 1,
    "panels": [
      {
        "id": 1,
        "title": "Service Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{job}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Active Reservations",
        "type": "stat",
        "targets": [
          {
            "expr": "active_reservations_total",
            "legendFormat": "Active Reservations"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    }
  }
}
EOF

# Create system metrics dashboard
cat > monitoring/grafana/dashboards/system-metrics.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "OpenTable Clone - System Metrics",
    "tags": ["opentable", "system"],
    "style": "dark",
    "timezone": "browser",
    "refresh": "30s",
    "schemaVersion": 27,
    "version": 1,
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}}"
          }
        ],
        "yAxes": [
          {"max": 100, "min": 0, "unit": "percent"}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory Usage %"
          }
        ],
        "yAxes": [
          {"max": 100, "min": 0, "unit": "percent"}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Disk I/O",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(node_disk_reads_completed_total[5m])",
            "legendFormat": "Reads/sec"
          },
          {
            "expr": "rate(node_disk_writes_completed_total[5m])",
            "legendFormat": "Writes/sec"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Network I/O",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(node_network_receive_bytes_total[5m])",
            "legendFormat": "Received"
          },
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])",
            "legendFormat": "Transmitted"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    }
  }
}
EOF

# Function to wait for Grafana to be ready
wait_for_grafana() {
    echo -n "Waiting for Grafana to be ready..."
    while ! curl -f -s "$GRAFANA_URL/api/health" >/dev/null 2>&1; do
        echo -n "."
        sleep 2
    done
    echo -e " ${GREEN}✅ Ready${NC}"
}

# Import dashboards to Grafana
import_dashboards() {
    echo -e "${YELLOW}📊 Importing dashboards to Grafana...${NC}"
    
    wait_for_grafana
    
    for dashboard_file in monitoring/grafana/dashboards/*.json; do
        if [[ -f "$dashboard_file" ]]; then
            dashboard_name=$(basename "$dashboard_file" .json)
            echo -n "Importing $dashboard_name... "
            
            if curl -X POST \
                -H "Content-Type: application/json" \
                -u "$GRAFANA_USER:$GRAFANA_PASS" \
                -d @"$dashboard_file" \
                "$GRAFANA_URL/api/dashboards/db" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Success${NC}"
            else
                echo -e "${RED}❌ Failed${NC}"
            fi
        fi
    done
}

# Create alertmanager configuration
echo -e "${YELLOW}🚨 Setting up Alertmanager...${NC}"
mkdir -p monitoring/alertmanager
cat > monitoring/alertmanager/alertmanager.yml << EOF
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@opentable-clone.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  email_configs:
  - to: 'admin@opentable-clone.com'
    subject: '[OpenTable Alert] {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

# Create monitoring startup script
echo -e "${YELLOW}🚀 Creating monitoring startup script...${NC}"
cat > scripts/start-monitoring.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting monitoring services..."

# Start Prometheus and Grafana
docker-compose up -d prometheus grafana alertmanager

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Import dashboards
./scripts/setup-monitoring.sh --import-only

echo "✅ Monitoring services started!"
echo "📊 Grafana: http://localhost:3000 (admin/admin123)"
echo "📈 Prometheus: http://localhost:9090"
echo "🚨 Alertmanager: http://localhost:9093"
EOF

chmod +x scripts/start-monitoring.sh

# Check if this is import-only mode
if [[ "$1" == "--import-only" ]]; then
    import_dashboards
    exit 0
fi

echo -e "${GREEN}✅ Monitoring setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Start monitoring services: ./scripts/start-monitoring.sh"
echo "2. Access Grafana at: $GRAFANA_URL (admin/admin123)"
echo "3. Access Prometheus at: $PROMETHEUS_URL"
echo "4. Configure notification channels in Grafana"
echo ""
echo -e "${YELLOW}📁 Created files:${NC}"
echo "- monitoring/prometheus/config/prometheus.yml"
echo "- monitoring/prometheus/rules/opentable-alerts.yml" 
echo "- monitoring/grafana/dashboards/*.json"
echo "- monitoring/grafana/provisioning/"
echo "- monitoring/alertmanager/alertmanager.yml"
echo "- scripts/start-monitoring.sh"
