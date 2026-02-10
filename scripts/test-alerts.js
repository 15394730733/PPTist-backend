#!/usr/bin/env node
/**
 * Alert Testing Tool
 *
 * Test Prometheus alerts by triggering them
 *
 * Usage:
 *   node scripts/test-alerts.js <alert-name>
 *
 * Examples:
 *   node scripts/test-alerts.js HighErrorRate
 *   node scripts/test-alerts.js CriticalLatency
 */

import http from 'http';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9091';

// Alert test cases
const ALERT_TESTS = {
  HighErrorRate: {
    expression: 'rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])',
    description: 'High error rate',
    testValue: 0.1, // 10%
  },
  HighLatency: {
    expression: 'histogram_quantile(0.95, http_request_duration_seconds)',
    description: 'High API latency',
    testValue: 6, // 6 seconds
  },
  CriticalLatency: {
    expression: 'histogram_quantile(0.95, http_request_duration_seconds)',
    description: 'Critical API latency',
    testValue: 16, // 16 seconds
  },
  QueueBacklog: {
    expression: 'queue_size{state="queued"}',
    description: 'Queue backlog',
    testValue: 150, // 150 tasks
  },
  CriticalQueueBacklog: {
    expression: 'queue_size{state="queued"}',
    description: 'Critical queue backlog',
    testValue: 600, // 600 tasks
  },
  HighMemoryUsage: {
    expression: 'process_resident_memory_bytes / node_memory_MemTotal_bytes',
    description: 'High memory usage',
    testValue: 0.85, // 85%
  },
  HighCPUUsage: {
    expression: 'rate(process_cpu_seconds_total[5m]) * 100',
    description: 'High CPU usage',
    testValue: 85, // 85%
  },
  LowDiskSpace: {
    expression: 'node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}',
    description: 'Low disk space',
    testValue: 0.05, // 5%
  },
  LowCacheHitRate: {
    expression: 'rate(cache_hits_total[10m]) / (rate(cache_hits_total[10m]) + rate(cache_misses_total[10m]))',
    description: 'Low cache hit rate',
    testValue: 0.4, // 40%
  },
  SlowConversion: {
    expression: 'histogram_quantile(0.95, conversion_duration_seconds)',
    description: 'Slow conversion time',
    testValue: 35, // 35 seconds
  },
};

/**
 * Query Prometheus
 */
function queryPrometheus(query) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PROMETHEUS_URL}/api/v1/query`);
    url.searchParams.set('query', query);

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success') {
            resolve(json.data);
          } else {
            reject(new Error(json.error || 'Query failed'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get alert rules
 */
function getAlertRules() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PROMETHEUS_URL}/api/v1/rules`);

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success') {
            resolve(json.data.groups);
          } else {
            reject(new Error(json.error || 'Failed to get rules'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get active alerts
 */
function getAlerts() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PROMETHEUS_URL}/api/v1/alerts`);

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success') {
            resolve(json.data.alerts);
          } else {
            reject(new Error(json.error || 'Failed to get alerts'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Test specific alert
 */
async function testAlert(alertName) {
  const alertTest = ALERT_TESTS[alertName];

  if (!alertTest) {
    console.error(`❌ Unknown alert: ${alertName}`);
    console.log('\nAvailable alerts:');
    Object.keys(ALERT_TESTS).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }

  console.log(`\n📊 Testing Alert: ${alertName}`);
  console.log(`   Description: ${alertTest.description}`);
  console.log(`   Expression: ${alertTest.expression}`);
  console.log('');

  try {
    // Query current value
    console.log('⏳ Querying Prometheus...');
    const result = await queryPrometheus(alertTest.expression);

    if (result.result.length > 0) {
      const value = result.result[0].value[1];
      console.log(`   Current value: ${value}`);

      // Check if alert would fire
      const numericValue = parseFloat(value);
      const threshold = alertTest.testValue;

      console.log(`   Threshold: ${threshold}`);
      console.log(`   Status: ${numericValue > threshold ? '🔴 WOULD FIRE' : '✅ OK'}`);

      // Get active alerts
      console.log('\n⏳ Checking active alerts...');
      const alerts = await getAlerts();

      const matchingAlerts = alerts.filter(alert => alert.labels.alertname === alertName);

      if (matchingAlerts.length > 0) {
        console.log(`   🚨 Active instances: ${matchingAlerts.length}`);
        matchingAlerts.forEach(alert => {
          console.log(`      - State: ${alert.state}`);
          console.log(`        Severity: ${alert.labels.severity}`);
        });
      } else {
        console.log('   ✅ No active instances');
      }
    } else {
      console.log('   ⚠️  No data available');
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(`   Make sure Prometheus is running at ${PROMETHEUS_URL}`);
    process.exit(1);
  }
}

/**
 * List all alert rules
 */
async function listAlertRules() {
  console.log('\n📋 Alert Rules\n');

  try {
    const groups = await getAlertRules();

    for (const group of groups) {
      console.log(`\n📦 Group: ${group.name}`);
      console.log(`   Interval: ${group.interval}`);

      for (const rule of group.rules) {
        if (rule.type === 'alerting') {
          console.log(`\n   🚨 ${rule.name}`);
          console.log(`      Severity: ${rule.labels.severity}`);
          console.log(`      For: ${rule.for}`);
          console.log(`      Expr: ${rule.query}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show active alerts
 */
async function showActiveAlerts() {
  console.log('\n🚨 Active Alerts\n');

  try {
    const alerts = await getAlerts();

    if (alerts.length === 0) {
      console.log('   ✅ No active alerts');
      return;
    }

    // Group by severity
    const bySeverity = {
      critical: [],
      warning: [],
      info: [],
    };

    alerts.forEach(alert => {
      const severity = alert.labels.severity || 'unknown';
      if (bySeverity[severity]) {
        bySeverity[severity].push(alert);
      }
    });

    // Display alerts
    ['critical', 'warning', 'info'].forEach(severity => {
      const alertsList = bySeverity[severity];

      if (alertsList.length > 0) {
        console.log(`\n${severity.toUpperCase()} (${alertsList.length}):`);

        alertsList.forEach(alert => {
          console.log(`   📌 ${alert.labels.alertname}`);
          console.log(`      State: ${alert.state}`);
          console.log(`      Component: ${alert.labels.component || 'unknown'}`);
          console.log(`      Summary: ${alert.annotations.summary}`);
        });
      }
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('📊 PPTist Alert Testing Tool\n');
    console.log('Usage:');
    console.log('  node scripts/test-alerts.js <alert-name>');
    console.log('  node scripts/test-alerts.js --list');
    console.log('  node scripts/test-alerts.js --active');
    console.log('\nAvailable alerts:');
    Object.keys(ALERT_TESTS).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(0);
  }

  const command = args[0];

  if (command === '--list') {
    await listAlertRules();
  } else if (command === '--active') {
    await showActiveAlerts();
  } else {
    await testAlert(command);
  }

  console.log('\n✅ Done!\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
