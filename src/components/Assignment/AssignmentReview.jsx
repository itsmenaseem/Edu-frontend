import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import api from '../../utils/api';
import Navbar from '../Layout/Navbar';
import DetectionResults from '../Detection/DetectionResults';
import Loader from '../Common/Loader';
import '../Common/Common.css';
import '../Dashboard/Dashboard.css';
import './Assignment.css';

const AssignmentReview = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentSub, setCurrentSub] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: '', remarks: '', marks: '' });
  const [selectedForDetection, setSelectedForDetection] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          api.get(`/assignments/${assignmentId}`),
          api.get(`/submissions/assignment/${assignmentId}`)
        ]);
        setAssignment(aRes.data.assignment);
        setSubmissions(sRes.data.submissions);
      } catch (err) {
        toast.error('Failed to load data');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [assignmentId, navigate]);

  const openReview = (sub, status) => {
    setCurrentSub(sub);
    setReviewForm({ status, remarks: '', marks: '' });
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (!reviewForm.remarks.trim()) {
      toast.warning('Remarks are mandatory!');
      return;
    }
    try {
      const res = await api.put(`/submissions/${currentSub._id}/review`, reviewForm);
      setSubmissions(prev => prev.map(s => s._id === currentSub._id ? res.data.submission : s));
      setShowReviewModal(false);
      toast.success('Review submitted!');
    } catch (err) {
      toast.error('Review failed');
    }
  };

  const handleDownloadSubmission = (sub) => {
    if (!sub?.filePath) {
      toast.info('No file was uploaded for this submission.');
      return;
    }
    window.open(sub.filePath, '_blank', 'noopener,noreferrer');
  };

  if (loading) return (<><Navbar /><div className="main-content"><Loader text="Loading..." /></div></>);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Navbar />
      <div className="main-content">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button onClick={() => navigate('/dashboard')} whileHover={{ x: -3 }} style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: 'none',
            border: 'none', color: 'var(--text-secondary)', fontSize: '13px',
            cursor: 'pointer', marginBottom: '18px', padding: 0
          }}><FiArrowLeft /> Back to Dashboard</motion.button>

          <div className="page-header">
            <h1>{assignment?.title}</h1>
            <p>{assignment?.course?.name} ({assignment?.course?.code})</p>
          </div>

          {submissions.length === 0 ? (
            <div className="empty-state"><h3>No submissions yet</h3></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="submissions-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Content</th>
                    <th>Status</th>
                    <th>AI Score</th>
                    <th>Plagiarism</th>
                    <th>Marks</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, i) => (
                    <motion.tr key={sub._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <td style={{ fontWeight: 600 }}>{sub.student?.name}</td>
                      <td>
                        {sub.content ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '120px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sub.content.substring(0, 40)}...
                          </span>
                        ) : sub.fileName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: 'var(--accent-1)' }}>📎 {sub.fileName}</span>
                            {sub.filePath && (
                              <motion.button
                                type="button"
                                className="action-btn pending-btn"
                                onClick={(e) => { e.stopPropagation(); handleDownloadSubmission(sub); }}
                                whileTap={{ scale: 0.9 }}
                                style={{ textTransform: 'none', letterSpacing: 0, padding: '5px 10px' }}
                              >
                                Download
                              </motion.button>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td><span className={`status-badge status-${sub.status}`}>{sub.status.replace('_', ' ')}</span></td>
                      <td>
                        {sub.aiDetection?.score != null ? (
                          <span style={{ color: sub.aiDetection.score > 50 ? 'var(--danger)' : 'var(--success)', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => setSelectedForDetection(selectedForDetection?._id === sub._id ? null : sub)}>
                            {sub.aiDetection.score}%
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {sub.plagiarism?.percentage != null ? (
                          <span style={{ color: sub.plagiarism.percentage > 30 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                            {sub.plagiarism.percentage}%
                          </span>
                        ) : '—'}
                      </td>
                      <td>{sub.marks ?? '—'}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {format(new Date(sub.submittedAt), 'MMM dd, HH:mm')}
                      </td>
                      <td>
                        <div className="action-btns">
                          <motion.button className="action-btn approve" onClick={() => openReview(sub, 'approved')} whileTap={{ scale: 0.9 }}>Approve</motion.button>
                          <motion.button className="action-btn reject" onClick={() => openReview(sub, 'rejected')} whileTap={{ scale: 0.9 }}>Reject</motion.button>
                          <motion.button className="action-btn improve" onClick={() => openReview(sub, 'need_improvement')} whileTap={{ scale: 0.9 }}>Improve</motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedForDetection && (
            <motion.div style={{ marginTop: '20px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <DetectionResults submission={selectedForDetection} />
            </motion.div>
          )}
        </motion.div>

        {/* Review Modal */}
        <AnimatePresence>
          {showReviewModal && currentSub && (
            <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
              <motion.div className="modal-content" onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}>
                <div className="modal-header">
                  <h2>Review Submission</h2>
                  <button className="modal-close" onClick={() => setShowReviewModal(false)}><FiX /></button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Student: <strong>{currentSub.student?.name}</strong> · Status: <strong style={{ color: 'var(--accent-1)', textTransform: 'capitalize' }}>{reviewForm.status.replace('_', ' ')}</strong>
                </p>
                {currentSub.content && (
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', maxHeight: '120px', overflowY: 'auto', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
                    {currentSub.content}
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Marks</label>
                  <input type="number" className="input-field" placeholder="Enter marks" value={reviewForm.marks}
                    onChange={e => setReviewForm(p => ({ ...p, marks: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Remarks (Required) *</label>
                  <textarea className="textarea-field" placeholder="Your remarks..." value={reviewForm.remarks}
                    onChange={e => setReviewForm(p => ({ ...p, remarks: e.target.value }))} required style={{ minHeight: '80px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
                  <motion.button className="btn-primary" onClick={handleReview} whileTap={{ scale: 0.96 }}>Submit Review</motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AssignmentReview;