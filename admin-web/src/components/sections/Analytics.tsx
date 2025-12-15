import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { apiService } from '../../services/apiService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

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

const Analytics: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [categoryStats, setCategoryStats] = useState<JobCategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [metricsData, categoryData] = await Promise.all([
        apiService.getPlatformMetrics(),
        apiService.getJobCategoriesStats(),
      ]);
      setMetrics(metricsData);
      setCategoryStats(categoryData);
    } catch (err: any) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const jobCountChartData = {
    labels: categoryStats.map(stat => stat.category.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        label: 'Jobs by Category',
        data: categoryStats.map(stat => stat.job_count || 0),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const budgetChartData = {
    labels: categoryStats.map(stat => stat.category.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        data: categoryStats.map(stat => stat.avg_budget || 0),
        backgroundColor: [
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

  const completedChartData = {
    labels: categoryStats.map(stat => stat.category.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        label: 'Completed Jobs',
        data: categoryStats.map(stat => stat.completed_count || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
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
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  if (loading) {
    return (
      <div className="content-section active">
        <div className="loading">
          <i className="fas fa-spinner"></i>
          Loading analytics...
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
        <h1 className="section-title">Analytics Dashboard</h1>
        <p className="section-subtitle">Platform performance metrics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="metric-content">
            <h3>{formatCurrency(metrics?.platform_revenue || 0)}</h3>
            <p>Platform Revenue</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.total_users || 0}</h3>
            <p>Total Platform Users</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-briefcase"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.completed_jobs || 0}</h3>
            <p>Completed Jobs</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <i className="fas fa-percentage"></i>
          </div>
          <div className="metric-content">
            <h3>{metrics?.job_completion_rate?.toFixed(1) || '0.0'}%</h3>
            <p>Job Completion Rate</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Jobs by Category</h3>
          <div style={{ height: '300px' }}>
            <Bar data={jobCountChartData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <h3>Average Budget Distribution</h3>
          <div style={{ height: '300px' }}>
            <Doughnut data={budgetChartData} options={doughnutOptions} />
          </div>
        </div>
        <div className="chart-container">
          <h3>Completed Jobs by Category</h3>
          <div style={{ height: '300px' }}>
            <Bar data={completedChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Category Stats Table */}
      <div className="data-table-container">
        <h3 style={{ padding: '1rem', margin: 0, borderBottom: '1px solid rgba(226, 232, 240, 0.5)' }}>Category Performance</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Jobs</th>
              <th>Average Budget</th>
              <th>Completed Jobs</th>
            </tr>
          </thead>
          <tbody>
            {categoryStats.map((stat) => (
              <tr key={stat.category}>
                <td>{stat.category.replace('_', ' ').toUpperCase()}</td>
                <td>{stat.job_count || 0}</td>
                <td>{formatCurrency(stat.avg_budget || 0)}</td>
                <td>{stat.completed_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics;