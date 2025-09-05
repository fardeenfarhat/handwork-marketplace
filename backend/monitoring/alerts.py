"""
Monitoring and alerting system
Sends notifications when system health degrades
"""

import os
import json
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertStatus(Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    ACKNOWLEDGED = "acknowledged"

@dataclass
class Alert:
    id: str
    title: str
    description: str
    severity: AlertSeverity
    status: AlertStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    metadata: Dict = None

class AlertManager:
    def __init__(self):
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.notification_channels = self._setup_notification_channels()
        
        # Alert thresholds
        self.thresholds = {
            'cpu_percent': 85.0,
            'memory_percent': 90.0,
            'disk_percent': 85.0,
            'database_response_time_ms': 1000.0,
            'external_service_timeout_ms': 5000.0
        }
    
    def _setup_notification_channels(self) -> Dict:
        """Setup notification channels from environment variables"""
        channels = {}
        
        # Slack webhook
        slack_webhook = os.getenv('SLACK_WEBHOOK_URL')
        if slack_webhook:
            channels['slack'] = {
                'type': 'slack',
                'webhook_url': slack_webhook,
                'enabled': True
            }
        
        # Email notifications
        sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        alert_email = os.getenv('ALERT_EMAIL')
        if sendgrid_api_key and alert_email:
            channels['email'] = {
                'type': 'email',
                'api_key': sendgrid_api_key,
                'to_email': alert_email,
                'from_email': os.getenv('SENDGRID_FROM_EMAIL', 'alerts@handworkmarketplace.com'),
                'enabled': True
            }
        
        # PagerDuty integration
        pagerduty_key = os.getenv('PAGERDUTY_INTEGRATION_KEY')
        if pagerduty_key:
            channels['pagerduty'] = {
                'type': 'pagerduty',
                'integration_key': pagerduty_key,
                'enabled': True
            }
        
        # Discord webhook
        discord_webhook = os.getenv('DISCORD_WEBHOOK_URL')
        if discord_webhook:
            channels['discord'] = {
                'type': 'discord',
                'webhook_url': discord_webhook,
                'enabled': True
            }
        
        return channels
    
    async def check_system_health(self, health_data: Dict) -> List[Alert]:
        """Check system health and generate alerts"""
        new_alerts = []
        
        # Check database health
        if 'database' in health_data:
            db_data = health_data['database']
            
            if db_data.get('status') != 'healthy':
                alert = self._create_alert(
                    'database_unhealthy',
                    'Database Health Critical',
                    f"Database is unhealthy: {db_data.get('status')}",
                    AlertSeverity.CRITICAL,
                    {'database_status': db_data.get('status')}
                )
                new_alerts.append(alert)
            
            elif db_data.get('connection_time_ms', 0) > self.thresholds['database_response_time_ms']:
                alert = self._create_alert(
                    'database_slow',
                    'Database Response Time High',
                    f"Database response time is {db_data.get('connection_time_ms')}ms",
                    AlertSeverity.MEDIUM,
                    {'response_time_ms': db_data.get('connection_time_ms')}
                )
                new_alerts.append(alert)
        
        # Check system metrics
        if 'system' in health_data:
            system_data = health_data['system']
            
            # CPU usage
            cpu_percent = system_data.get('cpu_percent', 0)
            if cpu_percent > self.thresholds['cpu_percent']:
                severity = AlertSeverity.CRITICAL if cpu_percent > 95 else AlertSeverity.HIGH
                alert = self._create_alert(
                    'high_cpu_usage',
                    'High CPU Usage',
                    f"CPU usage is {cpu_percent}%",
                    severity,
                    {'cpu_percent': cpu_percent}
                )
                new_alerts.append(alert)
            
            # Memory usage
            memory_percent = system_data.get('memory_percent', 0)
            if memory_percent > self.thresholds['memory_percent']:
                severity = AlertSeverity.CRITICAL if memory_percent > 95 else AlertSeverity.HIGH
                alert = self._create_alert(
                    'high_memory_usage',
                    'High Memory Usage',
                    f"Memory usage is {memory_percent}%",
                    severity,
                    {'memory_percent': memory_percent}
                )
                new_alerts.append(alert)
            
            # Disk usage
            disk_percent = system_data.get('disk_percent', 0)
            if disk_percent > self.thresholds['disk_percent']:
                severity = AlertSeverity.CRITICAL if disk_percent > 95 else AlertSeverity.HIGH
                alert = self._create_alert(
                    'high_disk_usage',
                    'High Disk Usage',
                    f"Disk usage is {disk_percent}%",
                    severity,
                    {'disk_percent': disk_percent}
                )
                new_alerts.append(alert)
        
        # Check external services
        if 'external_services' in health_data:
            for service in health_data['external_services']:
                if service.get('status') != 'healthy':
                    alert = self._create_alert(
                        f"external_service_{service.get('service')}_down",
                        f"External Service Down: {service.get('service')}",
                        f"Service {service.get('service')} is {service.get('status')}",
                        AlertSeverity.HIGH,
                        {'service': service.get('service'), 'status': service.get('status')}
                    )
                    new_alerts.append(alert)
        
        # Process new alerts
        for alert in new_alerts:
            await self._process_alert(alert)
        
        return new_alerts
    
    def _create_alert(self, alert_id: str, title: str, description: str, 
                     severity: AlertSeverity, metadata: Dict = None) -> Alert:
        """Create a new alert"""
        return Alert(
            id=alert_id,
            title=title,
            description=description,
            severity=severity,
            status=AlertStatus.ACTIVE,
            created_at=datetime.now(),
            metadata=metadata or {}
        )
    
    async def _process_alert(self, alert: Alert) -> None:
        """Process a new alert"""
        # Check if alert already exists
        if alert.id in self.active_alerts:
            # Update existing alert
            existing_alert = self.active_alerts[alert.id]
            existing_alert.metadata.update(alert.metadata)
            return
        
        # Add to active alerts
        self.active_alerts[alert.id] = alert
        self.alert_history.append(alert)
        
        logger.warning(f"New alert: {alert.title} - {alert.description}")
        
        # Send notifications
        await self._send_notifications(alert)
    
    async def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an active alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.RESOLVED
            alert.resolved_at = datetime.now()
            
            del self.active_alerts[alert_id]
            
            logger.info(f"Alert resolved: {alert.title}")
            
            # Send resolution notification
            await self._send_resolution_notification(alert)
            return True
        
        return False
    
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an active alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_at = datetime.now()
            
            logger.info(f"Alert acknowledged: {alert.title}")
            return True
        
        return False
    
    async def _send_notifications(self, alert: Alert) -> None:
        """Send alert notifications to all configured channels"""
        tasks = []
        
        for channel_name, channel_config in self.notification_channels.items():
            if not channel_config.get('enabled', True):
                continue
            
            if channel_config['type'] == 'slack':
                tasks.append(self._send_slack_notification(alert, channel_config))
            elif channel_config['type'] == 'email':
                tasks.append(self._send_email_notification(alert, channel_config))
            elif channel_config['type'] == 'pagerduty':
                tasks.append(self._send_pagerduty_notification(alert, channel_config))
            elif channel_config['type'] == 'discord':
                tasks.append(self._send_discord_notification(alert, channel_config))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_slack_notification(self, alert: Alert, config: Dict) -> None:
        """Send Slack notification"""
        try:
            color_map = {
                AlertSeverity.LOW: "#36a64f",
                AlertSeverity.MEDIUM: "#ff9500",
                AlertSeverity.HIGH: "#ff0000",
                AlertSeverity.CRITICAL: "#8B0000"
            }
            
            payload = {
                "attachments": [{
                    "color": color_map.get(alert.severity, "#ff0000"),
                    "title": f"🚨 {alert.title}",
                    "text": alert.description,
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert.severity.value.upper(),
                            "short": True
                        },
                        {
                            "title": "Time",
                            "value": alert.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                            "short": True
                        },
                        {
                            "title": "Environment",
                            "value": os.getenv('ENVIRONMENT', 'unknown'),
                            "short": True
                        }
                    ],
                    "footer": "Handwork Marketplace Monitoring",
                    "ts": int(alert.created_at.timestamp())
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(config['webhook_url'], json=payload) as response:
                    if response.status != 200:
                        logger.error(f"Failed to send Slack notification: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")
    
    async def _send_discord_notification(self, alert: Alert, config: Dict) -> None:
        """Send Discord notification"""
        try:
            color_map = {
                AlertSeverity.LOW: 0x36a64f,
                AlertSeverity.MEDIUM: 0xff9500,
                AlertSeverity.HIGH: 0xff0000,
                AlertSeverity.CRITICAL: 0x8B0000
            }
            
            payload = {
                "embeds": [{
                    "title": f"🚨 {alert.title}",
                    "description": alert.description,
                    "color": color_map.get(alert.severity, 0xff0000),
                    "fields": [
                        {
                            "name": "Severity",
                            "value": alert.severity.value.upper(),
                            "inline": True
                        },
                        {
                            "name": "Environment",
                            "value": os.getenv('ENVIRONMENT', 'unknown'),
                            "inline": True
                        }
                    ],
                    "timestamp": alert.created_at.isoformat(),
                    "footer": {
                        "text": "Handwork Marketplace Monitoring"
                    }
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(config['webhook_url'], json=payload) as response:
                    if response.status not in [200, 204]:
                        logger.error(f"Failed to send Discord notification: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error sending Discord notification: {e}")
    
    async def _send_email_notification(self, alert: Alert, config: Dict) -> None:
        """Send email notification via SendGrid"""
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail
            
            sg = sendgrid.SendGridAPIClient(api_key=config['api_key'])
            
            subject = f"[{alert.severity.value.upper()}] {alert.title}"
            
            html_content = f"""
            <h2>Alert: {alert.title}</h2>
            <p><strong>Severity:</strong> {alert.severity.value.upper()}</p>
            <p><strong>Description:</strong> {alert.description}</p>
            <p><strong>Time:</strong> {alert.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            <p><strong>Environment:</strong> {os.getenv('ENVIRONMENT', 'unknown')}</p>
            
            <h3>Metadata:</h3>
            <pre>{json.dumps(alert.metadata, indent=2)}</pre>
            """
            
            message = Mail(
                from_email=config['from_email'],
                to_emails=config['to_email'],
                subject=subject,
                html_content=html_content
            )
            
            response = sg.send(message)
            
            if response.status_code not in [200, 202]:
                logger.error(f"Failed to send email notification: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
    
    async def _send_pagerduty_notification(self, alert: Alert, config: Dict) -> None:
        """Send PagerDuty notification"""
        try:
            payload = {
                "routing_key": config['integration_key'],
                "event_action": "trigger",
                "dedup_key": alert.id,
                "payload": {
                    "summary": alert.title,
                    "source": "handwork-marketplace",
                    "severity": alert.severity.value,
                    "component": "backend",
                    "group": "infrastructure",
                    "class": "system-health",
                    "custom_details": {
                        "description": alert.description,
                        "environment": os.getenv('ENVIRONMENT', 'unknown'),
                        "metadata": alert.metadata
                    }
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=payload
                ) as response:
                    if response.status != 202:
                        logger.error(f"Failed to send PagerDuty notification: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error sending PagerDuty notification: {e}")
    
    async def _send_resolution_notification(self, alert: Alert) -> None:
        """Send alert resolution notifications"""
        # Only send to critical channels for resolutions
        if alert.severity in [AlertSeverity.HIGH, AlertSeverity.CRITICAL]:
            resolution_alert = Alert(
                id=f"{alert.id}_resolved",
                title=f"✅ RESOLVED: {alert.title}",
                description=f"Alert has been resolved: {alert.description}",
                severity=AlertSeverity.LOW,
                status=AlertStatus.RESOLVED,
                created_at=datetime.now(),
                metadata=alert.metadata
            )
            
            await self._send_notifications(resolution_alert)
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts"""
        return list(self.active_alerts.values())
    
    def get_alert_history(self, hours: int = 24) -> List[Alert]:
        """Get alert history for the specified number of hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [alert for alert in self.alert_history if alert.created_at >= cutoff_time]

# Global alert manager instance
alert_manager = AlertManager()