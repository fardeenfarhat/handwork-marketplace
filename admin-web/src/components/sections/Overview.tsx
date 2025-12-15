import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { apiService } from '../../services/apiService';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface PlatformMetrics {
  total_users: number;
  total_workers: number;
  total_clients: number;
  active_users_30d: number;
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  total_payments: number;
  platform_revenue: number;
  average_job_value: number;
  user_growth_rate: number;
  job_completion_rate: number;
}

interface JobCategoryStats {
  category: string;
  job_count: number;
  avg_budget: number;
  completed_count: number;
}

const Overview: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [categoryStats, setCategoryStats] = useState<JobCategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, categoryData] = await Promise.all([
        apiService.getPlatformMetrics(),
        apiService.getJobCategoriesStats(),
      ]);
      setMetrics(metricsData);
      setCategoryStats(categoryData);
    } catch (err: any) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const jobCategoriesChartData = {
    labels: categoryStats.map(stat => stat.category.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        data: categoryStats.map(stat => stat.job_count),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
        hoverBackgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  };

  const budgetChartData = {
    labels: categoryStats.map(stat => stat.category.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        label: 'Average Budget by Category',
        data: categoryStats.map(stat => stat.avg_budget),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="content-section active">
        <div className="loading">
          <i className="fas fa-spinner"></i>
          Loading dashboard data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-section active">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="content-section active">
      <div className="section-header">
        <h1 className="section-title">Dashboard Overview</h1>
        <p className="section-subtitle">Platform metrics and performance insights</p>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.total_users || 0}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-briefcase"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.active_jobs || 0}</h3>
            <p>Active Jobs</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="metric-content">
            <h3>{formatCurrency(metrics?.platform_revenue || 0)}</h3>
            <p>Platform Revenue</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="metric-content">
            <h3>{formatCurrency(metrics?.total_payments || 0)}</h3>
            <p>Total Payments</p>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-hammer"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.total_workers || 0}</h3>
            <p>Total Workers</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-user-tie"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.total_clients || 0}</h3>
            <p>Total Clients</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.completed_jobs || 0}</h3>
            <p>Completed Jobs</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-user-clock"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.active_users_30d || 0}</h3>
            <p>Active Users (30d)</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Job Categories Distribution</h3>
          <div style={{ height: '300px' }}>
            <Doughnut data={jobCategoriesChartData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <h3>Average Budget by Category</h3>
          <div style={{ height: '300px' }}>
            <Bar data={budgetChartData} options={barChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;