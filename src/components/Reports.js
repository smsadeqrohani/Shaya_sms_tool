import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import './Reports.css';

const Reports = ({ onLogout, currentUser }) => {
  const navigate = useNavigate();
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Debug logging
  console.log('Reports component rendered with:', { currentUser });

  // Convex queries and mutations
  const campaigns = useQuery(api.sms.getAllCampaignStats);
  const campaignLogs = useQuery(
    api.sms.getCampaignLogs,
    selectedCampaign ? { campaignId: selectedCampaign } : "skip"
  );
  const scheduledFunctions = useQuery(
    api.sms.getScheduledFunctions,
    selectedCampaign ? { campaignId: selectedCampaign } : "skip"
  );
  const cancelCampaignMutation = useMutation(api.sms.cancelCampaign);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'scheduled':
        return 'info';
      case 'cancelled':
        return 'error';
      case 'failed':
        return 'error';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '⏳';
      case 'scheduled':
        return '📅';
      case 'cancelled':
        return '❌';
      case 'failed':
        return '❌';
      default:
        return '⏸️';
    }
  };

  const getSMSStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'partial_success':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const calculateSuccessRate = (stats) => {
    if (!stats || stats.totalSent === 0) return 0;
    return Math.round((stats.totalSuccess / stats.totalSent) * 100);
  };

  const formatResponseTime = (time) => {
    if (!time) return 'N/A';
    return `${time}ms`;
  };



  // Sorting and pagination logic
  const sortedCampaigns = campaigns ? [...campaigns].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'stats') {
      aValue = a.stats?.totalSuccess || 0;
      bValue = b.stats?.totalSuccess || 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  }) : [];

  const totalPages = Math.ceil((sortedCampaigns.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCampaigns = sortedCampaigns.slice(startIndex, endIndex);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleViewDetails = (campaign) => {
    setSelectedCampaign(campaign._id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCampaign(null);
  };

  const handleCancelCampaign = async (campaignId) => {
    try {
      await cancelCampaignMutation({ campaignId });
      console.log('Campaign cancelled successfully');
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      alert('Error cancelling campaign: ' + error.message);
    }
  };

  return (
    <div className="reports-container">
      <header className="reports-header glass">
        <div className="header-content">
          <h1 className="reports-title">📊 Campaign Reports</h1>
          <div className="header-actions">
            <span className="user-info">
              {currentUser?.name || currentUser?.phoneNumber} ({currentUser?.phoneNumber})
            </span>
            <div className="nav-buttons">
              <button onClick={() => navigate('/dashboard')} className="btn btn-outline btn-sm">
                📱 Dashboard
              </button>
              <button onClick={onLogout} className="btn btn-outline">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="reports-main">
        <div className="reports-content">
          {/* Table Header */}
          <div className="table-header">
            <div className="table-info">
              <h2>Campaign History</h2>
              <span className="total-count">
                {campaigns ? `${campaigns.length} campaigns` : 'Loading...'}
              </span>
            </div>
            <div className="table-controls">
              <select 
                value={`${sortBy}-${sortOrder}`} 
                onChange={(e) => {
                  const [column, order] = e.target.value.split('-');
                  setSortBy(column);
                  setSortOrder(order);
                }}
                className="sort-select"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="stats-desc">Most Successful</option>
                <option value="stats-asc">Least Successful</option>
                <option value="tag-asc">Tag A-Z</option>
                <option value="tag-desc">Tag Z-A</option>
              </select>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="table-container">
            <table className="campaigns-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('tag')} className="sortable">
                    Tag {sortBy === 'tag' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Message</th>
                  <th onClick={() => handleSort('createdAt')} className="sortable">
                    Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Status</th>
                  <th>Numbers</th>
                  <th onClick={() => handleSort('stats')} className="sortable">
                    Success Rate {sortBy === 'stats' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Performance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentCampaigns.map((campaign) => (
                  <tr key={campaign._id} className="campaign-row">
                    <td className="campaign-tag">
                      <span className="tag-icon">🏷️</span>
                      {campaign.tag}
                    </td>
                    <td className="campaign-message">
                      <div className="message-preview">
                        {campaign.message.length > 50 
                          ? campaign.message.substring(0, 50).replace(/\n/g, ' ') + '...' 
                          : campaign.message.replace(/\n/g, ' ')
                        }
                      </div>
                    </td>
                    <td className="campaign-date">
                      {formatDate(campaign.createdAt)}
                    </td>
                    <td className="campaign-status">
                      <span className={`status-badge ${getStatusColor(campaign.status)}`}>
                        {getStatusIcon(campaign.status)} {campaign.status}
                      </span>
                    </td>
                    <td className="campaign-numbers">
                      {campaign.totalNumbers} numbers
                    </td>
                    <td className="success-rate">
                      {campaign.stats ? (
                        <div className="rate-info">
                          <span className="rate-percentage">
                            {calculateSuccessRate(campaign.stats)}%
                          </span>
                          <span className="rate-details">
                            {campaign.stats.totalSuccess}/{campaign.stats.totalSent}
                          </span>
                        </div>
                      ) : (
                        <span className="no-data">No data</span>
                      )}
                    </td>
                    <td className="performance">
                      {campaign.stats ? (
                        <div className="performance-info">
                          <div className="perf-item">
                            <span className="perf-label">Avg:</span>
                            <span className="perf-value">{formatResponseTime(campaign.stats.averageResponseTime)}</span>
                          </div>
                          <div className="perf-item">
                            <span className="perf-label">Requests:</span>
                            <span className="perf-value">{campaign.stats.requestCount || 0}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="no-data">No data</span>
                      )}
                    </td>
                    <td className="actions">
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleViewDetails(campaign)}
                          className="btn btn-primary btn-sm"
                        >
                          📋 Details
                        </button>
                        {(campaign.status === 'pending' || campaign.status === 'scheduled' || campaign.status === 'in_progress') && (
                          <button 
                            onClick={() => handleCancelCampaign(campaign._id)}
                            className="btn btn-outline btn-sm cancel-btn"
                            title="Cancel Campaign"
                          >
                            ❌ Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline btn-sm"
              >
                ← Previous
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-outline btn-sm"
              >
                Next →
              </button>
            </div>
          )}

          {!campaigns && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading campaigns...</p>
            </div>
          )}

          {campaigns && campaigns.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No Campaigns Found</h3>
              <p>Start sending SMS to see your campaign reports here.</p>
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      {showModal && selectedCampaign && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Campaign Details</h2>
              <button onClick={closeModal} className="modal-close">
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {(() => {
                const campaign = campaigns?.find(c => c._id === selectedCampaign);
                if (!campaign) return <p>Campaign not found</p>;

                return (
                  <div className="campaign-details-modal">
                    {/* Campaign Overview */}
                    <div className="detail-section">
                      <h3>Campaign Overview</h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Tag:</span>
                          <span className="detail-value">{campaign.tag}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Status:</span>
                          <span className={`detail-value status-${getStatusColor(campaign.status)}`}>
                            {getStatusIcon(campaign.status)} {campaign.status}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Created:</span>
                          <span className="detail-value">{formatDate(campaign.createdAt)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Total Numbers:</span>
                          <span className="detail-value">{campaign.totalNumbers}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Total Batches:</span>
                          <span className="detail-value">{campaign.totalBatches}</span>
                        </div>
                        {campaign.completedAt && (
                          <div className="detail-item">
                            <span className="detail-label">Completed:</span>
                            <span className="detail-value">{formatDate(campaign.completedAt)}</span>
                          </div>
                        )}
                        {campaign.scheduledFor && (
                          <div className="detail-item">
                            <span className="detail-label">Scheduled For:</span>
                            <span className="detail-value">{formatDate(campaign.scheduledFor)}</span>
                          </div>
                        )}
                        {campaign.isScheduled && (
                          <div className="detail-item">
                            <span className="detail-label">Scheduled Status:</span>
                            <span className="detail-value status-info">📅 Scheduled</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Statistics */}
                    {campaign.stats && (
                      <div className="detail-section">
                        <h3>Statistics</h3>
                        <div className="stats-grid">
                          <div className="stat-card">
                            <div className="stat-number">{campaign.stats.totalSent}</div>
                            <div className="stat-label">Total Sent</div>
                          </div>
                          <div className="stat-card success">
                            <div className="stat-number">{campaign.stats.totalSuccess}</div>
                            <div className="stat-label">Successful</div>
                          </div>
                          <div className="stat-card error">
                            <div className="stat-number">{campaign.stats.totalFailed}</div>
                            <div className="stat-label">Failed</div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-number">{calculateSuccessRate(campaign.stats)}%</div>
                            <div className="stat-label">Success Rate</div>
                          </div>
                          {campaign.stats.averageResponseTime && (
                            <div className="stat-card">
                              <div className="stat-number">{formatResponseTime(campaign.stats.averageResponseTime)}</div>
                              <div className="stat-label">Avg Response Time</div>
                            </div>
                          )}
                          <div className="stat-card">
                            <div className="stat-number">{campaign.stats.requestCount || 0}</div>
                            <div className="stat-label">API Requests</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="detail-section">
                      <h3>Message Content</h3>
                      <div className="message-content">
                        <pre className="message-text">{campaign.message}</pre>
                      </div>
                    </div>

                    {/* Scheduled Functions */}
                    {scheduledFunctions && scheduledFunctions.length > 0 && (
                      <div className="detail-section">
                        <h3>Scheduled Functions ({scheduledFunctions.length})</h3>
                        <div className="scheduled-functions">
                          {scheduledFunctions.map((func) => (
                            <div key={func._id} className="scheduled-function">
                              <div className="func-info">
                                <span className="func-name">{func.name}</span>
                                <span className="func-status status-{func.state.kind}">
                                  {func.state.kind}
                                </span>
                              </div>
                              <div className="func-details">
                                <span>Scheduled: {formatDate(func.scheduledTime)}</span>
                                {func.completedTime && (
                                  <span>Completed: {formatDate(func.completedTime)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Logs */}
                    {campaignLogs && (
                      <div className="detail-section">
                        <h3>Batch Logs ({campaignLogs.length})</h3>
                        <div className="logs-container">
                          {campaignLogs.length > 0 ? (
                            campaignLogs.map((log) => (
                              <div key={log._id} className={`log-entry ${log.status}`}>
                                <div className="log-header">
                                  <div className="log-status">
                                    {getSMSStatusIcon(log.status)} {log.status.toUpperCase()}
                                  </div>
                                  <div className="log-time">
                                    {formatTime(log.sentAt)}
                                  </div>
                                </div>
                                
                                <div className="log-details">
                                  <div className="log-basic">
                                    <div className="log-item">
                                      <span className="log-label">Batch:</span>
                                      <span className="log-value">{log.batchNumber}</span>
                                    </div>
                                    <div className="log-item">
                                      <span className="log-label">Numbers:</span>
                                      <span className="log-value">{log.batchSize}</span>
                                    </div>
                                    <div className="log-item">
                                      <span className="log-label">Response Time:</span>
                                      <span className="log-value">{formatResponseTime(log.responseTime)}</span>
                                    </div>
                                  </div>

                                  {log.errorMessage && (
                                    <div className="log-error">
                                      <div className="log-item">
                                        <span className="log-label">Error:</span>
                                        <span className="log-value error">{log.errorMessage}</span>
                                      </div>
                                    </div>
                                  )}

                                  {log.apiResponseData && (
                                    <div className="log-api-response">
                                      <details>
                                        <summary>API Response Details</summary>
                                        <pre className="api-response-data">
                                          {JSON.stringify(JSON.parse(log.apiResponseData), null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="no-logs">
                              <p>No logs found for this campaign</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports; 