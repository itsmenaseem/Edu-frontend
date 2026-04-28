import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiSend, FiUsers, FiBook, FiFileText, FiX,
  FiMenu, FiEye
} from 'react-icons/fi';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Layout/Navbar';
import Sidebar from '../Layout/Sidebar';
import SendNotification from '../Notification/SendNotification';
import NotificationHistory from '../Notification/NotificationHistory';
import AnalyticsPanel from '../Analytics/AnalyticsPanel';
import DetectionResults from '../Detection/DetectionResults'
import ChatList from '../Chat/ChatList';
import CourseStudentsModal from '../Course/CourseStudentsModal';
import Loader from '../Common/Loader';
import { format } from 'date-fns';
import '../Common/Common.css';
import './Dashboard.css';

const TeacherDashboard = () => {
  useAuth();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [reportSubmission, setReportSubmission] = useState(null);
  const [showCourseStudents, setShowCourseStudents] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Forms
  const [courseForm, setCourseForm] = useState({ name: '', code: '', description: '', section: 'A', color: '#a855f7' });
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', courseId: '', startDate: '', endDate: '', totalMarks: 100 });
  const [reviewForm, setReviewForm] = useState({ status: '', remarks: '', marks: '' });

  const loadDashboardData = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [studentsRes, coursesRes, analyticsRes] = await Promise.all([
        api.get('/enrollment/students'),
        api.get('/courses/teacher'),
        api.get('/submissions/analytics')
      ]);
      setStudents(studentsRes.data.students);
      setCourses(coursesRes.data.courses);
      setAnalytics(analyticsRes.data.analytics);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboardData(true);

    const handleEnrollmentUpdate = () => {
      loadDashboardData(false);
    };

    window.addEventListener('enrollment-updated', handleEnrollmentUpdate);
    return () => window.removeEventListener('enrollment-updated', handleEnrollmentUpdate);
  }, []);

  // Fetch student submissions
  useEffect(() => {
    if (selectedStudent) {
      const fetchSubmissions = async () => {
        setSubsLoading(true);
        try {
          const res = await api.get(`/submissions/student-all/${selectedStudent._id}`);
          setStudentSubmissions(res.data.submissions);
        } catch (err) {
          toast.error('Failed to load submissions');
        } finally {
          setSubsLoading(false);
        }
      };
      fetchSubmissions();
      setActiveTab('student');
    }
  }, [selectedStudent]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/courses', courseForm);
      setCourses(prev => [...prev, res.data.course]);
      setCourseForm({ name: '', code: '', description: '', section: 'A', color: '#a855f7' });
      setShowCreateCourse(false);
      toast.success('Course created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create course');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/assignments', assignmentForm);
      setAssignmentForm({ title: '', description: '', courseId: '', startDate: '', endDate: '', totalMarks: 100 });
      setShowCreateAssignment(false);
      toast.success('Assignment created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleReview = async () => {
    if (!reviewForm.remarks.trim()) {
      toast.warning('Remarks are mandatory!');
      return;
    }
    try {
      const res = await api.put(`/submissions/${currentSubmission._id}/review`, reviewForm);
      setStudentSubmissions(prev => prev.map(s => s._id === currentSubmission._id ? res.data.submission : s));
      setShowReviewModal(false);
      setCurrentSubmission(null);
      setReviewForm({ status: '', remarks: '', marks: '' });
      toast.success('Submission reviewed!');
    } catch (err) {
      toast.error('Review failed');
    }
  };

  const openReview = (submission, status) => {
    setCurrentSubmission(submission);
    setReviewForm({ status, remarks: '', marks: '' });
    setShowReviewModal(true);
  };

  const openFullReport = (submission) => {
    setReportSubmission(submission);
    setShowReportModal(true);
  };

  const handleDownloadSubmission = (sub) => {
    if (!sub?.filePath) {
      toast.info('No file was uploaded for this submission.');
      return;
    }
    window.open(sub.filePath, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (<><Navbar /><div className="main-content with-sidebar"><Loader text="Loading dashboard..." /></div></>);
  }

  return (
    <div className="dashboard">
      <Navbar />
      <Sidebar
        students={students}
        selectedStudent={selectedStudent}
        onSelectStudent={setSelectedStudent}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar toggle */}
      <motion.button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        whileTap={{ scale: 0.9 }}
      >
        <FiMenu />
      </motion.button>

      <div className="main-content with-sidebar">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="page-header">
            <h1>Teacher Dashboard</h1>
            <p>Manage courses, assignments, and student submissions</p>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {['overview', 'student', 'analytics', 'notifications', 'chat'].map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'student' && 'Student View'}
                {tab === 'analytics' && '📊 Analytics'}
                {tab === 'notifications' && '🔔 Notifications'}
                {tab === 'chat' && '💬 Messages'}
              </button>
            ))}
          </div>

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Stats */}
              <div className="stats-row">
                {[
                  { icon: <FiBook />, value: courses.length, label: 'Courses', bg: 'rgba(168,85,247,0.16)', color: '#c084fc' },
                  { icon: <FiUsers />, value: students.length, label: 'Students', bg: 'rgba(236,72,153,0.14)', color: '#f472b6' },
                  { icon: <FiFileText />, value: analytics?.totalSubmissions || 0, label: 'Submissions', bg: 'rgba(244,114,182,0.14)', color: '#fb7185' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    className="stat-card"
                    whileHover={{ y: -3 }}
                  >
                    <div className="stat-card-icon" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
                    <div className="stat-card-value" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="stat-card-label">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <motion.button className="btn-primary" onClick={() => setShowCreateCourse(!showCreateCourse)} whileTap={{ scale: 0.96 }}>
                  <FiPlus /> Create Course
                </motion.button>
                <motion.button className="btn-primary" onClick={() => setShowCreateAssignment(!showCreateAssignment)} whileTap={{ scale: 0.96 }}>
                  <FiFileText /> Create Assignment
                </motion.button>
                <motion.button className="btn-secondary" onClick={() => setActiveTab('notifications')} whileTap={{ scale: 0.96 }}>
                  <FiSend /> Send Notification
                </motion.button>
              </div>

              {/* Create Course Panel */}
              <AnimatePresence>
                {showCreateCourse && (
                  <motion.div
                    className="create-panel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <h3><FiPlus /> New Course</h3>
                    <form className="create-form" onSubmit={handleCreateCourse}>
                      <div className="create-form-row">
                        <div className="form-group">
                          <label>Course Name</label>
                          <input className="input-field" placeholder="Data Structures" value={courseForm.name}
                            onChange={e => setCourseForm(p => ({ ...p, name: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                          <label>Course Code</label>
                          <input className="input-field" placeholder="CS201" value={courseForm.code}
                            onChange={e => setCourseForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea className="textarea-field" placeholder="Course description..." value={courseForm.description}
                          onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div className="create-form-row">
                        <div className="form-group">
                          <label>Section</label>
                          <input className="input-field" placeholder="A" value={courseForm.section}
                            onChange={e => setCourseForm(p => ({ ...p, section: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label>Color</label>
                          <input type="color" value={courseForm.color}
                            style={{ width: '100%', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                            onChange={e => setCourseForm(p => ({ ...p, color: e.target.value }))} />
                        </div>
                      </div>
                      <div className="create-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setShowCreateCourse(false)}>Cancel</button>
                        <button type="submit" className="btn-primary">Create Course</button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create Assignment Panel */}
              <AnimatePresence>
                {showCreateAssignment && (
                  <motion.div
                    className="create-panel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <h3><FiFileText /> New Assignment</h3>
                    <form className="create-form" onSubmit={handleCreateAssignment}>
                      <div className="form-group">
                        <label>Course</label>
                        <select className="input-field" value={assignmentForm.courseId}
                          onChange={e => setAssignmentForm(p => ({ ...p, courseId: e.target.value }))} required>
                          <option value="">Select course</option>
                          {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Title</label>
                        <input className="input-field" placeholder="Assignment title" value={assignmentForm.title}
                          onChange={e => setAssignmentForm(p => ({ ...p, title: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea className="textarea-field" placeholder="Instructions..." value={assignmentForm.description}
                          onChange={e => setAssignmentForm(p => ({ ...p, description: e.target.value }))} required />
                      </div>
                      <div className="create-form-row">
                        <div className="form-group">
                          <label>Start Date</label>
                          <input type="datetime-local" className="input-field" value={assignmentForm.startDate}
                            onChange={e => setAssignmentForm(p => ({ ...p, startDate: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                          <label>End Date</label>
                          <input type="datetime-local" className="input-field" value={assignmentForm.endDate}
                            onChange={e => setAssignmentForm(p => ({ ...p, endDate: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Total Marks</label>
                        <input type="number" className="input-field" value={assignmentForm.totalMarks}
                          onChange={e => setAssignmentForm(p => ({ ...p, totalMarks: e.target.value }))} />
                      </div>
                      <div className="create-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setShowCreateAssignment(false)}>Cancel</button>
                        <button type="submit" className="btn-primary">Create Assignment</button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Courses Grid - CLICKABLE */}
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', marginTop: '8px', color: 'var(--text-heading)' }}>
                Your Courses
              </h3>
              {courses.length === 0 ? (
                <div className="empty-state">
                  <h3>No courses created</h3>
                  <p>Create your first course to get started</p>
                </div>
              ) : (
                <div className="course-grid">
                  {courses.map((course, i) => (
                    <motion.div
                      key={course._id}
                      className="glass-card"
                      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => setShowCourseStudents(course)}
                    >
                      <div style={{ height: '6px', background: course.color || 'var(--accent-1)' }} />
                      <div style={{ padding: '20px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '3px' }}>{course.name}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{course.code} · Section {course.section}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                          {course.description || 'No description'}
                        </p>
                        <div style={{
                          marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '8px 12px', background: 'rgba(168,85,247,0.08)', borderRadius: '8px',
                          fontSize: '12px', color: '#d8b4fe', fontWeight: 600
                        }}>
                          <FiUsers size={14} />
                          {course.enrolledStudents || 0} student(s) enrolled
                          <FiEye size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ STUDENT VIEW TAB ═══ */}
          {activeTab === 'student' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!selectedStudent ? (
                <div className="empty-state">
                  <FiUsers size={56} />
                  <h3>Select a Student</h3>
                  <p>Click on a student from the sidebar to view their submissions</p>
                </div>
              ) : (
                <div className="student-panel">
                  <div className="student-panel-header">
                    <h2>{selectedStudent.name}'s Submissions</h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedStudent.email}</span>
                  </div>

                  {subsLoading ? (
                    <Loader text="Loading submissions..." />
                  ) : studentSubmissions.length === 0 ? (
                    <div className="empty-state">
                      <h3>No submissions yet</h3>
                      <p>This student hasn't submitted any assignments</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="submissions-table">
                        <thead>
                          <tr>
                            <th>Assignment</th>
                            <th>Course</th>
                            <th>Content</th>
                            <th>View Content</th>
                            <th>Status</th>
                            <th>Report</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentSubmissions.map((sub, i) => (
                            <motion.tr
                              key={sub._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                            >
                              <td style={{ fontWeight: 600 }}>
                                <button
                                  type="button"
                                  className="report-project-btn"
                                  onClick={() => openFullReport(sub)}
                                  title="Open full AI and plagiarism report"
                                >
                                  {sub.assignment?.title || 'N/A'}
                                </button>
                              </td>
                              <td>{sub.assignment?.course?.code || 'N/A'}</td>
                              <td>
                                {/* Always show content preview even after action */}
                                {sub.content ? (
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '150px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {sub.content.substring(0, 50)}...
                                  </span>
                                ) : sub.fileName ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--accent-1)' }}>📎 {sub.fileName}</span>
                                  </div>
                                ) : '—'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {sub.filePath ? (
                                  <motion.button
                                    type="button"
                                    className="action-btn pending-btn"
                                    onClick={(e) => { e.stopPropagation(); handleDownloadSubmission(sub); }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{ textTransform: 'none', letterSpacing: 0, padding: '5px 10px' }}
                                  >
                                    Download
                                  </motion.button>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                              <td>
                                <span className={`status-badge status-${sub.status}`}>
                                  {sub.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td>
                                <motion.button
                                  type="button"
                                  className="action-btn improve"
                                  onClick={() => openFullReport(sub)}
                                  whileTap={{ scale: 0.9 }}
                                  style={{ textTransform: 'none', letterSpacing: 0, padding: '5px 10px' }}
                                >
                                  Open Report
                                </motion.button>
                              </td>
                              <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {sub.submittedAt ? format(new Date(sub.submittedAt), 'MMM dd, HH:mm') : '—'}
                              </td>
                              <td>
                                <div className="action-btns">
                                  <motion.button className="action-btn approve" onClick={() => openReview(sub, 'approved')} whileTap={{ scale: 0.9 }}>Approve</motion.button>
                                  <motion.button className="action-btn reject" onClick={() => openReview(sub, 'rejected')} whileTap={{ scale: 0.9 }}>Reject</motion.button>
                                  <motion.button className="action-btn improve" onClick={() => openReview(sub, 'need_improvement')} whileTap={{ scale: 0.9 }}>Improve</motion.button>
                                  <motion.button className="action-btn pending-btn" onClick={() => openReview(sub, 'pending')} whileTap={{ scale: 0.9 }}>Pending</motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Show remarks for submissions that have them */}
                  {studentSubmissions.filter(s => s.remarks).length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px' }}>
                        📝 Previous Remarks
                      </h4>
                      {studentSubmissions.filter(s => s.remarks).map(sub => (
                        <div key={sub._id + '-remark'} style={{
                          padding: '12px 16px', marginBottom: '8px',
                          background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                          borderLeft: `3px solid ${sub.status === 'approved' ? 'var(--success)' : sub.status === 'rejected' ? 'var(--danger)' : 'var(--accent-1)'}`,
                          fontSize: '12px'
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-heading)' }}>
                            {sub.assignment?.title}
                            <span className={`status-badge status-${sub.status}`} style={{ marginLeft: '10px', fontSize: '9px', padding: '2px 8px' }}>
                              {sub.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{sub.remarks}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ ANALYTICS TAB ═══ */}
          {activeTab === 'analytics' && analytics && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AnalyticsPanel analytics={analytics} role="teacher" />
            </motion.div>
          )}

          {/* ═══ NOTIFICATIONS TAB ═══ */}
          {activeTab === 'chat' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ChatList />
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SendNotification courses={courses} students={students} />
              <NotificationHistory />
            </motion.div>
          )}
        </motion.div>

        {/* ═══ REVIEW MODAL ═══ */}
        <AnimatePresence>
          {showReviewModal && currentSubmission && (
            <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
              <motion.div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
              >
                <div className="modal-header">
                  <h2>Review Submission</h2>
                  <button className="modal-close" onClick={() => setShowReviewModal(false)}><FiX /></button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong>Assignment:</strong> {currentSubmission.assignment?.title}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <strong>Student:</strong> {currentSubmission.student?.name || selectedStudent?.name}
                  </p>

                  {/* Always show submission content */}
                  {currentSubmission.content && (
                    <div style={{
                      marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px', maxHeight: '140px', overflowY: 'auto',
                      fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6
                    }}>
                      {currentSubmission.content}
                    </div>
                  )}

                  {currentSubmission.fileName && (
                    <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      📎 {currentSubmission.fileName}
                    </p>
                  )}

                  {/* Detection scores */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {currentSubmission.aiDetection?.score != null && (
                      <div style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                        background: currentSubmission.aiDetection.score > 50 ? 'rgba(251,113,133,0.12)' : 'rgba(168,85,247,0.12)',
                        color: currentSubmission.aiDetection.score > 50 ? '#fb7185' : '#c084fc',
                        border: `1px solid ${currentSubmission.aiDetection.score > 50 ? 'rgba(251,113,133,0.22)' : 'rgba(168,85,247,0.22)'}`
                      }}>
                        🤖 AI: {currentSubmission.aiDetection.score}%
                      </div>
                    )}
                    {currentSubmission.plagiarism?.percentage != null && (
                      <div style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                        background: currentSubmission.plagiarism.percentage > 30 ? 'rgba(251,113,133,0.12)' : 'rgba(236,72,153,0.12)',
                        color: currentSubmission.plagiarism.percentage > 30 ? '#fb7185' : '#ec4899',
                        border: `1px solid ${currentSubmission.plagiarism.percentage > 30 ? 'rgba(251,113,133,0.22)' : 'rgba(236,72,153,0.22)'}`
                      }}>
                        📋 Plagiarism: {currentSubmission.plagiarism.percentage}%
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Status: <span style={{ textTransform: 'capitalize', color: 'var(--accent-1)' }}>
                      {reviewForm.status.replace('_', ' ')}
                    </span>
                  </label>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Marks</label>
                  <input type="number" className="input-field" placeholder="Enter marks" value={reviewForm.marks}
                    onChange={e => setReviewForm(p => ({ ...p, marks: e.target.value }))} />
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label>Remarks (Required) *</label>
                  <textarea className="textarea-field" placeholder="Enter your remarks..."
                    value={reviewForm.remarks}
                    onChange={e => setReviewForm(p => ({ ...p, remarks: e.target.value }))}
                    required style={{ minHeight: '90px' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
                  <motion.button className="btn-primary" onClick={handleReview} whileTap={{ scale: 0.96 }}>
                    Submit Review
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ═══ FULL REPORT MODAL ═══ */}
        <AnimatePresence>
          {showReportModal && reportSubmission && (
            <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
              <motion.div
                className="modal-content report-modal-content"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
              >
                <div className="modal-header">
                  <h2>Full Detection Report</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowReportModal(false);
                      setReportSubmission(null);
                    }}
                  >
                    <FiX />
                  </button>
                </div>

                <div className="report-modal-meta">
                  <div>
                    <label>Assignment</label>
                    <p>{reportSubmission.assignment?.title || 'N/A'}</p>
                  </div>
                  <div>
                    <label>Student</label>
                    <p>{reportSubmission.student?.name || selectedStudent?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label>Status</label>
                    <p style={{ textTransform: 'capitalize' }}>{reportSubmission.status?.replace('_', ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <label>Submitted</label>
                    <p>{reportSubmission.submittedAt ? format(new Date(reportSubmission.submittedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
                  </div>
                </div>

                {reportSubmission.filePath && (
                  <div style={{ marginTop: '12px', marginBottom: '4px' }}>
                    <motion.button
                      type="button"
                      className="action-btn pending-btn"
                      onClick={() => handleDownloadSubmission(reportSubmission)}
                      whileTap={{ scale: 0.9 }}
                      style={{ textTransform: 'none', letterSpacing: 0, padding: '6px 12px' }}
                    >
                      Download Attached File
                    </motion.button>
                  </div>
                )}

                <DetectionResults submission={reportSubmission} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Course Students Modal */}
        <AnimatePresence>
          {showCourseStudents && (
            <CourseStudentsModal
              course={showCourseStudents}
              onClose={() => setShowCourseStudents(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TeacherDashboard;


